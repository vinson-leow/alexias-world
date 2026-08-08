/* Entry point. A tap-to-start screen, then the game.
   The start screen exists because browsers block audio until the page has been
   touched — and this game talks. */

import { el } from './ui.js';
import { unlockAudio, say, sfx, hush } from './audio.js';
import { startGame } from './game.js';

const app = document.getElementById('app');

function splash() {
  const scene = el('div', { class: 'scene splash' },
    el('img', { class: 'splash-icon', src: 'assets/brand/heart-icon-256.jpg', alt: '' }),
    el('h1', {}, "Alexia's World"),
    el('div', { class: 'splash-sub' }, 'Memory Match'),
    el('div', { class: 'hint' }, '👆 Tap to start'),
  );
  scene.addEventListener('click', () => {
    unlockAudio();
    sfx.win();
    say("Let's play memory!");
    setTimeout(() => startGame(app), 500);
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

splash();
