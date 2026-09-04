/* The event log.
 *
 * Everything a player does is recorded as a small event: who, which game,
 * what happened, whether it was right, and how long it took since the last
 * thing they did. The parent dashboard reads nothing but this list.
 *
 * Local only. Events live in this browser's localStorage and never leave the
 * device unless a grown-up exports them. Capped so the store cannot grow
 * without bound on a tablet that is played on every day for a year.
 */

const KEY = 'alexias-world/log/v1';
const CAP = 8000;

let events = load();
let who = null;
let sessionId = null;
let current = null;        // the game in progress: { game, startedAt, lastAt }
let saveTimer = null;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(events)); } catch { /* full or private mode */ }
  }, 300);
}

function push(e) {
  events.push(e);
  if (events.length > CAP) events.splice(0, events.length - CAP);
  save();
  queueSync(e);
  window.dispatchEvent(new CustomEvent('alexia:event', { detail: e }));
}

/* ---------- optional webhook ----------
   Off unless a grown-up sets a URL in the dashboard. When set, events are
   POSTed in small batches as JSON, best-effort: a failed batch is retried on
   the next flush, and nothing here ever blocks the game. This is the hook a
   future MCP server or assistant listens on. */

let outbox = [];
let flushTimer = null;
let lastSync = { at: null, ok: null, error: null };

function syncUrl() {
  try { return JSON.parse(localStorage.getItem('alexias-world/memory/v1') || '{}').syncUrl || ''; } catch { return ''; }
}

function queueSync(e) {
  if (!syncUrl()) return;
  outbox.push(e);
  clearTimeout(flushTimer);
  // Send promptly at the end of a game, otherwise every few seconds.
  flushTimer = setTimeout(flush, e.type === 'game_end' || e.type === 'game_leave' ? 500 : 4000);
}

async function flush() {
  const url = syncUrl();
  if (!url || !outbox.length) return;
  const batch = outbox;
  outbox = [];
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 'events.v1', source: 'alexias-world', sentAt: new Date().toISOString(), events: batch }),
      keepalive: true,
    });
    lastSync = { at: Date.now(), ok: res.ok, error: res.ok ? null : `HTTP ${res.status}` };
    if (!res.ok) outbox = batch.concat(outbox);
  } catch (err) {
    lastSync = { at: Date.now(), ok: false, error: String(err.message || err) };
    outbox = batch.concat(outbox);
  }
}

export function syncStatus() {
  if (!syncUrl()) return 'Webhook off — nothing leaves this device.';
  if (lastSync.at == null) return `Webhook set. ${outbox.length} event(s) waiting to send.`;
  const when = new Date(lastSync.at).toLocaleTimeString();
  return lastSync.ok ? `Last sent ${when} ✓` : `Last attempt ${when} failed: ${lastSync.error}`;
}

/** Sends one synthetic event right now so a receiver can be checked. */
export async function sendTestEvent() {
  outbox.push({ t: Date.now(), who: who ?? 'parent', s: sessionId, type: 'test', note: 'sent from the parent dashboard' });
  await flush();
  return lastSync.ok === true;
}

/** Who is holding the tablet. 'parent' sessions are kept apart in the dashboard. */
export function setWho(id) {
  who = id;
  sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  push({ t: Date.now(), who, s: sessionId, type: 'session_start' });
}
export function getWho() { return who; }

/** A game begins. `config` is whatever settings shaped it — board size, speed. */
export function beginGame(game, config = {}) {
  if (current) leaveGame();
  const now = Date.now();
  current = { game, startedAt: now, lastAt: now };
  push({ t: now, who, s: sessionId, type: 'game_start', game, config });
}

/**
 * Something the player did inside the current game. `dt` is the gap since the
 * previous action in milliseconds — the raw material for "fast" and "slow".
 */
export function action(kind, data = {}) {
  const now = Date.now();
  const dt = current ? now - current.lastAt : null;
  if (current) current.lastAt = now;
  push({ t: now, who, s: sessionId, type: kind, game: current?.game ?? null, dt, ...data });
}

/** The game was completed. `stats` carries the game's own summary. */
export function endGame(stats = {}) {
  if (!current) return;
  const now = Date.now();
  push({ t: now, who, s: sessionId, type: 'game_end', game: current.game, duration: now - current.startedAt, ...stats });
  current = null;
}

/** The player left before finishing — also worth knowing. */
export function leaveGame() {
  if (!current) return;
  const now = Date.now();
  push({ t: now, who, s: sessionId, type: 'game_leave', game: current.game, duration: now - current.startedAt });
  current = null;
}

export function allEvents() { return events.slice(); }

export function clearAll() {
  events = [];
  save();
}

/** Flat CSV for spreadsheets: fixed columns first, then any extra fields as JSON. */
export function toCSV(list = events) {
  const fixed = ['t', 'iso', 'who', 's', 'type', 'game', 'dt', 'duration', 'correct'];
  const rows = [[...fixed, 'extra'].join(',')];
  for (const e of list) {
    const extra = {};
    for (const [k, v] of Object.entries(e)) if (!fixed.includes(k)) extra[k] = v;
    const cells = [
      e.t, new Date(e.t).toISOString(), e.who ?? '', e.s ?? '', e.type, e.game ?? '',
      e.dt ?? '', e.duration ?? '', e.correct === undefined ? '' : e.correct,
      JSON.stringify(extra).replace(/"/g, '""'),
    ];
    rows.push(cells.map((c) => `"${String(c)}"`).join(','));
  }
  return rows.join('\n');
}
