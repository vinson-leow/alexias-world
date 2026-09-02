/* Stroke data for tracing.
 *
 * Every glyph lives in a 100 x 120 box: cap height at y=10, x-height at 50,
 * baseline at 95, descenders to 115. A glyph is a list of strokes, drawn in
 * order; a stroke is a polyline of points, drawn from its first point to its
 * last. Curves are arcs sampled into points, so the tracer only ever deals
 * with polylines.
 *
 * Strokes follow the usual handwriting order and direction — down before
 * across, tops before tails — because the order is the point of tracing.
 */

const P = (...xy) => { const out = []; for (let i = 0; i < xy.length; i += 2) out.push({ x: xy[i], y: xy[i + 1] }); return out; };

/* Points along an ellipse from angle a0 to a1 (degrees, screen convention: 0
   is right, 90 is DOWN). a1 < a0 goes the other way round. */
function arc(cx, cy, rx, ry, a0, a1) {
  const out = [];
  const steps = Math.max(4, Math.round(Math.abs(a1 - a0) / 10));
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return out;
}

const UPPER = {
  A: [P(50, 10, 20, 95), P(50, 10, 80, 95), P(32, 62, 68, 62)],
  B: [P(25, 10, 25, 95), [...P(25, 10, 52, 10), ...arc(52, 31, 22, 21, -90, 90), ...P(25, 52)], [...P(25, 52, 54, 52), ...arc(54, 73.5, 24, 21.5, -90, 90), ...P(25, 95)]],
  C: [arc(50, 52.5, 30, 42, -45, -315)],
  D: [P(25, 10, 25, 95), [...P(25, 10, 42, 10), ...arc(42, 52.5, 36, 42.5, -90, 90), ...P(25, 95)]],
  E: [P(75, 10, 25, 10, 25, 95, 75, 95), P(25, 52, 65, 52)],
  F: [P(75, 10, 25, 10, 25, 95), P(25, 52, 65, 52)],
  G: [[...arc(50, 52.5, 30, 42, -45, -330), ...P(80, 60, 55, 60)]],
  H: [P(25, 10, 25, 95), P(75, 10, 75, 95), P(25, 52, 75, 52)],
  I: [P(35, 10, 65, 10), P(50, 10, 50, 95), P(35, 95, 65, 95)],
  J: [P(35, 10, 72, 10), [...P(56, 10, 56, 72), ...arc(40, 72, 16, 22, 0, 180)]],
  K: [P(25, 10, 25, 95), P(75, 10, 25, 56), P(40, 46, 75, 95)],
  L: [P(25, 10, 25, 95, 75, 95)],
  M: [P(20, 95, 20, 10, 50, 70, 80, 10, 80, 95)],
  N: [P(25, 95, 25, 10, 75, 95, 75, 10)],
  O: [arc(50, 52.5, 30, 42, -90, -450)],
  P: [P(25, 10, 25, 95), [...P(25, 10, 52, 10), ...arc(52, 33, 23, 23, -90, 90), ...P(25, 56)]],
  Q: [arc(50, 50, 30, 40, -90, -450), P(60, 70, 82, 97)],
  R: [P(25, 10, 25, 95), [...P(25, 10, 52, 10), ...arc(52, 33, 23, 23, -90, 90), ...P(25, 56)], P(45, 56, 76, 95)],
  S: [[...arc(50, 31, 25, 21, -20, -270), ...arc(50, 74, 25, 21, -90, 160)]],
  T: [P(20, 10, 80, 10), P(50, 10, 50, 95)],
  U: [[...P(25, 10, 25, 65), ...arc(50, 65, 25, 30, 180, 0), ...P(75, 10)]],
  V: [P(20, 10, 50, 95, 80, 10)],
  W: [P(15, 10, 32, 95, 50, 35, 68, 95, 85, 10)],
  X: [P(25, 10, 75, 95), P(75, 10, 25, 95)],
  Y: [P(25, 10, 50, 52), P(75, 10, 50, 52, 50, 95)],
  Z: [P(25, 10, 75, 10, 25, 95, 75, 95)],
};

