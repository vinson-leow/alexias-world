/* Grown-up settings, behind a gate a 2-4 year old will not pass by accident.
   A spoken-number tap: instant for an adult, effectively closed to a toddler
   mashing the screen.

   Each game hands in its own settings rows via `sections`; the rows every game
   shares — narration, volume, profiles, the dashboard — live here. With
   `onPass`, the gate is just a gate: it runs the callback instead of opening
   the settings panel. */

import { el } from './ui.js';
import { settings, save } from './state.js';
import { say, hush, sfx } from './audio.js';
import { PROFILES, CHILD_IDS } from './profiles.js';

export function openParentGate(host, { sections = [], onChange, onPass, onCancel } = {}) {
  hush();
  const target = 2 + Math.floor(Math.random() * 4);   // 2..5
  const veil = el('div', { class: 'veil' });
  const close = () => veil.remove();
  const cancel = () => { close(); onCancel?.(); };
  veil.addEventListener('click', (e) => { if (e.target === veil) cancel(); });

  const gate = el('div', { class: 'sheet' },
    el('h2', {}, 'Grown-ups only'),
    el('p', {}, `To continue, tap the number ${target}.`),
    el('div', { class: 'gate-keys' },
      ...[1, 2, 3, 4, 5].map((n) =>
        el('button', { onclick: () => (n === target ? passed() : (sfx.nomatch(), cancel())) }, String(n))),
    ),
    el('button', { class: 'subtle', onclick: cancel }, 'Back to playing'),
  );

  function passed() {
    sfx.tap();
    if (onPass) { close(); onPass(); return; }
    showPanel();
  }

  function showPanel() {
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

    // Which children appear on the who's-playing screen.
    const kidsRow = el('div', { class: 'row wrap' });
    const paintKids = () => {
      kidsRow.replaceChildren(...CHILD_IDS.map((id) => {
        const on = settings.kids.includes(id);
        return el('button', {
          class: on ? '' : 'subtle',
          onclick: () => {
            if (on && settings.kids.length === 1) return;          // always keep one child
            settings.kids = on ? settings.kids.filter((k) => k !== id) : [...settings.kids, id];
            save(); sfx.tap(); paintKids();
          },
        }, `${on ? '✓ ' : ''}${PROFILES[id].name}`);
      }));
    };
    paintKids();

    const panel = el('div', { class: 'sheet' },
      el('h2', {}, 'Grown-up settings'),
      ...sections,
      el('div', { class: 'row wrap' }, narrationBtn),
      el('div', { class: 'row' }, volLabel, vol),
      el('p', {}, 'Who appears on the who\'s-playing screen.'),
      kidsRow,
      el('div', { class: 'row wrap' },
        el('button', { onclick: () => { close(); location.hash = '#/parent'; } }, '📊 Parent dashboard'),
      ),
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
