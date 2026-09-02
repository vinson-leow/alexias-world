/* Small DOM helpers. No framework — the whole game is a few hundred nodes. */

export function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style') node.setAttribute('style', v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

/** A burst of sparkles at a point — the reward for finding a pair. */
export function sparkle(x, y, glyphs = ['⭐', '✨', '🌟', '💫']) {
  for (let i = 0; i < 12; i++) {
    const s = el('span', { class: 'spark' }, glyphs[i % glyphs.length]);
    const angle = (Math.PI * 2 * i) / 12 + Math.random();
    const dist = 80 + Math.random() * 110;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    document.body.append(s);
    setTimeout(() => s.remove(), 1000);
  }
}

export function sparkleFrom(node) {
  const r = node.getBoundingClientRect();
  sparkle(r.left + r.width / 2, r.top + r.height / 2);
}

export function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

/** Pick randomly but never repeat the previous value — stops "again!" feeling stale. */
export function pickFresh(list, previous) {
  if (list.length < 2) return list[0];
  let next = pick(list);
  while (next === previous) next = pick(list);
  return next;
}

/**
 * Make an element draggable with a finger or mouse. On release, `onDrop` gets
 * the element's centre and decides whether the drop is accepted; if not, the
 * element springs back to where it started.
 *
 * Pointer events cover touch and mouse in one path, and `setPointerCapture`
 * means a fast toddler swipe that leaves the element still ends cleanly.
 */
export function draggable(node, { onDrop, onStart } = {}) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let homeX = 0;         // the element's centre when the drag began
  let homeY = 0;
  let lastX = 0;
  let lastY = 0;
  node.style.touchAction = 'none';

  node.addEventListener('pointerdown', (e) => {
    if (node.dataset.locked) return;
    // Grabbing a piece mid-spring-back cancels the spring; otherwise the
    // transition it left behind would smear the next drag.
    node.classList.remove('springing');
    node.style.transform = '';
    const r = node.getBoundingClientRect();
    homeX = r.left + r.width / 2;
    homeY = r.top + r.height / 2;
    dragging = true;
    startX = lastX = e.clientX;
    startY = lastY = e.clientY;
    try { node.setPointerCapture(e.pointerId); } catch { /* not all pointers can be captured */ }
    node.classList.add('dragging');
    onStart?.(node);
  });

  node.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    lastX = e.clientX;
    lastY = e.clientY;
    node.style.transform = `translate(${lastX - startX}px, ${lastY - startY}px)`;
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    node.classList.remove('dragging');
    // Where the piece IS is derived from the pointer, not read back from the
    // element — so an in-flight transition can never distort the drop.
    const accepted = onDrop?.({ x: homeX + (lastX - startX), y: homeY + (lastY - startY), node });
    if (!accepted) {
      node.classList.add('springing');
      node.style.transform = '';
      setTimeout(() => node.classList.remove('springing'), 280);
    }
  };
  node.addEventListener('pointerup', end);
  node.addEventListener('pointercancel', end);
}

/** Centre of an element in viewport coordinates. */
export function centreOf(node) {
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

/** A big, gentle wobble — the universal "not that one" with no sting in it. */
export function wobble(node) {
  node.classList.remove('wobble');
  void node.offsetWidth;
  node.classList.add('wobble');
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
export function numberWord(n) { return NUMBER_WORDS[n] ?? String(n); }

/**
 * Fit a fixed grid to the space available. The rectangle is given — 4x3, 4x4,
 * 5x4 — so the only choice is which way round it sits. A 4x3 board turned on
 * its side is a 3x4 board: still a clean rectangle, and on a portrait screen
 * it makes the cards substantially bigger.
 */
export function fitGrid(cols, rows, width, height, gap) {
  const sizeOf = (c, r) => Math.min(
    (width - gap * (c - 1)) / c,
    (height - gap * (r - 1)) / r,
  );
  const upright = sizeOf(cols, rows);
  const turned = sizeOf(rows, cols);
  return turned > upright
    ? { cols: rows, rows: cols, size: turned }
    : { cols, rows, size: upright };
}
