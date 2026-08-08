# Alexia's World — Memory Match

A memory-match game for 2–4 year olds, starring Zane, Alexia, Bunny and Grumblor.

Play it: **https://vinson-leow.github.io/alexias-world/**

## Design rules

These are constraints, not preferences. Everything in the code follows from them.

- **No way to lose.** No timer, no score, no move counter, no miss limit.
  A wrong pair is not a mistake — the cards simply turn back over.
- **No reading required.** Every card says its own name aloud. Words on screen
  are decoration for the grown-up, never instructions for the child.
- **Cards never move.** A child who remembers "Bunny was in the corner" is
  right. Matched pairs vanish and leave their gap; the grid does not reflow.
- **Nothing tappable is small.** Cards size themselves to fill the screen.
- **Difficulty follows the child, not a menu.** A grown-up adds a pair at a
  time, 8 cards up to 20, behind a gate a toddler will not pass by accident.

## Playing

Tap the heart to start, then tap cards to find pairs.

**Grown-up settings** — tap ⚙️ and answer the number it asks for:

| Setting | Options |
|---|---|
| Cards | 8 to 20, two at a time (4 to 10 pairs) |
| Speed | Gentle 3s · Normal 2s · Quick 1s — how long a mismatched pair stays face up |
| Narration | On / off |
| Outfits | Everyday or a second look for each character |

## Running it locally

No build step and no dependencies — it is plain ES modules and CSS. It does
need to be served over HTTP rather than opened as a file, because ES modules
are blocked on `file://`:

```bash
python3 -m http.server 4321
```

Then open <http://localhost:4321>.

## Making a sendable copy

`build-standalone.py` flattens the whole game — code, styles and all card art —
into one self-contained HTML file that works offline with no server:

```bash
python3 build-standalone.py
```

The output lands in `dist/`. It is pure ASCII by design: the file gets opened in
places that may not declare a charset, so every emoji is escaped rather than
left to chance.

## Layout

```
index.html          entry point
styles.css          all styling; the flip is a 3D rotateY, 300ms
src/
  main.js           tap-to-start, then hands off to the game
  game.js           dealing, matching, the resolution timers
  cards.js          the deck, and the order it grows in
  state.js          settings and stars, persisted to localStorage
  parentgate.js     grown-up settings behind a number gate
  audio.js          narration and chimes — no audio files, all generated
  ui.js             DOM helpers and the grid-fitting maths
assets/cards/web/   the 14 card faces, 512px
```

Full-resolution art and the character bible are kept out of this repo
deliberately — see `.gitignore`.
