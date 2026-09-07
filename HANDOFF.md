# Alexia's World — handoff

Everything a new session needs to pick this up. Read this first, then
[EVENTS.md](EVENTS.md) for the data layer, then the private character bible.

## What it is

A hub of short, voice-led games for 2–4 year olds, starring five characters
generated from the family's own photos. Live, public, no login:

**https://vinson-leow.github.io/alexias-world/**

Public repo: https://github.com/vinson-leow/alexias-world
Private repo (bible, masters, scene docs): https://github.com/vinson-leow/alexias-world-private

## The five characters — do not lose these

| Character | Who | Height | Higgsfield solo still (use THIS as a reference) |
|---|---|---|---|
| **Zane** | boy, mixed Eurasian, dark chestnut hair with a topknot | 91cm (94 with topknot) | `68e73f57-a4fd-41ec-b4f8-339ac79b1c71` |
| **Alexia** | girl, East Asian, low side pigtails, pink cardigan | 88cm | `884d2b77-1f66-4d36-a699-c8493a83f358` |
| **Oliver** | boy, blonde | 92cm | `c0a90ef4-6ad5-432d-90af-6c6c1a97fdac` |
| **Bunny** | living plush rabbit, pink, mint cape, glowing heart | 80cm | `508cdf7d-1a1e-4a77-9e3d-321f82fc9d13` |
| **Grumblor** | big friendly shaggy monster, propeller beanie | 150cm | `f785c8d1-caa8-4d29-a300-daec93f87a26` |

Shared mark: the **heart icon** (girl + bunny in a red heart), asset
`528e0707-4b2b-45de-a4ac-1de3b7547003`. It is printed on Alexia's tee and on
Bunny's cape hood; pass it as a reference wherever either is visible.

These IDs belong to the Higgsfield **account**, not a session. Any session with
the Higgsfield connector can pass them straight in as `medias`. The full locked
descriptions, outfits, expressive tells and generation settings are in
`CHARACTER-BIBLE.md` in the private repo. **Restate the locked description
verbatim in every prompt** — that is what stops the characters drifting.

### The art pipeline (learned the hard way)

1. Reference photos → **turnaround sheet** (16:9 · 2k · high, four views).
2. Sheet → **one solo still** (2:3 · 1k · high, "EXACTLY ONE … use the sheet as
   identity reference only").
3. Cards, scenes, video → from the **solo still only**.

Never feed a multi-panel sheet directly into a scene: the model sees several
copies of the character and duplicates them. Every multi-character prompt says
"EXACTLY N characters, one per reference, each appears exactly ONCE" and
restates all heights — the models resize characters between shots otherwise.

Costumes are described, not named (a "Polynesian island princess costume", not
Moana; a "red karate gi", not Ken). Alexia's sneakers are always "plain
unbranded, no logos" — every one of her real photos had a Nike swoosh.

## What's built

**Games** (`src/games/`): Memory, Puzzle, Counting, Shapes, Colours, and three
tracing games — Letters (A–Z, phonics card on completion), Words, Numbers.
All no-fail, all voice-led (speechSynthesis, no audio files), all instrumented.

**Puzzle** uses four 16:9 scenes with all five characters (beach club, marina,
dunes, souk — `assets/scenes/web/`) because card faces have blank backgrounds
that made jigsaw pieces indistinguishable.

**Who's playing**: first screen picks a profile. `alexia` is on by default;
`zane`/`oliver` can be enabled in ⚙️; `parent` is for testing and is kept
separate in all analysis.

**Event log + parent dashboard** (`#/parent`, behind the number gate): every
tap/drop/flip/stroke logged with who, game, correctness and gap since the
previous action. Dashboard shows play by day, per-game accuracy and pace with a
this-week-vs-before trend, letters by time taken, recent sessions; exports
digest/JSON/CSV. **Integration surface for a future MCP**: versioned schema
(`assets/schema/events.v1.json`), `summarise()` digest, `window.AlexiaWorld`
in-page API, opt-in webhook. All in `EVENTS.md`.

## Architecture (zero build, no dependencies)

```
index.html, styles.css
src/main.js            splash (profile picker), hash router, scene lifecycle (__layout/__cleanup)
src/hub.js             tile grid in groups
src/shell.js           shared game chrome, celebrate() → endGame()
src/cards.js           cast, outfits, pairings, board sizes
src/state.js           settings + stars in localStorage ('alexias-world/memory/v1')
src/log.js             event log ('alexias-world/log/v1'), webhook
src/analytics.js       analyse() + summarise() (digest.v1)
src/dashboard.js       parent dashboard
src/profiles.js        who can play
src/parentgate.js      number gate; onPass mode for the dashboard
src/tracing/           glyph strokes (A–Z, a–z, 0–9) + the tracing engine
src/ui.js              DOM helpers, draggable(), fitGrid()
build-standalone.py    single-file offline build → dist/ (4.5MB, pure ASCII)
```

Run locally: `python3 -m http.server 4321` (ES modules need HTTP, not file://).
Deploy: push to `main`; GitHub Pages builds in ~30s.

### Design rules the code follows

- No fail state anywhere. A wrong answer wobbles or springs back.
- Every tappable thing is big; every screen speaks; cards never move.
- Difficulty follows the child via ⚙️, never a menu she can read.
- Only one outfit per character in a memory deck — toddlers match by character.
- Wrong answers teach ("That is blue — find red!").

## Gotchas worth knowing

- **Higgsfield MCP array args broke mid-session** after a reconnect (`jobs_wait`,
  `show_generation_by_ids`, `generate_image_batch` rejected arrays as strings).
  Workaround that works: single `generate_image` calls, then poll with
  `job_display` (`id` param) and download the `rawUrl` with curl.
- **Chat attachments are not readable by remote tools** — photos must go in via
  `media_upload_widget`.
- The local shell **can** reach the Higgsfield CDN (an older note said it could
  not); masters were pulled with curl.
- iOS throttles timers in background tabs: the memory game has a self-healing
  resolve for a pair left face-up; keep that pattern in any new timed game.
- `[hidden] { display:none !important }` is in styles.css because class
  `display` rules outrank the browser's `[hidden]`.
- Card masters, scene masters, character sheets and the bible are gitignored
  in the public repo on purpose (children's full-res photos + personal details).

## Open threads

- Tracing tolerances may need tuning per letter once she plays (S, G, 3, 8 are
  the likeliest to feel off).
- Oliver has one solo card; everyone else has two.
- A "Letters" find-the-balloon game would complete the Lingokids categories.
- The MCP server itself is not built — the app side is ready for it.
