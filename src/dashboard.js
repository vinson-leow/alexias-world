/* The parent dashboard — one consumer of the analytics layer. Everything it
   shows comes from analyse(); the numbers match the exported digest exactly. */

import { el } from './ui.js';
import { allEvents, clearAll, toCSV, syncStatus, sendTestEvent } from './log.js';
import { analyse, summarise, mean, dayKey, GAME_NAMES } from './analytics.js';
import { settings, save } from './state.js';
import { PROFILES } from './profiles.js';
import { openParentGate } from './parentgate.js';
import { sfx } from './audio.js';

const DAY = 86400000;
const secs = (ms) => (ms == null ? '—' : ms < 10000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`);
const mins = (ms) => (ms < 60000 ? `${Math.round(ms / 1000)}s` : `${Math.round(ms / 60000)} min`);
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '—');
const shortDate = (t) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const shortTime = (t) => new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

export function dashboardScene(go) {
  const scene = el('div', { class: 'scene dash' });
  let whoFilter = 'kids';
  let days = 30;

  const content = el('div', { class: 'dash-body' });
  scene.append(
    el('div', { class: 'topbar' },
      el('button', { class: 'chip', 'aria-label': 'Home', onclick: () => { sfx.tap(); go(''); } }, '🏠'),
      el('span', { class: 'game-title' }, 'Parent dashboard'),
      el('span'),
    ),
    content,
  );

  function render() {
    const d = analyse(allEvents(), { whoFilter, days });
    content.replaceChildren(
      filters(),
      d.ev.length ? el('div', {}, summary(d), daily(d), perGame(d), lettersGrid(d), recent(d)) : empty(),
      integrations(),
      tools(),
    );
  }

  function seg(options, value, onPick) {
    return el('div', { class: 'seg' },
      ...options.map((o) => el('button', { class: o.v === value ? 'on' : '', onclick: () => { onPick(o.v); render(); } }, o.label)));
  }

  function filters() {
    const kids = settings.kids.map((id) => ({ v: id, label: PROFILES[id]?.name || id }));
    return el('div', { class: 'dash-filters' },
      seg([
        { v: 'kids', label: kids.length > 1 ? 'All children' : (kids[0]?.label || 'Child') },
        ...(kids.length > 1 ? kids : []),
        { v: 'parent', label: 'Grown-up (testing)' },
        { v: 'all', label: 'Everyone' },
      ], whoFilter, (v) => { whoFilter = v; }),
      seg([{ v: 7, label: '7 days' }, { v: 30, label: '30 days' }, { v: 0, label: 'All time' }], days, (v) => { days = v; }),
    );
  }

  const tile = (label, value, note) => el('div', { class: 'tile-stat' },
    el('div', { class: 'stat-value' }, value),
    el('div', { class: 'stat-label' }, label),
    note && el('div', { class: 'stat-note' }, note),
  );

  function summary(d) {
    const finished = Object.values(d.games).reduce((a, g) => a + g.finished, 0);
    return el('div', { class: 'dash-tiles' },
      tile('Sessions', String(d.sessionList.length)),
      tile('Play time', d.playMs ? mins(d.playMs) : '0 min', d.sessionList.length ? `about ${mins(d.playMs / d.sessionList.length)} each` : null),
      tile('Games finished', String(finished)),
      tile('Right first time', pct(d.allRight, d.allTries), d.allTries ? `${d.allRight} of ${d.allTries} tries` : null),
    );
  }

  function daily(d) {
    const n = Math.min(days || 30, 30);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const cols = [];
    let max = 1;
    for (let i = n - 1; i >= 0; i--) {
      const t = today.getTime() - i * DAY;
      const v = d.perDay.get(dayKey(t)) || 0;
      max = Math.max(max, v);
      cols.push({ t, v });
    }
    return section('Minutes played, by day',
      el('div', { class: 'bars' },
        ...cols.map((c) => el('div', { class: 'bar-col', title: `${shortDate(c.t)}: ${c.v ? mins(c.v) : 'none'}` },
          el('div', { class: 'bar', style: `height:${Math.round((c.v / max) * 100)}%` }),
          el('div', { class: 'bar-label' }, String(new Date(c.t).getDate())),
        ))));
  }

  function perGame(d) {
    const rows = Object.values(d.games).sort((a, b) => b.started - a.started);
    if (!rows.length) return el('span');
    const trendCell = (g) => {
      if (!g.trend) return el('td', {}, '—');
      const glyph = g.trend === 'faster' ? '▲' : g.trend === 'slower' ? '▼' : '●';
      return el('td', { class: `trend ${g.trend}` }, `${glyph} ${g.trend}`);
    };
    return section('By game',
      el('div', { class: 'table-wrap' },
        el('table', { class: 'dash-table' },
          el('thead', {}, el('tr', {}, ...['Game', 'Played', 'Finished', 'Avg time', 'Best', 'Right first time', 'Pace', 'This week'].map((h) => el('th', {}, h)))),
          el('tbody', {}, ...rows.map((g) => el('tr', {},
            el('td', {}, GAME_NAMES[g.id] || g.id),
            el('td', {}, String(g.started)),
            el('td', {}, g.left ? `${g.finished} (${g.left} left early)` : String(g.finished)),
            el('td', {}, secs(g.avg)),
            el('td', {}, secs(g.best)),
            el('td', {}, pct(g.right, g.tries)),
            el('td', {}, (g.speedRecent ?? g.speedEarlier) != null ? `${secs(g.speedRecent ?? g.speedEarlier)} / move` : '—'),
            trendCell(g),
          ))))),
      el('p', { class: 'dash-note' }, 'Pace is the middle gap between one action and the next. "This week" compares that pace over the last 7 days with everything before — faster means she is quicker than she used to be at this game.'),
    );
  }

  function lettersGrid(d) {
    const all = Object.values(d.letters);
    if (!all.length) return el('span');
    const avgs = all.map((L) => mean(L.ms)).filter((x) => x != null);
    const lo = Math.min(...avgs), hi = Math.max(...avgs);
    const grid = el('div', { class: 'letter-grid' });
    for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const L = d.letters[ch];
      const avg = L ? mean(L.ms) : null;
      const k = avg != null && hi > lo ? (avg - lo) / (hi - lo) : 0;   // 0 quickest … 1 slowest
      grid.append(el('div', {
        class: `letter-cell${L ? '' : ' none'}`,
        style: L ? `--h:${130 - Math.round(k * 100)}` : '',
        title: L ? `${ch}: traced ${L.n}×, about ${secs(avg)} each` : `${ch}: not yet`,
      }, el('span', { class: 'lc' }, ch), L && el('span', { class: 'ln' }, `${L.n}× · ${secs(avg)}`)));
    }
    const slowest = all.filter((L) => L.ms.length).sort((a, b) => mean(b.ms) - mean(a.ms)).slice(0, 3).map((L) => L.ch);
    return section('Letters traced', grid,
      slowest.length ? el('p', { class: 'dash-note' }, `Green is quickest for her, orange slowest. Taking longest right now: ${slowest.join(', ')}.`) : null);
  }

  function recent(d) {
    return section('Recent sessions',
      el('div', { class: 'table-wrap' },
        el('table', { class: 'dash-table' },
          el('thead', {}, el('tr', {}, ...['When', 'Who', 'Length', 'Played'].map((h) => el('th', {}, h)))),
          el('tbody', {}, ...d.sessionList.slice(0, 12).map((s) => el('tr', {},
            el('td', {}, `${shortDate(s.start)} · ${shortTime(s.start)}`),
            el('td', {}, PROFILES[s.who]?.name || s.who || '—'),
            el('td', {}, s.end - s.start < 60000 ? `${Math.round((s.end - s.start) / 1000)}s` : mins(s.end - s.start)),
            el('td', {}, [...s.games].map((g) => GAME_NAMES[g] || g).join(', ') || '—'),
          ))))));
  }

  function empty() {
    return el('div', { class: 'dash-empty' },
      el('div', { class: 'win-glyph' }, '📊'),
      el('p', {}, 'Nothing here yet for this filter. Play a game or two and come back — every tap is recorded from now on.'));
  }

  /* Where an outside program plugs in. */
  function integrations() {
    const url = el('input', { type: 'url', placeholder: 'https://… (leave empty to keep everything on this device)', value: settings.syncUrl || '', style: 'flex:1;min-width:240px;height:48px;padding:0 14px;border-radius:14px;border:2px solid #E7E1F3;font:inherit;font-size:15px' });
    const status = el('span', { class: 'dash-note' }, syncStatus());
    const saveBtn = el('button', { onclick: () => { settings.syncUrl = url.value.trim(); save(); sfx.tap(); status.textContent = syncStatus(); } }, 'Save');
    const testBtn = el('button', { class: 'subtle', onclick: async () => { testBtn.textContent = 'Sending…'; const ok = await sendTestEvent(); testBtn.textContent = ok ? 'Test sent ✓' : 'Test failed — check the URL'; status.textContent = syncStatus(); } }, 'Send a test event');
    return section('Connect an assistant or another program',
      el('p', { class: 'dash-note' }, 'Three ways in, all documented in EVENTS.md in the repo: download the digest or the raw events below; read them live through window.AlexiaWorld in the page; or set a webhook URL here and every event is POSTed to it as JSON as it happens.'),
      el('div', { class: 'row wrap' }, url, saveBtn, testBtn),
      status,
    );
  }

  function download(name, text, type) {
    const a = el('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
    document.body.append(a); a.click(); a.remove();
  }

  function tools() {
    const clearBtn = el('button', { class: 'subtle' }, 'Clear the log');
    clearBtn.onclick = () => {
      if (clearBtn.dataset.armed) { clearAll(); delete clearBtn.dataset.armed; render(); }
      else { clearBtn.dataset.armed = '1'; clearBtn.textContent = 'Tap again to clear everything'; }
    };
    const stamp = new Date().toISOString().slice(0, 10);
    return section('Your data',
      el('p', { class: 'dash-note' }, 'Stored on this device only unless you set a webhook above. The digest is the summary an assistant should read first; the raw events are every tap.'),
      el('div', { class: 'row wrap' },
        el('button', { onclick: () => download(`alexias-world-digest-${stamp}.json`, JSON.stringify(summarise(allEvents(), { whoFilter, days }), null, 1), 'application/json') }, '⬇ Digest (JSON)'),
        el('button', { class: 'subtle', onclick: () => download(`alexias-world-events-${stamp}.json`, JSON.stringify(allEvents(), null, 1), 'application/json') }, '⬇ Raw events (JSON)'),
        el('button', { class: 'subtle', onclick: () => download(`alexias-world-events-${stamp}.csv`, toCSV(), 'text/csv') }, '⬇ Raw events (CSV)'),
        clearBtn,
      ));
  }

  const section = (title, ...kids) => el('section', { class: 'dash-section' }, el('h2', {}, title), ...kids.filter(Boolean));

  // Only ever reached through the gate — a direct link to #/parent gets the
  // gate too, so a child cannot land here by accident.
  openParentGate(scene, { onPass: render, onCancel: () => go('') });
  return scene;
}
