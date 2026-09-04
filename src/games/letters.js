/* Letter tracing, A to Z.
 *
 * One letter at a time, in alphabet order, remembered between sessions so she
 * picks up where she left off. Finishing a letter reveals its phonics card:
 * the sound it makes, a word that starts with it, and a picture. */

import { el, sparkleFrom } from '../ui.js';
import { cells, PHONICS } from '../tracing/glyphs.js';
import { createTracer } from '../tracing/tracer.js';
import { settings, save } from '../state.js';
import { say, hush, sfx } from '../audio.js';
import { gameShell, pipRow } from '../shell.js';
import { choiceRow } from '../parentgate.js';
import { beginGame, action } from '../log.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const STAR_EVERY = 5;

export function lettersScene(go) {
  let tracer = null;
  let letter = 'A';
  let lower = false;
  let doneThisStar = 0;
  let glyphStartedAt = 0;
  let strokesDone = 0;

  const title = el('span', { class: 'game-title' }, 'A');
  const area = el('div', { class: 'trace-area' });
  const card = el('div', { class: 'phonics-card', hidden: true });
  const next = el('button', {
    class: 'big-button small', hidden: true, 'aria-label': 'Next letter',
    onclick: () => { sfx.tap(); settings.traceLetter = (settings.traceLetter + 1) % ALPHABET.length; save(); start(); },
  }, el('span', { class: 'glyph' }, '👉'), el('span', { class: 'word' }, 'Next'));

  const pips = pipRow(STAR_EVERY);
  const { scene, body, footer, celebrate } = gameShell(go, {
    middle: el('div', { class: 'trace-head' }, title, pips.row),
    onNew: () => start(),
    sections: () => [
      el('p', {}, 'Which letters to trace.'),
      choiceRow(
        [{ label: 'ABC  ·  capitals', v: 'upper' }, { label: 'abc  ·  small letters', v: 'lower' }, { label: 'Aa  ·  both, in turn', v: 'both' }],
        (o) => settings.traceCase === o.v,
        (o) => { settings.traceCase = o.v; save(); },
      ),
      el('p', {}, `She is on letter ${ALPHABET[settings.traceLetter]}.`),
      el('div', { class: 'row' }, el('button', { class: 'subtle', onclick: () => { settings.traceLetter = 0; save(); } }, 'Start again from A')),
    ],
  });
  body.append(area, card);
  footer.append(next);

  function start() {
    hush();
    next.hidden = true;
    card.hidden = true;
    letter = ALPHABET[settings.traceLetter % ALPHABET.length];
    lower = settings.traceCase === 'lower' || (settings.traceCase === 'both' && settings.traceLetter % 2 === 1);
    const ch = lower ? letter.toLowerCase() : letter;
    title.textContent = `${letter} ${letter.toLowerCase()}`;
    // A "game" here is one run of five letters to a star.
    if (doneThisStar === 0) beginGame('letters', { case: settings.traceCase, from: letter });
    glyphStartedAt = Date.now();
    strokesDone = 0;

    tracer = createTracer({
      cells: cells(ch),
      color: 'var(--berry)',
      onStroke: () => { strokesDone += 1; sfx.pick(); action('stroke', { ch }); },
      onDone: finished,
    });
    area.replaceChildren(tracer.svg);
    fit();
    setTimeout(() => say(`Let us trace the letter ${letter}. Start at the dot!`), 350);
  }

  function fit() {
    const W = area.clientWidth;
    const H = area.clientHeight;
    if (!(W > 0 && H > 0) || !tracer) return;
    const ratio = tracer.svg.viewBox.baseVal.width / tracer.svg.viewBox.baseVal.height;
    const w = Math.min(W * 0.92, H * 0.92 * ratio);
    tracer.svg.style.width = `${w}px`;
    tracer.svg.style.height = `${w / ratio}px`;
  }

  function finished() {
    const p = PHONICS[letter];
    action('glyph_done', { ch: lower ? letter.toLowerCase() : letter, strokes: strokesDone, ms: Date.now() - glyphStartedAt, correct: true });
    sfx.match();
    sparkleFrom(tracer.svg);
    card.replaceChildren(
      el('span', { class: 'phonics-emoji' }, p.emoji),
      el('span', { class: 'phonics-word' }, p.word),
    );
    card.hidden = false;
    say(`${letter}! ${letter} says ${p.sound}. ${p.sound}, ${p.sound}, ${p.word}!`);

    doneThisStar += 1;
    pips.paint(doneThisStar);
    if (doneThisStar >= STAR_EVERY) {
      doneThisStar = 0;
      setTimeout(() => celebrate({
        headline: 'Five letters traced!',
        spoken: 'Five letters! What a writer!',
        stats: { letters: STAR_EVERY, upTo: letter, case: settings.traceCase },
        onAgain: () => { settings.traceLetter = (settings.traceLetter + 1) % ALPHABET.length; save(); pips.paint(0); start(); },
      }), 2600);
    } else {
      setTimeout(() => { next.hidden = false; }, 1200);
    }
  }

  const ro = window.ResizeObserver ? new ResizeObserver(fit) : null;
  ro?.observe(area);
  scene.__layout = fit;
  scene.__cleanup = () => ro?.disconnect();

  start();
  return scene;
}
