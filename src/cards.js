/* The deck.
 *
 * Card order here IS the difficulty curve: the deck grows from the top down, so
 * the first four are the four characters alone — maximally distinct — and the
 * rest are two-character cards.
 *
 * Why no second solo outfit in the deck: a toddler matches by *character*, not
 * by image. Putting "Zane in denim" and "Zane at the beach" in the same deck
 * means she taps both Zanes, is told no, and is right to feel cheated. The
 * alternate outfits are still used — see ALT below — but never alongside their
 * twin.
 */

export const DECK = [
  { id: 'zane',            say: 'Zane',                  art: '01-zane-denim',     alt: '02-zane-beach' },
  { id: 'alexia',          say: 'Alexia',                art: '03-alexia-cardigan',alt: '04-alexia-island' },
  { id: 'bunny',           say: 'Bunny',                 art: '05-bunny-cape',     alt: '06-bunny-hood' },
  { id: 'grumblor',        say: 'Grumblor',              art: '07-grumblor-hug',   alt: '08-grumblor-scarf' },
  { id: 'zane-alexia',     say: 'Zane and Alexia',       art: '09-zane-alexia' },
  { id: 'alexia-bunny',    say: 'Alexia and Bunny',      art: '12-alexia-bunny' },
  { id: 'zane-grumblor',   say: 'Zane and Grumblor',     art: '11-zane-grumblor' },
  { id: 'bunny-grumblor',  say: 'Bunny and Grumblor',    art: '14-bunny-grumblor' },
  { id: 'zane-bunny',      say: 'Zane and Bunny',        art: '10-zane-bunny' },
  { id: 'alexia-grumblor', say: 'Alexia and Grumblor',   art: '13-alexia-grumblor' },
];

export const MIN_CARDS = 8;
export const MAX_CARDS = 20;   // 10 pairs — the whole deck

export function artUrl(name) { return `assets/cards/web/${name}.jpg`; }

/** The first N/2 designs, honouring the alternate-outfit setting. */
export function pickDesigns(cardCount, useAlt) {
  return DECK.slice(0, cardCount / 2).map((d) => ({
    ...d,
    art: useAlt && d.alt ? d.alt : d.art,
  }));
}

/** Warm the browser cache so the first flip of a round is never a blank card. */
export function preload(designs) {
  for (const d of designs) new Image().src = artUrl(d.art);
}
