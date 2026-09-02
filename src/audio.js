/* Sound. Two sources, no audio files to ship:
   - speechSynthesis names every card aloud, because the player cannot read
   - WebAudio oscillators for chimes, so feedback lands instantly */

import { settings } from './state.js';

let ctx = null;
let master = null;
let voice = null;
let voicesReady = false;

/** Must run inside a real user gesture — browsers block audio otherwise. */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.28;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }
}

function pickVoice() {
  if (!window.speechSynthesis) return;
  const all = window.speechSynthesis.getVoices();
  if (!all.length) return;
  voicesReady = true;
  const english = all.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
  const pool = english.length ? english : all;
  const favourites = ['samantha', 'karen', 'moira', 'tessa', 'google uk english female', 'zira'];
  voice =
    pool.find((v) => favourites.some((f) => v.name.toLowerCase().includes(f))) ||
    pool.find((v) => /female/i.test(v.name)) ||
    pool[0];
}

/** Speak a line. Later calls interrupt earlier ones so taps stay responsive. */
export function say(text, { rate = 0.85, pitch = 1.2 } = {}) {
  if (!settings.narration || !window.speechSynthesis || !text) return;
  try {
    window.speechSynthesis.cancel();
    if (!voicesReady) pickVoice();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    u.volume = settings.volume;
    window.speechSynthesis.speak(u);
  } catch { /* speech is a bonus, never a blocker */ }
}

export function hush() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function tone(freq, start, dur, type = 'sine', gain = 1) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  env.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * settings.volume), ctx.currentTime + start + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(env).connect(master);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

const N = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99, A: 880, C2: 1046.5, E2: 1318.5, G2: 1568 };

export const sfx = {
  flip()    { tone(N.E, 0, 0.1, 'triangle', 0.4); },
  pick()    { tone(N.G, 0, 0.1, 'sine', 0.45); tone(N.C2, 0.06, 0.14, 'sine', 0.35); },
  match()   { [N.C, N.E, N.G, N.C2].forEach((n, i) => tone(n, i * 0.08, 0.3, 'triangle', 0.45)); },
  nomatch() { tone(N.D, 0, 0.14, 'sine', 0.22); tone(N.C, 0.09, 0.18, 'sine', 0.18); },
  win()     { [N.C, N.E, N.G, N.C2, N.E2, N.G2].forEach((n, i) => tone(n, i * 0.1, 0.45, 'triangle', 0.5)); },
  tap()     { tone(N.G, 0, 0.09, 'sine', 0.4); },
};
