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
