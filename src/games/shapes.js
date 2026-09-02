/* Shape sorter.
 *
 * Three holes, three shapes, drag each into its own. A shape in the wrong
 * hole springs back with a soft sound and nothing else — the hole itself is
 * the teacher, because it is the same shape and a child can see that. */

import { el, shuffle, pick, sparkleFrom, draggable, centreOf, wobble } from '../ui.js';
import { say, hush, sfx } from '../audio.js';
import { gameShell, pipRow } from '../shell.js';

const SHAPES = [
  { id: 'circle',   say: 'Circle',   color: '#FF6B6B' },
  { id: 'square',   say: 'Square',   color: '#4FB8F0' },
  { id: 'triangle', say: 'Triangle', color: '#5FC97C' },
  { id: 'star',     say: 'Star',     color: '#FFD23F' },
  { id: 'diamond',  say: 'Diamond',  color: '#A98BEA' },
  { id: 'hexagon',  say: 'Hexagon',  color: '#FF9F45' },
];

const ROUNDS = 4;
const PER_ROUND = 3;

export function shapesScene(go) {
  let round = 0;
  let done = 0;
  let holes = [];

  const board = el('div', { class: 'shapes-board' });
  const tray = el('div', { class: 'shapes-tray' });
  const stage = el('div', { class: 'shapes-stage' }, board, tray);

  const pips = pipRow(ROUNDS);
  const { scene, body, celebrate } = gameShell(go, { middle: pips.row, onNew: startGame });
  body.append(stage);

  function startGame() {
    round = 0;
    pips.paint(0);
    startRound();
  }

  function startRound() {
    hush();
    done = 0;
    const chosen = shuffle(SHAPES).slice(0, PER_ROUND);

    board.replaceChildren();
    tray.replaceChildren();
    holes = chosen.map((s) => {
      const hole = el('div', { class: `hole shape-${s.id}` });
      hole.dataset.shape = s.id;
      board.append(hole);
      return hole;
    });

    for (const s of shuffle(chosen)) {
      const piece = el('div', { class: `shape-piece shape-${s.id}`, 'aria-label': s.say });
      piece.style.setProperty('--c', s.color);
      piece.dataset.shape = s.id;
      piece.dataset.say = s.say;
      draggable(piece, { onDrop: ({ x, y, node }) => drop(node, x, y) });
      tray.append(piece);
    }

    fit();
    setTimeout(() => say(round === 0 ? 'Put each shape in its hole!' : 'More shapes!'), 350);
  }

  function fit() {
    const size = Math.min(board.clientWidth / (PER_ROUND + 1), board.clientHeight * 0.8);
    if (size > 0) stage.style.setProperty('--shape', `${Math.floor(size)}px`);
  }

  function drop(piece, x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const hole of holes) {
      const c = centreOf(hole);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestDist) { bestDist = d; best = { hole, c }; }
    }
    if (!best || bestDist > best.c.w * 0.6) return false;
    if (best.hole.dataset.shape !== piece.dataset.shape || best.hole.dataset.filled) {
      sfx.nomatch();
      wobble(best.hole);
      return false;
    }

    best.hole.dataset.filled = '1';
    best.hole.append(piece);
    piece.style.transform = '';
    piece.dataset.locked = '1';
    piece.classList.add('placed');
    sfx.match();
    sparkleFrom(piece);
    say(`${piece.dataset.say}!`);
    done += 1;

    if (done === PER_ROUND) {
      round += 1;
      pips.paint(round);
      if (round >= ROUNDS) {
        setTimeout(() => celebrate({
          headline: 'All the shapes!',
          spoken: 'You sorted all the shapes! Hooray!',
          onAgain: startGame,
        }), 700);
      } else {
        setTimeout(startRound, 1100);
      }
    }
    return true;
  }

  const ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
  ro?.observe(board);
  scene.__layout = fit;
  scene.__cleanup = () => ro?.disconnect();

  startGame();
  return scene;
}
