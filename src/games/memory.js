/* Memory match.
 *
 * The rules that shape every decision here:
 *   - There is no score, no miss limit and no way to lose.
 *   - A wrong pair is not a mistake; the cards simply turn back over.
 *   - Every card says its own name aloud, because the player cannot read.
 *   - Cards never move. A child who remembers "Bunny was in the corner" is right.
 */

import { el, shuffle, pick, sparkleFrom, fitGrid } from '../ui.js';
import { pickDesigns, artUrl, preload, sizeFor, SIZES, LOGO_URL } from '../cards.js';
import { settings, lookBackMs, save, setCardCount, SPEEDS } from '../state.js';
import { say, hush, sfx } from '../audio.js';
import { gameShell, pipRow } from '../shell.js';
import { choiceRow } from '../parentgate.js';

const PRAISE = ['Yes! You found them!', 'A pair!', 'Well done!', 'You did it!', 'That is a match!'];
const NUDGE  = ['Try again!', 'Have another look.', 'Keep looking!'];

const VANISH_MS = 600;    // matched pair fades out and is gone

export function memoryScene(go) {
  let cards = [];          // { design, node, faceUp, matched }
  let firstPick = null;
  let found = 0;
  let moves = 0;
  let pairsTotal = 0;
  let resolveTimer = null;
  let pending = null;      // the resolution owed for the pair currently face up
  let lockedAt = 0;
  let nudgeCount = 0;
  let startedAt = null;    // the first card turned starts the clock, not the deal
  let clockTimer = null;
  let pips = pipRow(0);

  const clockText = (ms) => {
    const secs = Math.floor(ms / 1000);
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  };

  /* The clock starts on the first card turned rather than when the board is
     dealt, so time spent looking at the backs — or being handed the tablet —
     is not counted against anyone. */
  function startClock() {
    if (startedAt !== null) return;
    startedAt = performance.now();
    clockTimer = setInterval(() => {
      timeCount.textContent = clockText(performance.now() - startedAt);
    }, 250);
  }
  function stopClock() { clearInterval(clockTimer); clockTimer = null; }

  /* A turned pair always owes a resolution. Keeping it in `pending` — rather
     than only inside a setTimeout — means it can be forced through if the timer
     never fires. iOS throttles timers in backgrounded tabs, so without this a
     child who leaves the app mid-pair can come back to a board that ignores
     every tap, with no way for her to fix it. */
  function schedule(fn, ms) {
    clearTimeout(resolveTimer);
    pending = fn;
    lockedAt = performance.now();
    resolveTimer = setTimeout(runPending, ms);
  }
  function runPending() {
    if (!pending) return;
    clearTimeout(resolveTimer);
    const fn = pending;
    pending = null;
    fn();
  }

  const board = el('div', { class: 'board' });
  const middle = el('div', { class: 'found-wrap' });
  const moveCount = el('span', { class: 'move-count' }, '0');
  const timeCount = el('span', { class: 'move-count' }, '0:00');

  const { scene, body, footer, celebrate } = gameShell(go, {
    middle,
    onNew: deal,
    sections: settingsRows,
  });
  body.append(board);
  footer.append(
    el('span', { class: 'move-label' }, 'Turns'), moveCount,
    el('span', { class: 'move-label' }, 'Time'), timeCount,
  );

  /* ---------- grown-up rows ---------- */

  function settingsRows() {
    return [
      el('p', {}, 'Board size. Start small and move up when she finds it easy.'),
      choiceRow(
        SIZES.map((s) => ({ label: `${s.label}  ·  ${s.cards / 2} pairs`, cards: s.cards })),
        (o) => settings.cardCount === o.cards,
        (o) => setCardCount(o.cards),
      ),
      el('p', {}, 'How long a mismatched pair stays face up. Tapping another card turns them back straight away regardless.'),
      choiceRow(
        Object.entries(SPEEDS).map(([key, s]) => ({ label: `${s.label} · ${(s.lookBack / 1000).toFixed(1)}s`, key })),
        (o) => settings.speed === o.key,
        (o) => { settings.speed = o.key; save(); },
      ),
      choiceRow(
        [{ label: '👕 Everyday outfits', alt: false }, { label: '👕 Mix outfits up', alt: true }],
        (o) => settings.altOutfits === o.alt,
        (o) => { settings.altOutfits = o.alt; save(); },
      ),
    ];
  }

  /* ---------- dealing ---------- */

  function deal() {
    clearTimeout(resolveTimer);
    pending = null;
    hush();
    firstPick = null;
    found = 0;
    moves = 0;
    moveCount.textContent = '0';
    nudgeCount = 0;
    stopClock();
    startedAt = null;
    timeCount.textContent = '0:00';

    const designs = pickDesigns(settings.cardCount, settings.altOutfits);
    preload(designs);
    pairsTotal = designs.length;
    pips = pipRow(pairsTotal);
    middle.replaceChildren(pips.row);

    const deck = shuffle([...designs, ...designs]);
    board.replaceChildren();
    cards = deck.map((design, i) => {
      const face = el('div', { class: 'face front' });
      face.style.backgroundImage = `url("${artUrl(design.art)}")`;
      const back = el('div', { class: 'face back' });
      back.style.backgroundImage = `url("${LOGO_URL}")`;
      const node = el('button', { class: 'card', 'aria-label': 'Hidden card', onclick: () => tap(i) }, back, face);
      return { design, node, faceUp: false, matched: false };
    });
    for (const c of cards) board.append(c.node);

    layout();
    setTimeout(() => say('Find the pairs! Tap a card.'), 350);
  }

  function layout() {
    if (!cards.length) return;
    const gap = Math.max(8, Math.min(20, board.clientWidth * 0.015));
    const shape = sizeFor(cards.length);
    const { cols, size } = fitGrid(shape.cols, shape.rows, board.clientWidth, board.clientHeight, gap);
    board.style.gap = `${gap}px`;
    board.style.gridTemplateColumns = `repeat(${cols}, ${Math.floor(size)}px)`;
    board.style.setProperty('--card-size', `${Math.floor(size)}px`);
  }

  /* ---------- play ---------- */

  function tap(i) {
    const card = cards[i];
    if (card.faceUp || card.matched) return;

    // A pair already turned is settled immediately rather than blocking the
    // tap. Waiting out a timer is where a small child gives up and starts
    // jabbing the screen, so the board never refuses a tap.
    if (pending) runPending();

    startClock();
    turnUp(card);
    sfx.flip();
    say(card.design.say);

    if (!firstPick) { firstPick = card; return; }

    const second = card;
    const first = firstPick;
    firstPick = null;
    moves += 1;
    moveCount.textContent = String(moves);

    if (first.design.id === second.design.id) {
      // A match resolves faster than a miss — nothing to memorise, so get to
      // the celebration. The floor keeps the pair visible at the quickest speed.
      schedule(() => onMatch(first, second), Math.max(650, Math.min(1200, lookBackMs() * 0.5)));
    } else {
      schedule(() => onMiss(first, second), lookBackMs());
    }
  }

  function turnUp(card) {
    card.faceUp = true;
    card.node.classList.add('up');
    card.node.setAttribute('aria-label', card.design.say);
  }
  function turnDown(card) {
    card.faceUp = false;
    card.node.classList.remove('up');
    card.node.setAttribute('aria-label', 'Hidden card');
  }

  function onMatch(a, b) {
    a.matched = b.matched = true;
    found += 1;
    sfx.match();
    sparkleFrom(a.node);
    sparkleFrom(b.node);
    say(`${pick(PRAISE)} ${a.design.say}.`);
    pips.paint(found);
    for (const c of [a, b]) {
      c.node.classList.add('matched');
      setTimeout(() => c.node.classList.add('gone'), VANISH_MS);
    }
    if (found === pairsTotal) setTimeout(win, VANISH_MS + 300);
  }

  function onMiss(a, b) {
    sfx.nomatch();
    turnDown(a);
    turnDown(b);
    nudgeCount += 1;
    if (nudgeCount % 3 === 1) say(pick(NUDGE));   // a voice on every miss becomes nagging
  }

  function win() {
    stopClock();
    const took = startedAt === null ? 0 : performance.now() - startedAt;
    celebrate({
      headline: 'You found them all!',
      spoken: 'You found them all! Hooray!',
      detail: `${moves} turns  ·  ${clockText(took)}`,
      onAgain: deal,
    });
  }

  /* ---------- lifecycle ---------- */

  const ro = window.ResizeObserver ? new ResizeObserver(layout) : null;
  ro?.observe(board);
  const onVisible = () => { if (!document.hidden) runPending(); };
  document.addEventListener('visibilitychange', onVisible);
  // Backstop: a pair can never stay owed longer than its look-back plus a margin.
  const watchdog = setInterval(() => {
    if (pending && performance.now() - lockedAt > lookBackMs() + 2000) runPending();
  }, 1000);

  scene.__layout = layout;
  scene.__cleanup = () => {
    ro?.disconnect();
    document.removeEventListener('visibilitychange', onVisible);
    clearInterval(watchdog);
    clearTimeout(resolveTimer);
    stopClock();
  };

  deal();
  return scene;
}
