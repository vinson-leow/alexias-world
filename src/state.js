/* Persistent settings. Deliberately tiny.
   Stars only ever go up — nothing in the app takes them away or compares them. */

import { MIN_CARDS, SIZES } from './cards.js';

const KEY = 'alexias-world/memory/v1';

/* Look-back: how long two turned cards stay face up before turning back. */
export const SPEEDS = {
  gentle: { label: 'Gentle',  lookBack: 3000 },
  normal: { label: 'Normal',  lookBack: 2000 },
  quick:  { label: 'Quick',   lookBack: 1000 },
};

const defaults = {
  cardCount: MIN_CARDS,   // 12 — the 4 x 3 board

  speed: 'normal',
  narration: true,
  volume: 1,
  altOutfits: false,
  puzzleSize: '2x2',      // columns x rows of the jigsaw
  traceCase: 'upper',     // 'upper' | 'lower' | 'both'
  traceLetter: 0,         // index into the alphabet, so she picks up where she left off
  numbersMax: 10,         // number tracing goes 1..10 or 1..20
  stars: 0,
  rounds: 0,
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    // Guard against a stale or hand-edited value producing an unbuildable board.
    // Anything not an offered size falls back to the smallest.
    if (!SIZES.some((o) => o.cards === s.cardCount)) s.cardCount = MIN_CARDS;
    if (!SPEEDS[s.speed]) s.speed = 'normal';
    // Earlier builds stored the puzzle as a single number (2 or 3).
    if (typeof s.puzzlePieces === 'number') { s.puzzleSize = `${s.puzzlePieces}x${s.puzzlePieces}`; delete s.puzzlePieces; }
    if (!/^\d+x\d+$/.test(s.puzzleSize || '')) s.puzzleSize = '2x2';
    return s;
  } catch {
    return { ...defaults };
  }
}

export const settings = load();

let timer = null;
export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode */ }
  }, 200);
}

export function lookBackMs() { return SPEEDS[settings.speed].lookBack; }

export function addStar(n = 1) { settings.stars += n; save(); return settings.stars; }

export function setCardCount(n) {
  if (SIZES.some((o) => o.cards === n)) { settings.cardCount = n; save(); }
  return settings.cardCount;
}