const LOWER = {
  a: [arc(45, 72.5, 20, 22.5, 0, -360), P(65, 50, 65, 95)],
  b: [P(30, 10, 30, 95), arc(50, 72.5, 20, 22.5, 180, 540)],
  c: [arc(50, 72.5, 20, 22.5, -45, -315)],
  d: [arc(45, 72.5, 20, 22.5, 0, -360), P(65, 10, 65, 95)],
  e: [[...P(30, 72, 70, 72), ...arc(50, 72.5, 20, 22.5, 0, -300)]],
  f: [P(68, 18, 60, 10, 50, 12, 45, 25, 45, 95), P(30, 50, 60, 50)],
  g: [arc(45, 72.5, 20, 22.5, 0, -360), [...P(65, 50, 65, 100), ...arc(50, 100, 15, 15, 0, 180)]],
  h: [P(30, 10, 30, 95), [...P(30, 72), ...arc(50, 72, 20, 22, 180, 360), ...P(70, 95)]],
  i: [P(50, 50, 50, 95), P(50, 28, 50, 36)],
  j: [[...P(60, 50, 60, 100), ...arc(45, 100, 15, 15, 0, 180)], P(60, 28, 60, 36)],
  k: [P(30, 10, 30, 95), P(62, 50, 30, 75), P(40, 68, 65, 95)],
  l: [P(50, 10, 50, 95)],
  m: [P(25, 50, 25, 95), [...P(25, 64), ...arc(37.5, 64, 12.5, 14, 180, 360), ...P(50, 95)], [...P(50, 64), ...arc(62.5, 64, 12.5, 14, 180, 360), ...P(75, 95)]],
  n: [P(30, 50, 30, 95), [...P(30, 64), ...arc(50, 64, 20, 16, 180, 360), ...P(70, 95)]],
  o: [arc(50, 72.5, 20, 22.5, -90, -450)],
  p: [P(30, 50, 30, 115), arc(50, 72.5, 20, 22.5, 180, 540)],
  q: [arc(45, 72.5, 20, 22.5, 0, -360), P(65, 50, 65, 115)],
  r: [P(35, 50, 35, 95), [...P(35, 66), ...arc(52, 66, 17, 16, 180, 300)]],
  s: [[...arc(50, 61, 14, 11, -20, -270), ...arc(50, 84, 14, 11, -90, 160)]],
  t: [[...P(45, 20, 45, 82), ...arc(57, 82, 12, 12, 180, 90)], P(30, 50, 62, 50)],
  u: [[...P(30, 50, 30, 78), ...arc(48, 78, 18, 17, 180, 0), ...P(66, 50)], P(66, 50, 66, 95)],
  v: [P(30, 50, 50, 95, 70, 50)],
  w: [P(22, 50, 36, 95, 50, 60, 64, 95, 78, 50)],
  x: [P(30, 50, 70, 95), P(70, 50, 30, 95)],
  y: [P(30, 50, 50, 95), P(70, 50, 40, 115)],
  z: [P(30, 50, 70, 50, 30, 95, 70, 95)],
};

const DIGITS = {
  0: [arc(50, 52.5, 27, 42.5, -90, -450)],
  1: [P(35, 30, 50, 10, 50, 95)],
  2: [[...arc(50, 32, 25, 22, -160, 60), ...P(25, 95, 75, 95)]],
  3: [[...arc(50, 31, 22, 21, -150, 90), ...arc(50, 74, 24, 21, -90, 150)]],
  4: [P(60, 10, 22, 68, 80, 68), P(60, 10, 60, 95)],
  5: [[...P(72, 10, 30, 10, 27, 48, 40, 45), ...arc(52, 70, 24, 25, -100, 150)]],
  6: [[...arc(52, 52, 28, 42, -70, -180), ...arc(50, 72, 24, 23, 180, 540)]],
  7: [P(25, 10, 75, 10, 40, 95)],
  8: [[...arc(50, 31, 21, 21, -60, -300), ...arc(50, 73, 23, 22, -90, 270)]],
  9: [[...arc(50, 32, 23, 22, 0, -360), ...P(73, 32, 60, 95)]],
};

/** Strokes for a single character, or null if we have no shape for it. */
export function glyph(ch) {
  return UPPER[ch] || LOWER[ch] || DIGITS[ch] || null;
}

