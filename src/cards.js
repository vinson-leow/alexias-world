/* The deck.
 *
 * Two kinds of card: a character alone, and two characters together.
 *
 * Card order IS the difficulty curve. A deck is built from the top down:
 * first one card per character — five maximally distinct faces — then the
 * two-character cards, which are harder because they share faces with each
 * other.
 *
 * Each character has several outfits, but only ONE of them enters a deck.
 * A toddler matches by character, not by image: "Alexia in a tutu" beside
 * "Alexia in a raincoat" produces a tap she is entirely right to think should
 * have worked. The spare outfits are used for variety between games instead —
 * see pickDesigns.
 */

export const LOGO_URL = 'assets/brand/heart-icon-256.jpg';

const CHARACTERS = [
  { id: 'zane',     say: 'Zane',     looks: ['01-zane-denim', '18-zane-astronaut'] },
  { id: 'alexia',   say: 'Alexia',   looks: ['03-alexia-cardigan', '04-alexia-island',
                                             '19-alexia-ballerina', '20-alexia-bear',
                                             '21-alexia-strawberry'] },
  { id: 'bunny',    say: 'Bunny',    looks: ['05-bunny-cape', '06-bunny-hood'] },
  { id: 'grumblor', say: 'Grumblor', looks: ['07-grumblor-hug', '08-grumblor-scarf'] },
  { id: 'oliver',   say: 'Oliver',   looks: ['15-oliver-firefighter'] },
];

/* Every pairing of the five characters — ten of them. Ordered so the earliest
   are the ones a child meets first. */
const PAIRS = [
  { id: 'zane-alexia',     say: 'Zane and Alexia',     art: '09-zane-alexia' },
  { id: 'alexia-bunny',    say: 'Alexia and Bunny',    art: '12-alexia-bunny' },
  { id: 'oliver-bunny',    say: 'Oliver and Bunny',    art: '17-oliver-bunny-camp' },
  { id: 'zane-grumblor',   say: 'Zane and Grumblor',   art: '11-zane-grumblor' },
  { id: 'oliver-zane',     say: 'Oliver and Zane',     art: '22-oliver-zane' },
  { id: 'bunny-grumblor',  say: 'Bunny and Grumblor',  art: '14-bunny-grumblor' },
  { id: 'oliver-alexia',   say: 'Oliver and Alexia',   art: '16-oliver-alexia-kungfu' },
  { id: 'zane-bunny',      say: 'Zane and Bunny',      art: '10-zane-bunny' },
  { id: 'alexia-grumblor', say: 'Alexia and Grumblor', art: '13-alexia-grumblor' },
  { id: 'oliver-grumblor', say: 'Oliver and Grumblor', art: '23-oliver-grumblor' },
];

/* Board sizes, as clean rectangles. The grid is fixed rather than fitted to the
   screen: a tidy 4x3 reads as a board, whereas a ragged last row reads as a
   mistake. Orientation flips to whichever way round fits the screen better —
   4x3 in landscape is 3x4 in portrait, and both are still clean. */
export const SIZES = [
  { cards: 12, cols: 4, rows: 3, label: '4 x 3' },
  { cards: 16, cols: 4, rows: 4, label: '4 x 4' },
  { cards: 20, cols: 5, rows: 4, label: '5 x 4' },
  { cards: 28, cols: 7, rows: 4, label: '7 x 4' },
  { cards: 30, cols: 5, rows: 6, label: '5 x 6' },
  { cards: 36, cols: 6, rows: 6, label: '6 x 6' },
];

export const MIN_CARDS = SIZES[0].cards;
export const MAX_CARDS = SIZES[SIZES.length - 1].cards;

export function sizeFor(cards) {
  return SIZES.find((s) => s.cards === cards) || SIZES[0];
}

export function artUrl(name) { return `assets/cards/web/${name}.jpg`; }

function randomOf(list) { return list[Math.floor(Math.random() * list.length)]; }

/**
 * Build the design list for a board.
 *
 * `mixOutfits` picks a different outfit per character each game, so the board
 * feels new without the matching becoming unfair — still only one card per
 * character. Off, everyone wears their signature look.
 *
 * The largest boards need more designs than five characters and ten pairings
 * can supply. Only then are spare outfits added, which does put the same
 * character on two cards — acceptable on a 36-card board, which is well past
 * what a two-year-old plays, and never on the smaller ones.
 */
export function pickDesigns(cardCount, mixOutfits) {
  const need = cardCount / 2;
  const out = [];

  for (const c of CHARACTERS) {
    out.push({ id: c.id, say: c.say, art: mixOutfits ? randomOf(c.looks) : c.looks[0] });
    if (out.length === need) return out;
  }

  for (const p of PAIRS) {
    out.push(p);
    if (out.length === need) return out;
  }

  // Spare outfits, only if the board is bigger than the distinct cast allows.
  const used = new Set(out.map((d) => d.art));
  for (const c of CHARACTERS) {
    for (const look of c.looks) {
      if (used.has(look)) continue;
      out.push({ id: `${c.id}:${look}`, say: c.say, art: look });
      used.add(look);
      if (out.length === need) return out;
    }
  }
  return out;   // fewer than asked for only if the art runs out entirely
}

/** Every character with their signature look — for games that count or scatter them. */
export function characters() {
  return CHARACTERS.map((c) => ({ id: c.id, say: c.say, art: c.looks[0] }));
}

/** Every picture in the set, solo looks and pairs alike — for the jigsaw. */
export function allDesigns() {
  const solos = CHARACTERS.flatMap((c) => c.looks.map((art) => ({ say: c.say, art })));
  return [...solos, ...PAIRS.map((p) => ({ say: p.say, art: p.art }))];
}

/** Warm the browser cache so the first flip of a round is never a blank card. */
export function preload(designs) {
  for (const d of designs) new Image().src = artUrl(d.art);
  new Image().src = LOGO_URL;
}
