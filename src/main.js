/* Entry point and router.
 *
 * Routes live in the URL hash, so the iPad's back gesture leaves a game the
 * way a child expects and a link can open straight into one. The first screen
 * asks who is playing: it doubles as the tap that unlocks audio (browsers
 * refuse to play sound until the page has been touched) and it tags every
 * event that follows with the player, which is what the dashboard sorts by.
 */

import { el } from './ui.js';
import { unlockAudio, say, sfx, hush } from './audio.js';
import { LOGO_URL } from './cards.js';
import { settings } from './state.js';
import { PROFILES } from './profiles.js';
import { setWho, getWho, leaveGame, allEvents } from './log.js';
import { summarise, EVENTS_VERSION } from './analytics.js';

/* The page's public surface for outside programs — a browser-driven MCP, a
   test script, an assistant. Read-only, documented in EVENTS.md. */
window.AlexiaWorld = Object.freeze({
  version: EVENTS_VERSION,
  events: () => allEvents(),
  summary: (opts) => summarise(allEvents(), opts),
  who: () => getWho(),
  profiles: Object.fromEntries(Object.entries(PROFILES).map(([id, p]) => [id, { name: p.name, kind: p.kind }])),
  schemaUrl: new URL('assets/schema/events.v1.json', location.href).href,
});
import { hubScene } from './hub.js';
import { dashboardScene } from './dashboard.js';
import { memoryScene } from './games/memory.js';
import { puzzleScene } from './games/puzzle.js';
import { countScene } from './games/count.js';
import { shapesScene } from './games/shapes.js';
import { coloursScene } from './games/colours.js';
import { lettersScene } from './games/letters.js';
import { wordsScene } from './games/words.js';
import { numbersScene } from './games/numbers.js';

const ROUTES = {
  '': hubScene,
  parent: dashboardScene,
  memory: memoryScene,
  puzzle: puzzleScene,
  count: countScene,
  shapes: shapesScene,
  colours: coloursScene,
  letters: lettersScene,
  words: wordsScene,
  numbers: numbersScene,
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

  // Leaving a game unfinished is itself worth recording.
  leaveGame();
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

/* Who's playing. Children get big tiles with their own picture; the grown-up
   option is small and plain, because it is for testing, not for her. */
function splash() {
  const kids = settings.kids.filter((id) => PROFILES[id]);

  const pickProfile = (id) => {
    unlockAudio();
    unlocked = true;
    setWho(id);
    sfx.win();
    say(PROFILES[id].hello);
    setTimeout(() => { scene.remove(); render(); }, 450);
  };

  const scene = el('div', { class: 'scene splash' },
    el('img', { class: 'splash-icon', src: LOGO_URL, alt: '' }),
    el('h1', {}, "Alexia's World"),
    el('div', { class: 'splash-sub' }, "Who's playing?"),
    el('div', { class: 'who-row' },
      ...kids.map((id) => el('button', { class: 'who', 'aria-label': PROFILES[id].name, onclick: () => pickProfile(id) },
        el('img', { class: 'who-avatar', src: PROFILES[id].avatar, alt: '' }),
        el('span', { class: 'who-name' }, PROFILES[id].name),
      )),
    ),
    el('button', { class: 'who-parent', onclick: () => pickProfile('parent') }, '👤 Grown-up (testing)'),
  );
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
