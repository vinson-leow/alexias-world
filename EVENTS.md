# Alexia's World — data for assistants and programs

Everything a player does is recorded as a small JSON event. This document is
the contract: an MCP server, a script, or a language model can rely on it.

Machine-readable schema: [`assets/schema/events.v1.json`](assets/schema/events.v1.json)
(also served live at `https://vinson-leow.github.io/alexias-world/assets/schema/events.v1.json`).

## Three ways in

| Route | Best for | How |
|---|---|---|
| **Digest file** | An LLM reasoning about progress | Parent dashboard → *Digest (JSON)*. Pre-computed summary, `digest.v1`. Read this first. |
| **Raw events** | Analysis, spreadsheets, re-computing anything | Parent dashboard → *Raw events (JSON / CSV)*. Every tap. |
| **Live in the page** | Browser-driven agents (e.g. an MCP that controls Chrome) | `window.AlexiaWorld` — see below. |
| **Webhook** | A server that wants events as they happen | Parent dashboard → *Connect* → set a URL. Every event is POSTed as JSON. |

Nothing leaves the device unless a grown-up sets the webhook URL or exports a
file. Events are capped at the most recent 8,000 in the browser.

## `window.AlexiaWorld`

Available on the page once it has loaded.

```js
AlexiaWorld.version            // app data version, e.g. "events.v1"
AlexiaWorld.events()           // Array<Event> — the raw log
AlexiaWorld.summary(opts?)     // Digest — same numbers the dashboard shows
                               //   opts: { whoFilter: 'kids'|'parent'|'all'|<profileId>, days: 7|30|0 }
AlexiaWorld.who()              // who is playing right now: 'alexia' | 'parent' | …
AlexiaWorld.profiles           // { alexia: {name, kind}, …, parent: {…} }
AlexiaWorld.schemaUrl          // where the JSON Schema lives
// Live stream — fires for every event as it is logged:
window.addEventListener('alexia:event', (e) => console.log(e.detail));
```

## Event shape

Every event has these fields:

| Field | Type | Meaning |
|---|---|---|
| `t` | number | Unix ms when it happened |
| `who` | string | Profile id: `alexia`, `zane`, `oliver`, or `parent` (a grown-up testing) |
| `s` | string | Session id — one per launch of the app |
| `type` | string | What happened; see below |
| `game` | string \| null | `memory` `puzzle` `count` `shapes` `colours` `letters` `words` `numbers` |
| `dt` | number \| null | Ms since the player's previous action in this game. **This is the pace signal.** Null on the first action of a game. Treat gaps over 60,000 as idle, not thinking. |

Additional fields depend on `type`:

| `type` | Extra fields | Notes |
|---|---|---|
| `session_start` | — | App opened and a profile chosen |
| `game_start` | `config` | Settings that shaped the game (board size, speed, pieces…) |
| `game_end` | `duration`, plus game stats | Finished. `duration` is ms from `game_start` |
| `game_leave` | `duration` | Left before finishing |
| `flip` | `card` | Memory: a card turned |
| `match` / `miss` | `correct` (true/false), `pair` | Memory: a pair resolved |
| `drop` | `correct`, `piece` or `shape` | Puzzle / Shapes: a piece dropped |
| `count_tap` | `n` | Counting: the n-th character tapped |
| `round_done` | `n`, `total` | Counting: a round completed |
| `pick` | `correct`, `colour`, `target` | Colours: a balloon tapped |
| `stroke` | `ch` | Tracing: one stroke completed |
| `glyph_done` | `ch`, `strokes`, `ms` | Tracing: a whole letter/digit finished. `ms` is time on that glyph |
| `word_done` | `word`, `ms` | Word tracing: whole word finished |
| `test` | `note` | Sent from the dashboard to check a webhook |

`correct` is a boolean wherever a choice could be right or wrong. Accuracy in
the digest is simply `count(correct=true) / count(correct defined)`.

## Digest (`digest.v1`)

```jsonc
{
  "version": "digest.v1",
  "eventsVersion": "events.v1",
  "generatedAt": "2026-08-08T10:00:00.000Z",
  "filter": { "who": "kids", "days": 30 },
  "totals": { "events", "sessions", "playMs", "gamesStarted", "gamesFinished",
              "gamesLeftEarly", "tries", "rightFirstTime", "accuracy" },
  "perDay": [ { "day": "2026-08-08", "playMs": 412000 } ],
  "games": [ { "id", "name", "started", "finished", "leftEarly",
               "avgDurationMs", "bestDurationMs", "tries", "rightFirstTime", "accuracy",
               "medianMsPerActionLast7Days", "medianMsPerActionBefore",
               "trend" /* "faster" | "slower" | "steady" | null */ } ],
  "letters": [ { "letter": "A", "traced": 3, "avgMs": 14200 } ],
  "recentSessions": [ { "id", "who", "startedAt", "durationMs", "games": [] } ]
}
```

`trend` compares the child's median time-per-action over the last 7 days with
all earlier data for that game: more than 10% quicker is `faster`, more than
10% slower is `slower`. It is always relative to her own history.

## Webhook payload

```json
{ "version": "events.v1", "source": "alexias-world",
  "sentAt": "…", "events": [ /* Event, … */ ] }
```

POSTed with `Content-Type: application/json`, in small batches, within a few
seconds of the events — within half a second of a game ending. Best effort:
a failed batch is retried on the next flush. Respond 2xx to acknowledge.

## Versioning

Field additions are non-breaking and keep the version. Renames or removals
bump `events.v1` → `events.v2` and the schema file alongside.
