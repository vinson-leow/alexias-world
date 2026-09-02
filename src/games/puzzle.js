/* Jigsaw.
 *
 * A card picture is cut into a grid and the pieces go back into a frame. The
 * frame shows a faint ghost of the finished picture: for a two-year-old the
 * puzzle is "put the piece on its shadow", which is exactly the right size of
 * problem. A piece dropped in the wrong slot springs back — nothing is lost,
 * nothing is said, she just tries somewhere else.
 */

import { el, shuffle, pickFresh, sparkleFrom, draggable, centreOf, pick } from '../ui.js';
import { allDesigns, artUrl } from '../cards.js';
import { settings, save } from '../state.js';
import { say, hush, sfx } from '../audio.js';
import { gameShell } from '../shell.js';
import { choiceRow } from '../parentgate.js';

const PRAISE = ['That is it!', 'Yes!', 'Good!', 'Well done!'];

export function puzzleScene(go) {
  let design = null;
  let n = 2;
  let placed = 0;
  let slots = [];

  const frame = el('div', { class: 'puzzle-frame' });
  const tray = el('div', { class: 'puzzle-tray' });
  const stage = el('div', { class: 'puzzle-stage' }, frame, tray);
  const title = el('span', { class: 'game-title' }, 'Puzzle');

  const { scene, body, celebrate } = gameShell(go, {
    middle: title,
    onNew: () => start(),
    sections: () => [
      el('p', {}, 'How many pieces. Four is right for a two-year-old; nine once she is placing them without looking for help.'),
      choiceRow(
        [{ label: '4 pieces  ·  2 x 2', v: 2 }, { label: '9 pieces  ·  3 x 3', v: 3 }],
        (o) => settings.puzzlePieces === o.v,
        (o) => { settings.puzzlePieces = o.v; save(); },
      ),
    ],
  });
  body.append(stage);

  function start() {
    hush();
    n = settings.puzzlePieces;
    placed = 0;
    design = pickFresh(allDesigns(), design);
    const url = `url("${artUrl(design.art)}")`;
    title.textContent = design.say;

    frame.replaceChildren();
    tray.replaceChildren();
    frame.style.gridTemplateColumns = `repeat(${n}, 1fr)`;

    slots = [];
    const pieces = [];
    for (let i = 0; i < n * n; i++) {
      const col = i % n;
      const row = Math.floor(i / n);
      // Percent positions walk 0 -> 100 across the grid: 0/100 for 2x2, 0/50/100 for 3x3.
      const pos = `${(col / (n - 1)) * 100}% ${(row / (n - 1)) * 100}%`;

      const slot = el('div', { class: 'puzzle-slot' });
      slot.style.backgroundImage = url;
      slot.style.backgroundSize = `${n * 100}% ${n * 100}%`;
      slot.style.backgroundPosition = pos;
      slot.dataset.index = String(i);
      frame.append(slot);
      slots.push(slot);

      const piece = el('div', { class: 'puzzle-piece', 'aria-label': 'Puzzle piece' });
      piece.style.backgroundImage = url;
      piece.style.backgroundSize = `${n * 100}% ${n * 100}%`;
      piece.style.backgroundPosition = pos;
      piece.dataset.index = String(i);
      draggable(piece, { onDrop: ({ x, y, node }) => drop(node, x, y) });
      pieces.push(piece);
    }
    for (const p of shuffle(pieces)) tray.append(p);

    fit();
    setTimeout(() => say(`Let us make ${design.say}. Put the pieces on the picture!`), 350);
  }

  /* The frame takes what the screen allows and the tray gets the rest. Tray
     pieces shrink to fit beneath the frame — on a portrait tablet a full-size
     tray would push the frame up under the top bar — and grow to slot size the
     moment they are placed, which reads as the piece "clicking in". */
  function fit() {
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    if (!W || !H) return;
    const gap = 12;
    const F = Math.floor(Math.min(W * 0.9, H * 0.55, 560));
    frame.style.width = `${F}px`;

    const trayH = H - F - gap * 2;
    const count = n * n;
    let best = { size: 0, perRow: count };
    for (let rows = 1; rows <= 3; rows++) {
      const perRow = Math.ceil(count / rows);
      const size = Math.min((W - gap * (perRow - 1)) / perRow, (trayH - gap * (rows - 1)) / rows);
      if (size > best.size) best = { size, perRow };
    }
    const piece = Math.floor(Math.min(best.size, F / n));
    stage.style.setProperty('--piece', `${piece}px`);
    // Pin the tray to the arrangement chosen above, so it wraps as 2+2 rather
    // than however many happen to squeeze into the full width.
    tray.style.width = `${best.perRow * piece + gap * (best.perRow - 1)}px`;
  }

  function drop(piece, x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const slot of slots) {
      const c = centreOf(slot);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestDist) { bestDist = d; best = { slot, c }; }
    }
    // Generous: within about half a piece of the right slot counts.
    if (!best || bestDist > best.c.w * 0.55) return false;
    if (best.slot.dataset.index !== piece.dataset.index || best.slot.dataset.filled) {
      sfx.nomatch();
      return false;
    }

    best.slot.dataset.filled = '1';
    best.slot.append(piece);
    piece.style.transform = '';
    piece.dataset.locked = '1';
    piece.classList.add('placed');
    sfx.match();
    sparkleFrom(piece);
    placed += 1;

    if (placed === n * n) {
      setTimeout(() => celebrate({
        headline: 'You made the picture!',
        spoken: `You made the picture! ${design.say}!`,
        onAgain: start,
      }), 500);
    } else if (placed === 1 || Math.random() < 0.4) {
      say(pick(PRAISE));
    }
    return true;
  }

  const ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
  ro?.observe(stage);
  scene.__layout = fit;
  scene.__cleanup = () => ro?.disconnect();

  start();
  return scene;
}
