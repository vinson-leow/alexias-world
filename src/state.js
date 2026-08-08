/* Persistent settings. Deliberately tiny.
   Stars only ever go up — nothing in the app takes them away or compares them. */

import { MIN_CARDS, MAX_CARDS } from './cards.js';

const KEY = 'alexias-world/memory/v1';

/* Look-back: how long two turned cards stay face up before turning back. */
export const SPEEDS = {
  gentle: { label: 'Gentle',  lookBack: 3000 },
  normal: { label: 'Normal',  lookBack: 2000 },
  quick:  { label: 'Quick',   lookBack: 1000 },
};

const defaults = {
  cardCount: MIN_CARDS,
  speed: 'normal',
  narration: true,
  volume: 1,
  altOutfits: false,
  stars: 0,
  rounds: 0,
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    // Guard against a hand-edited or stale value producing an unbuildable board.
    s.cardCount = Math.min(MAX_CARDS, Math.max(MIN_CARDS, s.cardCount - (s.cardCount % 2)));
    if (!SPEEDS[s.speed]) s.speed = 'normal';
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
  settings.cardCount = Math.min(MAX_CARDS, Math.max(MIN_CARDS, n - (n % 2)));
  save();
  return settings.cardCount;
}
