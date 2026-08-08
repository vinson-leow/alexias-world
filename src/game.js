/* Memory match.
 *
 * The rules that shape every decision here:
 *   - There is no timer, no score, no move counter and no way to lose.
 *   - A wrong pair is not a mistake; the cards simply turn back over.
 *   - Every card says its own name aloud, because the player cannot read.
 *   - Cards never move. A child who remembers "Bunny was in the corner" is right.
 */

import { el, shuffle, pick, sparkleFrom, fitGrid } from './ui.js';
import { pickDesigns, artUrl, preload, sizeFor, LOGO_URL } from './cards.js';
import { settings, lookBackMs, addStar, save } from './state.js';
import { say, hush, sfx } from './audio.js';
import { openParentGate } from './parentgate.js';

const PRAISE = ['Yes! You found them!', 'A pair!', 'Well done!', 'You did it!', 'That is a match!'];
const NUDGE  = ['Try again!', 'Have another look.', 'Keep looking!'];

const FLIP_MS = 300;      // matches the card's CSS transition
const VANISH_MS = 600;    // matched pair fades out and is gone

export function startGame(root) {
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

  function stopClock() {
    clearInterval(clockTimer);
    clockTimer = null;
  }

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
  const foundRow = el('div', { class: 'found-row', 'aria-label': 'Pairs found' });
  const moveCount = el('span', { class: 'move-count' }, '0');
  const timeCount = el('span', { class: 'move-count' }, '0:00');

  const scene = el('div', { class: 'scene' },
    el('div', { class: 'topbar' },
      el('button', {
        class: 'chip', 'aria-label': 'Grown-ups',
        onclick: () => { sfx.tap(); openParentGate(scene, { onChange: deal }); },
      }, '⚙️'),
      foundRow,
      el('button', {
        class: 'chip', 'aria-label': 'New game',
        onclick: () => { sfx.tap(); say('New game!'); deal(); },
      }, '🔄'),
    ),
    board,
    // A tally, not a score: nothing counts down, nothing runs out, and no
    // number here can end the game.
    el('div', { class: 'bottombar' },
      el('span', { class: 'move-label' }, 'Turns'),
      moveCount,
      el('span', { class: 'move-label' }, 'Time'),
      timeCount,
    ),
  );

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

    const deck = shuffle([...designs, ...designs]);
    board.replaceChildren();
    cards = deck.map((design, i) => {
      const face = el('div', { class: 'face front' });
      face.style.backgroundImage = `url("${artUrl(design.art)}")`;
      const node = el('button', {
        class: 'card',
        'aria-label': 'Hidden card',
        onclick: () => tap(i),
      },
        el('div', { class: 'face back' }, el('span', { class: 'back-mark' }, '💛')),
        face,
      );
      return { design, node, faceUp: false, matched: false };
    });
    for (const c of cards) board.append(c.node);

    paintFoundRow();
    layout();
    setTimeout(() => say(`Find the pairs! Tap a card.`), 350);
  }

  function paintFoundRow() {
    foundRow.replaceChildren(
      ...Array.from({ length: pairsTotal }, (_, i) =>
        el('span', { class: `pip${i < found ? ' lit' : ''}` }, i < found ? '⭐' : '·')),
    );
  }

  /* ---------- layout ---------- */

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
    // jabbing the screen, so the board never refuses a tap: the old pair drops
    // away and this tap begins the next turn.
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
      // A match resolves faster than a miss — there is nothing to memorise, so
      // get to the celebration. The floor keeps the pair on screen long enough
      // to see that it matched even at the quickest speed.
      const pause = Math.max(650, Math.min(1200, lookBackMs() * 0.5));
      schedule(() => onMatch(first, second), pause);
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
    paintFoundRow();

    // Matched pairs vanish, leaving their gap. The grid never reflows, so the
    // cards a child has already learned the position of stay put.
    for (const c of [a, b]) {
      c.node.classList.add('matched');
      setTimeout(() => { c.node.classList.add('gone'); }, VANISH_MS);
    }

    if (found === pairsTotal) setTimeout(win, VANISH_MS + 300);
  }

  function onMiss(a, b) {
    sfx.nomatch();
    turnDown(a);
    turnDown(b);
    // Only nudge occasionally — a voice on every single miss becomes nagging.
    nudgeCount += 1;
    if (nudgeCount % 3 === 1) say(pick(NUDGE));
  }

  function win() {
    stopClock();
    const took = startedAt === null ? 0 : performance.now() - startedAt;
    sfx.win();
    settings.rounds += 1;
    const stars = addStar();
    save();
    say('You found them all! Hooray!');

    const again = el('div', { class: 'win' },
      el('div', { class: 'win-glyph' }, '🎉'),
      el('div', { class: 'win-word' }, 'You found them all!'),
      el('div', { class: 'win-stars' }, '⭐', el('span', {}, String(stars))),
      el('div', { class: 'win-turns' }, `${moves} turns  ·  ${clockText(took)}`),
      el('button', {
        class: 'big-button',
        'aria-label': 'Play again',
        onclick: () => { sfx.tap(); say('Again!'); again.remove(); deal(); },
      }, el('span', { class: 'glyph' }, '🔁'), el('span', { class: 'word' }, 'Again')),
    );
    scene.append(again);
  }

  /* ---------- go ---------- */

  root.replaceChildren(scene);
  deal();

  /* Re-fit whenever the board's box changes — first paint, rotation, the iPad
     keyboard, anything. A plain resize listener misses the first pass, when the
     board has been inserted but has not been given its height yet. Setting the
     column template cannot change the board's own size, so this cannot loop. */
  if (window.ResizeObserver) {
    new ResizeObserver(layout).observe(board);
  } else {
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 120);
    });
  }

  // Coming back to the app settles any pair left hanging while it was away.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) runPending();
  });

  // Backstop for anything the above misses: a pair can never stay owed for
  // longer than its own look-back plus a margin. Without this the board can
  // only be freed by an adult finding the reset button.
  setInterval(() => {
    if (pending && performance.now() - lockedAt > lookBackMs() + 2000) runPending();
  }, 1000);
  // The board has no height until it is in the document.
  requestAnimationFrame(layout);

  return { deal };
}
