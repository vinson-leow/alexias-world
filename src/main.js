/* Entry point and router.
 *
 * Routes live in the URL hash, so the iPad's back gesture leaves a game the
 * way a child expects and a link can open straight into one. The splash is
 * shown once per load because browsers refuse to play sound until the page
 * has been touched — and this app talks.
 */

import { el } from './ui.js';
import { unlockAudio, say, sfx, hush } from './audio.js';
import { LOGO_URL } from './cards.js';
import { hubScene } from './hub.js';
import { memoryScene } from './games/memory.js';
import { puzzleScene } from './games/puzzle.js';
import { countScene } from './games/count.js';
import { shapesScene } from './games/shapes.js';
import { coloursScene } from './games/colours.js';

const ROUTES = {
  '': hubScene,
  memory: memoryScene,
  puzzle: puzzleScene,
  count: countScene,
  shapes: shapesScene,
  colours: coloursScene,
};

const app = document.getElementById('app');
let current = null;
let unlocked = false;

export function go(route) {
  location.hash = route ? `#/${route}` : '#/';
}

function routeName() {
  return location.hash.replace(/^#\/?/, '').split('/')[0];
}

function render() {
  const build = ROUTES[routeName()] || hubScene;

  // Let the outgoing scene drop its timers and observers before it goes.
  if (current) {
    current.__cleanup?.();
    current.remove();
  }
  hush();

  current = build(go);
  app.append(current);

  // Anything that sizes itself to the screen needs to run once the scene is
  // actually in the document — and again a frame later, once it has been
  // laid out. A ResizeObserver alone is not reliably prompt for this.
  current.__layout?.();
  requestAnimationFrame(() => current.__layout?.());
}

function splash() {
  const scene = el('div', { class: 'scene splash' },
    el('img', { class: 'splash-icon', src: LOGO_URL, alt: '' }),
    el('h1', {}, "Alexia's World"),
    el('div', { class: 'splash-sub' }, 'Games'),
    el('div', { class: 'hint' }, '👆 Tap to start'),
  );
  scene.addEventListener('click', () => {
    unlockAudio();
    unlocked = true;
    sfx.win();
    say("Welcome to Alexia's World!");
    setTimeout(() => { scene.remove(); render(); }, 450);
  }, { once: true });
  app.replaceChildren(scene);
}

/* Toddlers press everything. Keep the app from being zoomed or long-pressed
   into a state a 2-year-old cannot get out of. */
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('visibilitychange', () => { if (document.hidden) hush(); });

window.addEventListener('hashchange', () => { if (unlocked) render(); });

splash();
