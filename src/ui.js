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
 * Choose the column count that makes the cards as large as possible in the
 * space available. Cards are square, so this is just: for each candidate column
 * count, the card size is limited by either width or height — take the best.
 */
export function bestColumns(count, width, height, gap) {
  let best = { cols: 1, size: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const size = Math.min(
      (width - gap * (cols - 1)) / cols,
      (height - gap * (rows - 1)) / rows,
    );
    if (size > best.size) best = { cols, size };
  }
  return best;
}
