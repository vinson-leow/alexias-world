/* Colours.
 *
 * Four balloons drift; a voice asks for one colour. The right balloon pops
 * with sparkles. A wrong one wobbles and is named — "That is blue. Find red!"
 * — which turns a miss into a second colour learned rather than a failure.
 * The prompt carries a swatch, so a child who does not yet know the word can
 * still match by eye. */

import { el, shuffle, pickFresh, sparkleFrom, wobble } from '../ui.js';
import { say, hush, sfx } from '../audio.js';
import { gameShell, pipRow } from '../shell.js';
import { beginGame, action } from '../log.js';

const COLOURS = [
  { id: 'red',    say: 'Red',    hex: '#FF5E5E' },
  { id: 'blue',   say: 'Blue',   hex: '#4FB8F0' },
  { id: 'yellow', say: 'Yellow', hex: '#FFD23F' },
  { id: 'green',  say: 'Green',  hex: '#5FC97C' },
  { id: 'purple', say: 'Purple', hex: '#A98BEA' },
  { id: 'orange', say: 'Orange', hex: '#FF9F45' },
  { id: 'pink',   say: 'Pink',   hex: '#FF8DC7' },
];

const ROUNDS = 6;
const PRAISE = ['Yes!', 'That is right!', 'Well done!', 'You found it!'];

export function coloursScene(go) {
  let round = 0;
  let target = null;
  let busy = false;

  const swatch = el('span', { class: 'colour-swatch' });
  const ask = el('span', { class: 'game-title' }, 'Find the colour');
  const prompt = el('div', { class: 'colour-prompt' }, swatch, ask);
  const sky = el('div', { class: 'balloon-sky' });

  const pips = pipRow(ROUNDS);
  const { scene, body, celebrate } = gameShell(go, { middle: pips.row, onNew: startGame });
  body.append(prompt, sky);

  function startGame() {
    round = 0;
    pips.paint(0);
    beginGame('colours', { rounds: ROUNDS });
    startRound(true);
  }

  function startRound(first = false) {
    hush();
    busy = false;
    const four = shuffle(COLOURS).slice(0, 4);
    target = pickFresh(four, target);
    swatch.style.background = target.hex;
    ask.textContent = `Find ${target.say.toLowerCase()}`;

    sky.replaceChildren();
    for (const c of four) {
      const balloon = el('button', { class: 'balloon', 'aria-label': `${c.say} balloon` });
      balloon.style.setProperty('--c', c.hex);
      balloon.style.animationDelay = `${-Math.random() * 3}s`;
      balloon.style.animationDuration = `${2.6 + Math.random() * 1.4}s`;
      balloon.onclick = () => choose(c, balloon);
      sky.append(balloon);
    }

    setTimeout(() => say(first ? `Find the ${target.say} balloon!` : `Now find ${target.say}!`), first ? 400 : 200);
  }

  function choose(c, balloon) {
    if (busy) return;
    if (c.id !== target.id) {
      action('pick', { correct: false, colour: c.id, target: target.id });
      sfx.nomatch();
      wobble(balloon);
      say(`That is ${c.say}. Find ${target.say}!`);
      return;
    }
    action('pick', { correct: true, colour: c.id, target: target.id });
    busy = true;
    balloon.classList.add('pop');
    sfx.match();
    sparkleFrom(balloon);
    say(`${target.say}! ${PRAISE[round % PRAISE.length]}`);

    round += 1;
    pips.paint(round);
    if (round >= ROUNDS) {
      setTimeout(() => celebrate({
        headline: 'You know your colours!',
        spoken: 'You know your colours! Hooray!',
        stats: { rounds: ROUNDS },
        onAgain: startGame,
      }), 1200);
    } else {
      setTimeout(() => startRound(), 1500);
    }
  }

  startGame();
  return scene;
}
