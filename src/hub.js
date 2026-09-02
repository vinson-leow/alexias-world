/* The hub — games in groups, each fronted by one of the characters. Every
   tile is announced out loud, so a child who cannot read still knows what she
   is choosing. */

import { el } from './ui.js';
import { say, sfx } from './audio.js';
import { settings } from './state.js';
import { artUrl, LOGO_URL } from './cards.js';
import { openParentGate } from './parentgate.js';

export const GROUPS = [
  {
    title: 'Play',
    games: [
      { id: 'memory',  name: 'Memory',   glyph: '🃏', spoken: 'Memory match!',     color: 'var(--berry)', avatar: LOGO_URL },
      { id: 'puzzle',  name: 'Puzzle',   glyph: '🧩', spoken: 'Puzzle time!',      color: 'var(--grape)', avatar: artUrl('07-grumblor-hug') },
      { id: 'count',   name: 'Counting', glyph: '🧮', spoken: 'Let us count!',     color: 'var(--sun)',   avatar: artUrl('05-bunny-cape') },
      { id: 'shapes',  name: 'Shapes',   glyph: '🔷', spoken: 'Shapes!',           color: 'var(--sky)',   avatar: artUrl('01-zane-denim') },
      { id: 'colours', name: 'Colours',  glyph: '🎈', spoken: 'Find the colours!', color: 'var(--leaf)',  avatar: artUrl('03-alexia-cardigan') },
    ],
  },
  {
    title: 'Tracing',
    games: [
      { id: 'letters', name: 'Letters',  glyph: '✏️', spoken: 'Trace the letters!', color: 'var(--berry)', avatar: artUrl('15-oliver-firefighter') },
      { id: 'words',   name: 'Words',    glyph: '📝', spoken: 'Write a word!',      color: 'var(--grape)', avatar: artUrl('12-alexia-bunny') },
      { id: 'numbers', name: 'Numbers',  glyph: '🔢', spoken: 'Trace the numbers!', color: 'var(--sky)',   avatar: artUrl('18-zane-astronaut') },
    ],
  },
];

const GREETINGS = ['Which game shall we play?', 'Pick a game!', 'What would you like to play?'];

export function hubScene(go) {
  const sections = GROUPS.map((group) => {
    const grid = el('div', { class: 'hub-grid' });
    for (const g of group.games) {
      grid.append(el('button', {
        class: 'tile', style: `--tile:${g.color}`, 'aria-label': g.name,
        onclick: () => { sfx.pick(); say(g.spoken); setTimeout(() => go(g.id), 260); },
      },
        el('img', { class: 'tile-avatar', src: g.avatar, alt: '' }),
        el('span', { class: 'tile-glyph' }, g.glyph),
        el('span', { class: 'tile-name' }, g.name),
      ));
    }
    return el('section', { class: 'hub-group' },
      el('h2', { class: 'hub-group-title' }, group.title),
      grid,
    );
  });

  const scene = el('div', { class: 'scene hub' },
    el('div', { class: 'topbar' },
      el('button', {
        class: 'chip ghost', 'aria-label': 'Grown-ups',
        onclick: () => { sfx.tap(); openParentGate(scene); },
      }, '⚙️'),
      el('div', { class: 'hub-title' },
        el('img', { class: 'hub-logo', src: LOGO_URL, alt: '' }),
        el('h1', {}, "Alexia's World"),
      ),
      el('div', { class: 'stars' }, '⭐', el('span', {}, String(settings.stars))),
    ),
    el('div', { class: 'hub-scroll' }, ...sections),
  );

  setTimeout(() => say(GREETINGS[settings.rounds % GREETINGS.length]), 400);
  return scene;
}