/** Strokes for a string, one 100-wide cell per character. */
export function cells(text) {
  return [...text].map((ch) => ({ ch, strokes: glyph(ch) || [] }));
}

/* The phonics card each letter reveals: its sound, a word and a picture. */
export const PHONICS = {
  A: { sound: 'ah',  word: 'apple',     emoji: '🍎' },
  B: { sound: 'buh', word: 'ball',      emoji: '⚽' },
  C: { sound: 'kuh', word: 'cat',       emoji: '🐱' },
  D: { sound: 'duh', word: 'dog',       emoji: '🐶' },
  E: { sound: 'eh',  word: 'egg',       emoji: '🥚' },
  F: { sound: 'fff', word: 'fish',      emoji: '🐟' },
  G: { sound: 'guh', word: 'goat',      emoji: '🐐' },
  H: { sound: 'huh', word: 'hat',       emoji: '🎩' },
  I: { sound: 'ih',  word: 'insect',    emoji: '🐞' },
  J: { sound: 'juh', word: 'jelly',     emoji: '🍮' },
  K: { sound: 'kuh', word: 'kite',      emoji: '🪁' },
  L: { sound: 'lll', word: 'lion',      emoji: '🦁' },
  M: { sound: 'mmm', word: 'moon',      emoji: '🌙' },
  N: { sound: 'nnn', word: 'nose',      emoji: '👃' },
  O: { sound: 'oh',  word: 'octopus',   emoji: '🐙' },
  P: { sound: 'puh', word: 'pig',       emoji: '🐷' },
  Q: { sound: 'kwuh', word: 'queen',    emoji: '👑' },
  R: { sound: 'rrr', word: 'rabbit',    emoji: '🐰' },
  S: { sound: 'sss', word: 'sun',       emoji: '☀️' },
  T: { sound: 'tuh', word: 'tree',      emoji: '🌳' },
  U: { sound: 'uh',  word: 'umbrella',  emoji: '☂️' },
  V: { sound: 'vvv', word: 'van',       emoji: '🚐' },
  W: { sound: 'wuh', word: 'water',     emoji: '💧' },
  X: { sound: 'ks',  word: 'box',       emoji: '📦' },
  Y: { sound: 'yuh', word: 'yo-yo',     emoji: '🪀' },
  Z: { sound: 'zzz', word: 'zebra',     emoji: '🦓' },
};

/* Simple words for word tracing — short, phonetic, and each with a picture. */
export const WORDS = [
  { word: 'cat',  emoji: '🐱' }, { word: 'dog',  emoji: '🐶' }, { word: 'sun',  emoji: '☀️' },
  { word: 'hat',  emoji: '🎩' }, { word: 'bus',  emoji: '🚌' }, { word: 'cup',  emoji: '🥤' },
  { word: 'bed',  emoji: '🛏️' }, { word: 'pig',  emoji: '🐷' }, { word: 'cow',  emoji: '🐮' },
  { word: 'ant',  emoji: '🐜' }, { word: 'bee',  emoji: '🐝' }, { word: 'egg',  emoji: '🥚' },
  { word: 'fox',  emoji: '🦊' }, { word: 'owl',  emoji: '🦉' }, { word: 'car',  emoji: '🚗' },
  { word: 'duck', emoji: '🦆' }, { word: 'fish', emoji: '🐟' }, { word: 'ball', emoji: '⚽' },
  { word: 'star', emoji: '⭐' }, { word: 'moon', emoji: '🌙' },
];

/* Things to count while tracing numbers. */
export const COUNTABLES = [
  { emoji: '🍎', one: 'apple',   many: 'apples' },
  { emoji: '🐤', one: 'chick',   many: 'chicks' },
  { emoji: '🎈', one: 'balloon', many: 'balloons' },
  { emoji: '⭐', one: 'star',    many: 'stars' },
  { emoji: '🐟', one: 'fish',    many: 'fish' },
  { emoji: '🍓', one: 'strawberry', many: 'strawberries' },
  { emoji: '🦆', one: 'duck',    many: 'ducks' },
  { emoji: '🍪', one: 'cookie',  many: 'cookies' },
];
