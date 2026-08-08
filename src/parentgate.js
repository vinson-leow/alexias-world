/* Grown-up settings, behind a gate a 2-4 year old will not pass by accident.
   A spoken-number tap: instant for an adult, effectively closed to a toddler
   mashing the screen. This is where the card count lives — difficulty follows
   the child rather than being picked from a menu she cannot read. */

import { el } from './ui.js';
import { settings, save, setCardCount, SPEEDS } from './state.js';
import { MIN_CARDS, MAX_CARDS } from './cards.js';
import { say, hush, sfx } from './audio.js';

export function openParentGate(host, { onChange } = {}) {
  hush();
  const target = 2 + Math.floor(Math.random() * 4);   // 2..5
  const veil = el('div', { class: 'veil' });
  const close = () => veil.remove();
  veil.addEventListener('click', (e) => { if (e.target === veil) close(); });

  const gate = el('div', { class: 'sheet' },
    el('h2', {}, 'Grown-ups only'),
    el('p', {}, `To continue, tap the number ${target}.`),
    el('div', { class: 'gate-keys' },
      ...[1, 2, 3, 4, 5].map((n) =>
        el('button', { onclick: () => (n === target ? showPanel() : (sfx.nomatch(), close())) }, String(n))),
    ),
    el('button', { class: 'subtle', onclick: close }, 'Back to playing'),
  );

  function showPanel() {
    sfx.tap();

    /* --- card count: the "add two cards" control --- */
    const countLabel = el('strong', {}, '');
    const paintCount = () => {
      countLabel.textContent = `${settings.cardCount} cards  (${settings.cardCount / 2} pairs)`;
    };
    paintCount();

    const step = (delta) => {
      const before = settings.cardCount;
      const after = setCardCount(before + delta);
      if (after !== before) { sfx.tap(); paintCount(); onChange?.(); }
    };
    const minus = el('button', { class: 'step', onclick: () => step(-2) }, '−');
    const plus  = el('button', { class: 'step', onclick: () => step(+2) }, '+');

    /* --- speed --- */
    const speedRow = el('div', { class: 'row wrap' });
    const paintSpeed = () => {
      speedRow.replaceChildren(
        ...Object.entries(SPEEDS).map(([key, s]) =>
          el('button', {
            class: settings.speed === key ? '' : 'subtle',
            onclick: () => { settings.speed = key; save(); sfx.tap(); paintSpeed(); },
          }, `${s.label} · ${(s.lookBack / 1000).toFixed(1)}s`)),
      );
    };
    paintSpeed();

    /* --- narration + outfits --- */
    const narrationBtn = el('button', {});
    const paintNarration = () => {
      narrationBtn.textContent = settings.narration ? '🔊 Narration: on' : '🔇 Narration: off';
    };
    paintNarration();
    narrationBtn.onclick = () => {
      settings.narration = !settings.narration;
      save();
      paintNarration();
      if (settings.narration) say('Narration is on.'); else hush();
    };

    const outfitBtn = el('button', { class: 'subtle' });
    const paintOutfit = () => {
      outfitBtn.textContent = settings.altOutfits ? '👕 Outfits: second look' : '👕 Outfits: everyday';
    };
    paintOutfit();
    outfitBtn.onclick = () => {
      settings.altOutfits = !settings.altOutfits;
      save();
      paintOutfit();
      sfx.tap();
      onChange?.();
    };

    const panel = el('div', { class: 'sheet' },
      el('h2', {}, 'Grown-up settings'),

      el('p', {}, 'How many cards? Start at 8 and add a pair whenever she finds it easy. The board grows two cards at a time, up to 20.'),
      el('div', { class: 'row' }, minus, countLabel, plus),

      el('p', {}, 'How long a mismatched pair stays face up. Longer gives more time to look and name the picture.'),
      speedRow,

      el('div', { class: 'row wrap' }, narrationBtn, outfitBtn),
      el('p', {}, `Stars: ${settings.stars} · Games finished: ${settings.rounds}. There is no score, no timer and no way to lose — stars only ever go up.`),

      el('button', { onclick: close }, 'Done'),
    );

    // Keep the buttons honest about the limits.
    const paintLimits = () => {
      minus.disabled = settings.cardCount <= MIN_CARDS;
      plus.disabled = settings.cardCount >= MAX_CARDS;
    };
    paintLimits();
    minus.addEventListener('click', paintLimits);
    plus.addEventListener('click', paintLimits);

    veil.replaceChildren(panel);
  }

  veil.append(gate);
  host.append(veil);
}
