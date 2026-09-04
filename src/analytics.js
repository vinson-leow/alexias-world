/* Analysis over the event log — shared by the parent dashboard, the exported
 * digest, and the `window.AlexiaWorld` API that outside tools (an MCP server,
 * a browser-driven agent) read from.
 *
 * Nothing here has side effects. Given the same events it returns the same
 * numbers, so an LLM reading the digest and a parent reading the dashboard
 * are looking at the same facts.
 *
 * "Fast" and "slow" are relative to the child's own history, never an external
 * target: the trend compares her median time-per-action over the last seven
 * days with everything before that.
 */

export const DIGEST_VERSION = 'digest.v1';
export const EVENTS_VERSION = 'events.v1';

export const GAME_NAMES = {
  memory: 'Memory', puzzle: 'Puzzle', count: 'Counting', shapes: 'Shapes', colours: 'Colours',
  letters: 'Letters', words: 'Words', numbers: 'Numbers',
};

const DAY = 86400000;
const IDLE_CUTOFF = 60000;   // gaps longer than this are not thinking time

export const median = (xs) => {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

const isChild = (who) => who && who !== 'parent';

/**
 * @param events   the raw log
 * @param whoFilter 'kids' | 'parent' | 'all' | a profile id
 * @param days      look-back window in days; 0 for everything
 */
export function analyse(events, { whoFilter = 'kids', days = 30 } = {}) {
  const now = Date.now();
  const since = days ? now - days * DAY : 0;
  const ev = events.filter((e) =>
    e.t >= since &&
    (whoFilter === 'all' || (whoFilter === 'kids' ? isChild(e.who) : e.who === whoFilter)));

  // Sessions: everything sharing an id, spanning first to last event.
  const sessions = new Map();
  for (const e of ev) {
    const s = sessions.get(e.s) || { id: e.s, who: e.who, start: e.t, end: e.t, games: new Set() };
    s.start = Math.min(s.start, e.t);
    s.end = Math.max(s.end, e.t);
    if (e.game) s.games.add(e.game);
    sessions.set(e.s, s);
  }
  const sessionList = [...sessions.values()].sort((a, b) => b.start - a.start);
  const playMs = sessionList.reduce((a, s) => a + (s.end - s.start), 0);

  const perDay = new Map();
  for (const s of sessionList) {
    const k = dayKey(s.start);
    perDay.set(k, (perDay.get(k) || 0) + (s.end - s.start));
  }

  const weekAgo = now - 7 * DAY;
  const games = {};
  for (const e of ev) {
    if (!e.game) continue;
    const g = games[e.game] ||= {
      id: e.game, started: 0, finished: 0, left: 0, durations: [],
      right: 0, tries: 0, dtRecent: [], dtEarlier: [],
    };
    if (e.type === 'game_start') g.started += 1;
    if (e.type === 'game_end') { g.finished += 1; g.durations.push(e.duration); }
    if (e.type === 'game_leave') g.left += 1;
    if (typeof e.correct === 'boolean') { g.tries += 1; if (e.correct) g.right += 1; }
    if (e.dt != null && e.dt > 0 && e.dt < IDLE_CUTOFF && !['game_start', 'game_end', 'game_leave'].includes(e.type)) {
      (e.t >= weekAgo ? g.dtRecent : g.dtEarlier).push(e.dt);
    }
  }
  for (const g of Object.values(games)) {
    g.avg = mean(g.durations);
    g.best = g.durations.length ? Math.min(...g.durations) : null;
    g.speedRecent = median(g.dtRecent);
    g.speedEarlier = median(g.dtEarlier);
    g.trend = g.speedRecent != null && g.speedEarlier != null
      ? (g.speedRecent < g.speedEarlier * 0.9 ? 'faster' : g.speedRecent > g.speedEarlier * 1.1 ? 'slower' : 'steady')
      : null;
  }

  // Letters, from glyph_done events in the letters game.
  const letters = {};
  for (const e of ev) {
    if (e.type !== 'glyph_done' || e.game !== 'letters' || !e.ch) continue;
    const k = e.ch.toUpperCase();
    const L = letters[k] ||= { ch: k, n: 0, ms: [] };
    L.n += 1;
    if (e.ms) L.ms.push(e.ms);
  }

  const allTries = Object.values(games).reduce((a, g) => a + g.tries, 0);
  const allRight = Object.values(games).reduce((a, g) => a + g.right, 0);

  return { ev, sessionList, playMs, perDay, games, letters, allTries, allRight, since, now };
}

/**
 * A compact, stable JSON summary meant to be read by a language model or
 * another program. Plain numbers, ISO dates, no DOM, no prose — the words are
 * for the dashboard to add.
 */
export function summarise(events, opts = {}) {
  const d = analyse(events, opts);
  const round = (x) => (x == null ? null : Math.round(x));
  return {
    version: DIGEST_VERSION,
    eventsVersion: EVENTS_VERSION,
    generatedAt: new Date(d.now).toISOString(),
    filter: { who: opts.whoFilter ?? 'kids', days: opts.days ?? 30 },
    totals: {
      events: d.ev.length,
      sessions: d.sessionList.length,
      playMs: d.playMs,
      gamesStarted: Object.values(d.games).reduce((a, g) => a + g.started, 0),
      gamesFinished: Object.values(d.games).reduce((a, g) => a + g.finished, 0),
      gamesLeftEarly: Object.values(d.games).reduce((a, g) => a + g.left, 0),
      tries: d.allTries,
      rightFirstTime: d.allRight,
      accuracy: d.allTries ? +(d.allRight / d.allTries).toFixed(3) : null,
    },
    perDay: [...d.perDay.entries()].sort().map(([day, ms]) => ({ day, playMs: ms })),
    games: Object.values(d.games).map((g) => ({
      id: g.id,
      name: GAME_NAMES[g.id] || g.id,
      started: g.started,
      finished: g.finished,
      leftEarly: g.left,
      avgDurationMs: round(g.avg),
      bestDurationMs: g.best,
      tries: g.tries,
      rightFirstTime: g.right,
      accuracy: g.tries ? +(g.right / g.tries).toFixed(3) : null,
      medianMsPerActionLast7Days: round(g.speedRecent),
      medianMsPerActionBefore: round(g.speedEarlier),
      trend: g.trend,            // 'faster' | 'slower' | 'steady' | null
    })),
    letters: Object.values(d.letters).map((L) => ({
      letter: L.ch, traced: L.n, avgMs: round(mean(L.ms)),
    })).sort((a, b) => a.letter.localeCompare(b.letter)),
    recentSessions: d.sessionList.slice(0, 20).map((s) => ({
      id: s.id, who: s.who,
      startedAt: new Date(s.start).toISOString(),
      durationMs: s.end - s.start,
      games: [...s.games],
    })),
  };
}
