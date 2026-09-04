/* Number tracing, 1 to 10 or 20.
 *
 * Each number is traced with a row of things to count beneath it — three
 * apples under a 3 — so the shape and the quantity arrive together. */

import { el, sparkleFrom, pickFresh, numberWord } from '../ui.js';
import { cells, COUNTABLES } from '../tracing/glyphs.js';
import { createTracer } from '../tracing/tracer.js';
import { settings, save } from '../state.js';
import { say, hush, sfx } from '../audio.js';
import { gameShell, pipRow } from '../shell.js';
import { choiceRow } from '../parentgate.js';
import { beginGame, action } from '../log.js';

const STAR_EVERY = 5;

export function numbersScene(go) {
  let tracer = null;
  let n = 1;
  let thing = null;
  let doneThisStar = 0;
  let glyphStartedAt = 0;
  let strokesDone = 0;

  const title = el('span', { class: 'game-title' }, '1');
  const area = el('div', { class: 'trace-area' });
  const things = el('div', { class: 'count-things' });
  const next = el('button', {
    class: 'big-button small', hidden: true, 'aria-label': 'Next number',
    onclick: () => { sfx.tap(); n = n >= settings.numbersMax ? 1 : n + 1; start(); },
  }, el('span', { class: 'glyph' }, '👉'), el('span', { class: 'word' }, 'Next'));

  const pips = pipRow(STAR_EVERY);
  const { scene, body, footer, celebrate } = gameShell(go, {
    middle: el('div', { class: 'trace-head' }, title, pips.row),
    onNew: () => { n = 1; start(); },
    sections: () => [
      el('p', {}, 'How far to count.'),
      choiceRow(
        [{ label: '1 to 10', v: 10 }, { label: '1 to 20', v: 20 }],
        (o) => settings.numbersMax === o.v,
        (o) => { settings.numbersMax = o.v; save(); },
      ),
    ],
  });
  body.append(area, things);
  footer.append(next);

  function start() {
    hush();
    next.hidden = true;
    thing = pickFresh(COUNTABLES, thing);
    title.textContent = String(n);
    if (doneThisStar === 0) beginGame('numbers', { max: settings.numbersMax, from: n });
    glyphStartedAt = Date.now();
    strokesDone = 0;

    tracer = createTracer({
      cells: cells(String(n)),
      color: 'var(--sky)',
      onStroke: () => { strokesDone += 1; sfx.pick(); action('stroke', { ch: String(n) }); },
      onDone: finished,
    });
    area.replaceChildren(tracer.svg);

    things.replaceChildren(
      ...Array.from({ length: n }, () => el('span', { class: 'count-thing' }, thing.emoji)),
    );
    fit();
    setTimeout(() => say(`Let us write the number ${numberWord(n)}. Start at the dot!`), 350);
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
    action('glyph_done', { ch: String(n), strokes: strokesDone, ms: Date.now() - glyphStartedAt, correct: true });
    sfx.match();
    sparkleFrom(tracer.svg);
    // The things bounce in one after another as they are counted aloud.
    [...things.children].forEach((t, i) => setTimeout(() => t.classList.add('bounce'), 150 * i));
    say(`${numberWord(n)}! ${numberWord(n)} ${n === 1 ? thing.one : thing.many}!`);

    doneThisStar += 1;
    pips.paint(doneThisStar);
    if (doneThisStar >= STAR_EVERY) {
      doneThisStar = 0;
      setTimeout(() => celebrate({
        headline: 'Five numbers written!',
        spoken: 'Five numbers! Hooray!',
        stats: { numbers: STAR_EVERY, upTo: n, max: settings.numbersMax },
        onAgain: () => { n = n >= settings.numbersMax ? 1 : n + 1; pips.paint(0); start(); },
      }), 2400);
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
