/* Jigsaw.
 *
 * A card picture is cut into a grid and the pieces go back into a frame. The
 * frame shows a faint ghost of the finished picture: for a two-year-old the
 * puzzle is "put the piece on its shadow", which is exactly the right size of
 * problem. A piece dropped in the wrong slot springs back — nothing is lost,
 * nothing is said, she just tries somewhere else.
 */

import { el, shuffle, pickFresh, sparkleFrom, draggable, centreOf, pick } from '../ui.js';
import { settings, save } from '../state.js';
import { say, hush, sfx } from '../audio.js';
import { gameShell } from '../shell.js';
import { choiceRow } from '../parentgate.js';
import { beginGame, action } from '../log.js';

const PRAISE = ['That is it!', 'Yes!', 'Good!', 'Well done!'];

/* Puzzle pictures are full-bleed scenes with all five characters, made so that
   every part of the frame carries detail. The card faces were tried first and
   failed here: on a 5x5 cut their cream backgrounds made many pieces blank
   and indistinguishable from each other. */
export const SCENES = [
  { art: '01-dubai-beach-club', say: 'the beach club' },
  { art: '02-dubai-marina',     say: 'the marina' },
  { art: '03-dubai-dunes',      say: 'the desert' },
  { art: '04-dubai-souk',       say: 'the market' },
];
export const SCENE_RATIO = 16 / 9;

export function sceneUrl(name) { return `assets/scenes/web/${name}.jpg`; }

/* Columns x rows. The picture is square, so anything off-square gives
   rectangular pieces, which is fine — real jigsaws are full of them. */
export const PUZZLE_SIZES = [
  { key: '2x2', cols: 2, rows: 2 },
  { key: '3x3', cols: 3, rows: 3 },
  { key: '4x4', cols: 4, rows: 4 },
  { key: '4x5', cols: 4, rows: 5 },
  { key: '5x5', cols: 5, rows: 5 },
];

function sizeFor(key) {
  return PUZZLE_SIZES.find((s) => s.key === key) || PUZZLE_SIZES[0];
}

export function puzzleScene(go) {
  let design = null;
  let cols = 2;
  let rows = 2;
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
      el('p', {}, 'How many pieces. Four is right for a two-year-old; move up once she is placing them without looking for help.'),
      choiceRow(
        PUZZLE_SIZES.map((s) => ({ label: `${s.cols * s.rows} pieces  ·  ${s.cols} x ${s.rows}`, key: s.key })),
        (o) => settings.puzzleSize === o.key,
        (o) => { settings.puzzleSize = o.key; save(); },
      ),
    ],
  });
  body.append(stage);

  function start() {
    hush();
    ({ cols, rows } = sizeFor(settings.puzzleSize));
    placed = 0;
    design = pickFresh(SCENES, design);
    const url = `url("${sceneUrl(design.art)}")`;
    title.textContent = `At ${design.say}`;
    new Image().src = sceneUrl(design.art);   // warm the cache for the pieces
    beginGame('puzzle', { pieces: cols * rows, grid: settings.puzzleSize, scene: design.art });

    frame.replaceChildren();
    tray.replaceChildren();
    frame.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    frame.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    slots = [];
    const pieces = [];
    for (let i = 0; i < cols * rows; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      // Percent positions walk 0 -> 100 across the grid: 0/100 for two
      // columns, 0/50/100 for three, and so on.
      const pos = `${cols > 1 ? (c / (cols - 1)) * 100 : 0}% ${rows > 1 ? (r / (rows - 1)) * 100 : 0}%`;
      const size = `${cols * 100}% ${rows * 100}%`;

      const slot = el('div', { class: 'puzzle-slot' });
      slot.style.backgroundImage = url;
      slot.style.backgroundSize = size;
      slot.style.backgroundPosition = pos;
      slot.dataset.index = String(i);
      frame.append(slot);
      slots.push(slot);

      const piece = el('div', { class: 'puzzle-piece', 'aria-label': 'Puzzle piece' });
      piece.style.backgroundImage = url;
      piece.style.backgroundSize = size;
      piece.style.backgroundPosition = pos;
      piece.dataset.index = String(i);
      draggable(piece, { onDrop: ({ x, y, node }) => drop(node, x, y) });
      pieces.push(piece);
    }
    for (const p of shuffle(pieces)) tray.append(p);

    fit();
    setTimeout(() => say(`Everyone is at ${design.say}! Put the pieces on the picture!`), 350);
  }

  /* The frame takes what the screen allows and the tray gets the rest. Tray
     pieces shrink to fit beneath the frame — a full-size tray would push the
     frame up under the top bar on a portrait tablet — and grow to slot size
     the moment they are placed, which reads as the piece "clicking in". */
  function fit() {
    const cs = getComputedStyle(stage);
    const W = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const H = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (!(W > 0) || !(H > 0)) return;
    const gap = 12;

    // The frame is 16:9. Its width is capped by the stage width and its height
    // by a share of the stage height, whichever bites first.
    const F = Math.floor(Math.min(W * 0.96, H * 0.55 * SCENE_RATIO, 960));
    const FH = Math.floor(F / SCENE_RATIO);
    frame.style.width = `${F}px`;
    const slotW = F / cols;
    const slotH = FH / rows;

    // Scale the tray pieces down until every one fits under the frame, trying
    // one to five rows and keeping the arrangement that leaves them largest.
    const trayH = H - FH - gap * 2;
    const count = cols * rows;
    let best = { scale: 0, perRow: count };
    for (let r = 1; r <= 5; r++) {
      const perRow = Math.ceil(count / r);
      const scale = Math.min(
        (W - gap * (perRow - 1)) / (perRow * slotW),
        (trayH - gap * (r - 1)) / (r * slotH),
        1,
      );
      if (scale > best.scale) best = { scale, perRow };
    }
    const pw = Math.floor(slotW * best.scale);
    const ph = Math.floor(slotH * best.scale);
    stage.style.setProperty('--pw', `${pw}px`);
    stage.style.setProperty('--ph', `${ph}px`);
    // Pin the tray to the arrangement chosen, so it wraps as planned rather
    // than however many happen to squeeze into the full width.
    tray.style.width = `${best.perRow * pw + gap * (best.perRow - 1)}px`;
  }

  function drop(piece, x, y) {
    let best = null;
    let bestDist = Infinity;
    for (const slot of slots) {
      const c = centreOf(slot);
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestDist) { bestDist = d; best = { slot, c }; }
    }
    // Generous: within about half a slot of the right one counts.
    if (!best || bestDist > Math.min(best.c.w, best.c.h) * 0.55) return false;
    if (best.slot.dataset.index !== piece.dataset.index || best.slot.dataset.filled) {
      action('drop', { correct: false, piece: Number(piece.dataset.index) });
      sfx.nomatch();
      return false;
    }

    action('drop', { correct: true, piece: Number(piece.dataset.index) });
    best.slot.dataset.filled = '1';
    best.slot.append(piece);
    piece.style.transform = '';
    piece.dataset.locked = '1';
    piece.classList.add('placed');
    sfx.match();
    sparkleFrom(piece);
    placed += 1;

    if (placed === cols * rows) {
      setTimeout(() => celebrate({
        headline: 'You made the picture!',
        spoken: `You made the picture! Everyone at ${design.say}!`,
        stats: { pieces: cols * rows, scene: design.art },
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
