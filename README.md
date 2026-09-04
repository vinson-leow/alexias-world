# Alexia's World

A hub of short, voice-led games for 2–4 year olds, starring Zane, Alexia,
Bunny, Grumblor and Oliver.

Play it: **https://vinson-leow.github.io/alexias-world/**

## Design rules

These are constraints, not preferences. Everything in the code follows from them.

- **No way to lose.** No score that counts down, no miss limit, no fail state.
  A wrong tap wobbles or springs back and nothing else happens.
- **No reading required.** Every card, shape and colour says its own name
  aloud. Words on screen are decoration for the grown-up, never instructions
  for the child.
- **Nothing tappable is small.** Cards, pieces and balloons size themselves to
  fill the screen.
- **A wrong answer teaches.** The wrong balloon is named ("That is blue —
  find red!"); a shape in the wrong hole shows the hole it should be in.
- **Difficulty follows the child, not a menu.** Grown-ups adjust it behind a
  gate a toddler will not pass by accident.

## The games

| Game | What she does | Grown-up settings |
|---|---|---|
| **Memory** | Turn cards to find pairs. Matched pairs vanish. | Board 4×3 to 6×6 · look-back 1–3s · outfits |
| **Puzzle** | Drag pieces of a scene — all five characters somewhere in Dubai — onto its faint shadow in the frame. | 4, 9, 16, 20 or 25 pieces |
| **Counting** | Tap each character and hear the next number; the total is said and shown big. | — |
| **Shapes** | Drag each shape into the hole that matches it. | — |
| **Colours** | Find the balloon of the colour asked for. | — |

Tap **⚙️** and answer the number it asks for; narration and volume live there too.

## Who's playing, and the parent dashboard

The first screen asks who is playing. Children get big tiles with their own
picture; **Grown-up (testing)** is small and plain. Every event that follows is
tagged with that choice, so a parent trying things out never pollutes the
child's record.

Everything a player does — every tap, drop, flip and stroke — is logged with
*who*, *which game*, *whether it was right*, and *how long since the previous
action*. That last field is the pace signal: "fast" and "slow" are measured
against the child's own history, never an external target.

**Parent dashboard** — ⚙️ → answer the number → *Parent dashboard* (or go to
`#/parent`; the gate appears there too). It shows sessions and play time by
day, per-game accuracy and pace with a this-week-versus-before trend, which
letters take longest, and recent sessions. Data stays on the device unless a
grown-up exports it or sets a webhook.

**For assistants and other programs**, the log is a documented contract — see
[EVENTS.md](EVENTS.md): a versioned JSON event schema, a pre-computed digest an
LLM can read directly, a `window.AlexiaWorld` API for browser-driven agents,
and an opt-in webhook that POSTs events as they happen.

## Running it locally

No build step and no dependencies — plain ES modules and CSS. It has to be
served over HTTP rather than opened as a file, because ES modules are blocked
on `file://`:

```bash
python3 -m http.server 4321
```

Then open <http://localhost:4321>.

## Making a sendable copy

`build-standalone.py` flattens everything — code, styles, all card art and the
logo — into one self-contained HTML file that works offline with no server:

```bash
python3 build-standalone.py
```

The output lands in `dist/`. It is pure ASCII by design: the file gets opened
in places that may not declare a charset, so every emoji is escaped rather than
left to chance.

## Layout

```
index.html          entry point
styles.css          all styling
src/
  main.js           splash, hash router, scene lifecycle
  hub.js            the game grid
  shell.js          chrome every game shares: top bar, celebration, pips
  games/            one module per game
  cards.js          the cast, their outfits, the pairings, board sizes
  state.js          settings and stars, persisted to localStorage
  parentgate.js     grown-up settings behind a number gate
  audio.js          narration and chimes — no audio files, all generated
  ui.js             DOM helpers, drag, grid-fitting maths
assets/cards/web/   the card faces, 512px
assets/brand/       the heart logo
```

Full-resolution art and the character bible are kept out of this repo
deliberately — see `.gitignore`.
