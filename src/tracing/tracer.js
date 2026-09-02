/* The tracing engine.
 *
 * Draws the glyph as a soft "road", shows the current stroke as a dotted line
 * with a pulsing start dot, and colours the road in behind the child's finger.
 *
 * Progress is measured against the stroke's sampled points in order, so the
 * finger has to travel the stroke in the right direction — which is the whole
 * point of tracing — but there is no failure state anywhere: wander off the
 * road and nothing happens; come back and it carries on. Lifting the finger
 * keeps whatever progress was made.
 */

const NS = 'http://www.w3.org/2000/svg';
const CELL_W = 100;
const CELL_H = 120;

const STEP = 3;           // sampled spacing along a stroke, in glyph units
const REACH = 11;         // how close the finger must be to advance
const START_REACH = 16;   // how close to the start dot to begin a stroke
const LOOKAHEAD = 5;      // points the finger may skip in one move
const ENOUGH = 0.92;      // fraction of a stroke that counts as finished

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

/** Evenly spaced points along a polyline. */
function resample(points, step = STEP) {
  const out = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    let d = step - carry;
    while (d <= len) {
      const t = d / len;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      d += step;
    }
    carry = len - (d - step);
  }
  const last = points[points.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last.x - tail.x, last.y - tail.y) > 0.5) out.push(last);
  return out;
}

function pathD(points) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

/**
 * @param cells   [{ strokes: [[{x,y},...], ...] }, ...] — one 100-wide cell each
 * @param color   ink colour for completed tracing
 * @param onStroke(cellIndex, strokeIndex)   a stroke was finished
 * @param onCell(cellIndex)                  every stroke in a cell is finished
 * @param onDone()                           every cell is finished
 */
export function createTracer({ cells, color = '#FF8DA1', onStroke, onCell, onDone }) {
  const svg = svgEl('svg', {
    viewBox: `0 0 ${CELL_W * cells.length} ${CELL_H}`,
    class: 'tracer',
    role: 'img',
  });

  // Flattened list of strokes with their cell offsets, in tracing order.
  const strokes = [];
  cells.forEach((cell, ci) => {
    cell.strokes.forEach((raw, si) => {
      const pts = resample(raw.map((p) => ({ x: p.x + ci * CELL_W, y: p.y })));
      strokes.push({ ci, si, pts, k: 0, done: false });
    });
  });

  const roadLayer = svgEl('g', { class: 'trace-road' });
  const inkLayer = svgEl('g', { class: 'trace-ink' });
  const guideLayer = svgEl('g', { class: 'trace-guide' });
  svg.append(roadLayer, inkLayer, guideLayer);

  for (const s of strokes) {
    s.road = svgEl('path', { d: pathD(s.pts), class: 'road' });
    s.ink = svgEl('path', { d: '', class: 'ink', stroke: color });
    roadLayer.append(s.road);
    inkLayer.append(s.ink);
  }

  const dots = svgEl('path', { class: 'dots' });
  const startDot = svgEl('circle', { class: 'start', r: 7, fill: color });
  const startNum = svgEl('text', { class: 'start-num', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
  guideLayer.append(dots, startDot, startNum);

  let current = 0;
  let tracing = false;

  function showGuide() {
    const s = strokes[current];
    if (!s) { guideLayer.setAttribute('visibility', 'hidden'); return; }
    guideLayer.setAttribute('visibility', 'visible');
    dots.setAttribute('d', pathD(s.pts));
    const p = s.pts[0];
    startDot.setAttribute('cx', p.x);
    startDot.setAttribute('cy', p.y);
    startNum.setAttribute('x', p.x);
    startNum.setAttribute('y', p.y);
    startNum.textContent = String(s.si + 1);
    strokes.forEach((o) => o.road.classList.toggle('active', o === s));
  }

  function paintInk(s) {
    s.ink.setAttribute('d', pathD(s.pts.slice(0, Math.max(2, s.k + 1))));
  }

  function finishStroke(s) {
    s.done = true;
    s.k = s.pts.length - 1;
    paintInk(s);
    s.road.classList.add('done');
    onStroke?.(s.ci, s.si);

    const cellDone = strokes.filter((o) => o.ci === s.ci).every((o) => o.done);
    if (cellDone) onCell?.(s.ci);

    current += 1;
    showGuide();
    if (current >= strokes.length) {
      svg.classList.add('done');
      onDone?.();
    }
  }

  /* Finger position in glyph units. */
  const pt = svg.createSVGPoint();
  function toLocal(e) {
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const q = pt.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function advance(s, f) {
    // Take the furthest point within reach among the next few, so a quick
    // finger is not left behind, but a finger far off the road advances nothing.
    let best = -1;
    for (let j = s.k; j <= Math.min(s.pts.length - 1, s.k + LOOKAHEAD); j++) {
      if (dist(f, s.pts[j]) <= REACH) best = j;
    }
    if (best > s.k) { s.k = best; paintInk(s); }
    if (s.k >= (s.pts.length - 1) * ENOUGH) finishStroke(s);
  }

  svg.addEventListener('pointerdown', (e) => {
    const s = strokes[current];
    if (!s) return;
    const f = toLocal(e);
    if (!f) return;
    // Begin at the start dot, or pick up again near where the finger left off.
    const near = dist(f, s.pts[s.k]) <= START_REACH || dist(f, s.pts[0]) <= START_REACH;
    if (!near) return;
    tracing = true;
    try { svg.setPointerCapture(e.pointerId); } catch { /* fine */ }
    if (dist(f, s.pts[0]) <= START_REACH && s.k === 0) { s.k = 0; }
    advance(s, f);
  });

  svg.addEventListener('pointermove', (e) => {
    if (!tracing) return;
    const s = strokes[current];
    if (!s) return;
    const f = toLocal(e);
    if (f) advance(s, f);
  });

  const lift = () => { tracing = false; };
  svg.addEventListener('pointerup', lift);
  svg.addEventListener('pointercancel', lift);
  svg.style.touchAction = 'none';

  showGuide();

  return {
    svg,
    get done() { return current >= strokes.length; },
    /** Colour every stroke in as if traced — used to show the finished shape. */
    reveal() { for (const s of strokes) { s.k = s.pts.length - 1; paintInk(s); s.road.classList.add('done'); } },
  };
}
