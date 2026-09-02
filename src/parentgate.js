/* Grown-up settings, behind a gate a 2-4 year old will not pass by accident.
   A spoken-number tap: instant for an adult, effectively closed to a toddler
   mashing the screen.

   Each game hands in its own settings rows via `sections`; the rows every game
   shares — narration, volume, stars — live here. */

import { el } from './ui.js';
import { settings, save } from './state.js';
import { say, hush, sfx } from './audio.js';

export function openParentGate(host, { sections = [], onChange } = {}) {
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

    const volLabel = el('span', {}, `Volume ${Math.round(settings.volume * 100)}%`);
    const vol = el('input', {
      type: 'range', min: '0', max: '100', step: '10',
      value: String(Math.round(settings.volume * 100)),
      style: 'flex:1;min-width:160px;height:44px',
    });
    vol.addEventListener('input', () => {
      settings.volume = Number(vol.value) / 100;
      volLabel.textContent = `Volume ${vol.value}%`;
      save();
    });
    vol.addEventListener('change', () => sfx.tap());

    const panel = el('div', { class: 'sheet' },
      el('h2', {}, 'Grown-up settings'),
      ...sections,
      el('div', { class: 'row wrap' }, narrationBtn),
      el('div', { class: 'row' }, volLabel, vol),
      el('p', {}, `Stars: ${settings.stars} · Games finished: ${settings.rounds}. There is no score, no timer that matters and no way to lose — stars only ever go up.`),
      el('button', { onclick: () => { close(); onChange?.(); } }, 'Done'),
    );
    veil.replaceChildren(panel);
  }

  veil.append(gate);
  host.append(veil);
}

/** A row of mutually exclusive choice buttons, styled like the rest of the sheet. */
export function choiceRow(options, isActive, onPick) {
  const row = el('div', { class: 'row wrap' });
  const paint = () => {
    row.replaceChildren(
      ...options.map((o) =>
        el('button', {
          class: isActive(o) ? '' : 'subtle',
          onclick: () => { if (!isActive(o)) { onPick(o); sfx.tap(); paint(); } },
        }, o.label)),
    );
  };
  paint();
  return row;
}
