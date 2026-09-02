/* Word tracing.
 *
 * Short phonetic words, one letter after another in the same tracer. Finishing
 * a word shows its picture and spells it aloud — the bridge from single
 * letters to reading a whole word. */

import { el, sparkleFrom, pickFresh } from '../ui.js';
import { cells, WORDS } from '../tracing/glyphs.js';
import { createTracer } from '../tracing/tracer.js';
import { say, hush, sfx } from '../audio.js';
import { gameShell, pipRow } from '../shell.js';

const STAR_EVERY = 3;

export function wordsScene(go) {
  let tracer = null;
  let entry = null;
  let doneThisStar = 0;

  const title = el('span', { class: 'game-title' }, 'Words');
  const area = el('div', { class: 'trace-area' });
  const card = el('div', { class: 'phonics-card', hidden: true });
  const next = el('button', {
    class: 'big-button small', hidden: true, 'aria-label': 'Next word',
    onclick: () => { sfx.tap(); start(); },
  }, el('span', { class: 'glyph' }, '👉'), el('span', { class: 'word' }, 'Next'));

  const pips = pipRow(STAR_EVERY);
  const { scene, body, footer, celebrate } = gameShell(go, {
    middle: el('div', { class: 'trace-head' }, title, pips.row),
    onNew: () => start(),
  });
  body.append(area, card);
  footer.append(next);

  function start() {
    hush();
    next.hidden = true;
    card.hidden = true;
    entry = pickFresh(WORDS, entry);
    title.textContent = entry.word;

    tracer = createTracer({
      cells: cells(entry.word),
      color: 'var(--grape)',
      onStroke: () => sfx.pick(),
      onCell: (i) => say(entry.word[i].toUpperCase()),
      onDone: finished,
    });
    area.replaceChildren(tracer.svg);
    fit();
    setTimeout(() => say(`Let us write ${entry.word}. ${[...entry.word].join(', ')}. Start at the dot!`), 350);
  }

  function fit() {
    const W = area.clientWidth;
    const H = area.clientHeight;
    if (!(W > 0 && H > 0) || !tracer) return;
    const ratio = tracer.svg.viewBox.baseVal.width / tracer.svg.viewBox.baseVal.height;
    const w = Math.min(W * 0.94, H * 0.92 * ratio);
    tracer.svg.style.width = `${w}px`;
    tracer.svg.style.height = `${w / ratio}px`;
  }

  function finished() {
    sfx.match();
    sparkleFrom(tracer.svg);
    card.replaceChildren(
      el('span', { class: 'phonics-emoji' }, entry.emoji),
      el('span', { class: 'phonics-word' }, entry.word),
    );
    card.hidden = false;
    say(`${[...entry.word].join(', ')}. ${entry.word}! You wrote ${entry.word}!`);

    doneThisStar += 1;
    pips.paint(doneThisStar);
    if (doneThisStar >= STAR_EVERY) {
      doneThisStar = 0;
      setTimeout(() => celebrate({
        headline: 'Three words written!',
        spoken: 'Three whole words! Hooray!',
        onAgain: () => { pips.paint(0); start(); },
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
