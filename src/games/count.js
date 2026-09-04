/* Counting.
 *
 * A few characters are scattered on the screen. The child taps each one and
 * hears the next number; when the last is tapped the total is said and shown
 * big. There is no wrong tap: an already-counted character just bounces and
 * repeats its number, which is how a two-year-old checks her work anyway.
 */

import { el, shuffle, pickFresh, sparkleFrom, numberWord } from '../ui.js';
import { characters, artUrl } from '../cards.js';
import { say, hush, sfx } from '../audio.js';
import { gameShell, pipRow } from '../shell.js';
import { beginGame, action } from '../log.js';

const ROUNDS = 5;
const SEQUENCE = [1, 2, 3, 2, 4, 3, 5];   // eases in, then settles around the top

// Nine cells to scatter into, so up to five characters never overlap.
const CELLS = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) CELLS.push({ x: 17 + c * 33, y: 17 + r * 33 });

export function countScene(go) {
  let round = 0;
  let total = 0;
  let counted = 0;
  let who = null;
  let sprites = [];

  const area = el('div', { class: 'count-area' });
  const numeral = el('div', { class: 'count-numeral', hidden: true });
  const next = el('button', {
    class: 'big-button small', hidden: true, 'aria-label': 'Next',
    onclick: () => { sfx.tap(); startRound(); },
  }, el('span', { class: 'glyph' }, '👉'), el('span', { class: 'word' }, 'Next'));

  const pips = pipRow(ROUNDS);
  const { scene, body, footer, celebrate } = gameShell(go, { middle: pips.row, onNew: startGame });
  body.append(area, numeral);
  footer.append(next);

  function startGame() {
    round = 0;
    pips.paint(0);
    beginGame('count', { rounds: ROUNDS });
    startRound();
  }

  function startRound() {
    hush();
    next.hidden = true;
    numeral.hidden = true;
    counted = 0;
    total = SEQUENCE[round] ?? 1 + Math.floor(Math.random() * 5);
    who = pickFresh(characters(), who);

    area.replaceChildren();
    sprites = shuffle(CELLS).slice(0, total).map((cell) => {
      const s = el('button', { class: 'count-sprite', 'aria-label': who.say });
      s.style.backgroundImage = `url("${artUrl(who.art)}")`;
      // A little jitter so it never looks like a grid.
      s.style.left = `${cell.x + (Math.random() - 0.5) * 8}%`;
      s.style.top = `${cell.y + (Math.random() - 0.5) * 8}%`;
      s.style.animationDelay = `${Math.random() * 2}s`;
      const badge = el('span', { class: 'count-badge' });
      s.append(badge);
      s.onclick = () => tap(s, badge);
      area.append(s);
      return s;
    });

    setTimeout(() => say(`How many ${who.say}s can you see? Tap them all!`), 350);
  }

  function tap(sprite, badge) {
    if (sprite.dataset.counted) {
      // Re-tapping is checking, not a mistake. Bounce and say it again.
      sprite.classList.remove('bounce'); void sprite.offsetWidth; sprite.classList.add('bounce');
      say(numberWord(Number(sprite.dataset.counted)));
      return;
    }
    counted += 1;
    sprite.dataset.counted = String(counted);
    sprite.classList.add('bounce', 'counted');
    badge.textContent = String(counted);
    sfx.pick();
    sparkleFrom(sprite);
    action('count_tap', { n: counted, total, character: who.id });   // not `who` — that field is the player

    if (counted < total) {
      say(numberWord(counted));
      return;
    }

    action('round_done', { n: total, total, correct: true });
    numeral.textContent = String(total);
    numeral.hidden = false;
    sfx.match();
    say(`${numberWord(total)}! ${numberWord(total)} ${who.say}${total === 1 ? '' : 's'}! Well done!`);

    round += 1;
    pips.paint(round);
    if (round >= ROUNDS) {
      setTimeout(() => celebrate({
        headline: 'You can count!',
        spoken: 'You can count! Hooray!',
        stats: { rounds: ROUNDS },
        onAgain: startGame,
      }), 1600);
    } else {
      setTimeout(() => { next.hidden = false; }, 900);
    }
  }

  startGame();
  return scene;
}
