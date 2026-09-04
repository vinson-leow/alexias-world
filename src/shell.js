/* The chrome every game shares: a top bar with home, settings and new-game
   chips, a body the game fills, a bottom bar, and a celebration overlay.
   Keeping this in one place is what makes the games feel like one app. */

import { el } from './ui.js';
import { say, sfx, hush } from './audio.js';
import { settings, addStar, save } from './state.js';
import { openParentGate } from './parentgate.js';
import { endGame, leaveGame } from './log.js';

export function gameShell(go, { middle, onNew, sections = () => [] } = {}) {
  const body = el('div', { class: 'game-body' });
  const footer = el('div', { class: 'bottombar' });

  const scene = el('div', { class: 'scene' },
    el('div', { class: 'topbar' },
      el('button', { class: 'chip', 'aria-label': 'Home', onclick: () => { sfx.tap(); hush(); leaveGame(); go(''); } }, '🏠'),
      middle || el('span'),
      el('div', { class: 'chip-row' },
        el('button', {
          class: 'chip ghost', 'aria-label': 'Grown-ups',
          onclick: () => { sfx.tap(); openParentGate(scene, { sections: sections(), onChange: onNew }); },
        }, '⚙️'),
        onNew && el('button', {
          class: 'chip', 'aria-label': 'New game',
          onclick: () => { sfx.tap(); say('New game!'); onNew(); },
        }, '🔄'),
      ),
    ),
    body,
    footer,
  );

  /**
   * The moment at the end of a game. Awards a star, says something kind, and
   * offers Again and Home as two big buttons — the only two things a child
   * could want to do next.
   */
  function celebrate({ headline, spoken, detail, onAgain, stats = {} }) {
    endGame(stats);                      // closes the game's record in the log
    sfx.win();
    settings.rounds += 1;
    const stars = addStar();
    save();
    say(spoken || headline);

    const overlay = el('div', { class: 'win' },
      el('div', { class: 'win-glyph' }, '🎉'),
      el('div', { class: 'win-word' }, headline),
      el('div', { class: 'win-stars' }, '⭐', el('span', {}, String(stars))),
      detail && el('div', { class: 'win-turns' }, detail),
      el('div', { class: 'win-buttons' },
        el('button', {
          class: 'big-button', 'aria-label': 'Play again',
          onclick: () => { sfx.tap(); say('Again!'); overlay.remove(); onAgain(); },
        }, el('span', { class: 'glyph' }, '🔁'), el('span', { class: 'word' }, 'Again')),
        el('button', {
          class: 'big-button home', 'aria-label': 'Home',
          onclick: () => { sfx.tap(); go(''); },
        }, el('span', { class: 'glyph' }, '🏠'), el('span', { class: 'word' }, 'Home')),
      ),
    );
    scene.append(overlay);
    return overlay;
  }

  return { scene, body, footer, celebrate };
}

/** A round-progress row of pips, shared by the games that play in rounds. */
export function pipRow(total) {
  const row = el('div', { class: 'found-row' });
  const paint = (done) => {
    row.replaceChildren(
      ...Array.from({ length: total }, (_, i) =>
        el('span', { class: `pip${i < done ? ' lit' : ''}` }, i < done ? '⭐' : '·')),
    );
  };
  paint(0);
  return { row, paint };
}
