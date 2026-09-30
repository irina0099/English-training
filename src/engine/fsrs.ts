import type { CardState, Grade } from '../types';

/**
 * Spaced repetition on the FSRS-4.5 memory model.
 * Grades: 1 Again (wrong), 2 Hard (typo or slow), 3 Good, 4 Easy.
 */

const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461,
  2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
];
const DECAY = -0.5;
const FACTOR = 19 / 81;
/** Target probability of remembering an item on its due date. */
export const RETENTION = 0.9;
export const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const MAX_INTERVAL_DAYS = 365;
/** A forgotten item comes back within the same day. */
const RELEARN_DELAY = 10 * MINUTE;
/** Caps for the very first interval, so a new word is seen again soon. */
const FIRST_INTERVAL_CAP: Record<Grade, number> = { 1: 0, 2: 1, 3: 2, 4: 7 };

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Probability of recalling an item `days` after the last review. */
export function retrievability(days: number, stability: number): number {
  return Math.pow(1 + (FACTOR * Math.max(0, days)) / stability, DECAY);
}

/** Days until retrievability falls to RETENTION. */
export function intervalDays(stability: number): number {
  const days = (stability / FACTOR) * (Math.pow(RETENTION, 1 / DECAY) - 1);
  return clamp(Math.round(days), 1, MAX_INTERVAL_DAYS);
}

function initialDifficulty(g: Grade): number {
  return clamp(W[4] - (g - 3) * W[5], 1, 10);
}

function nextDifficulty(d: number, g: Grade): number {
  const next = d - W[6] * (g - 3);
  return clamp(W[7] * initialDifficulty(3) + (1 - W[7]) * next, 1, 10);
}

function recallStability(d: number, s: number, r: number, g: Grade): number {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  return (
    s *
    (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy)
  );
}

function forgetStability(d: number, s: number, r: number): number {
  const next = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  return Math.min(next, s);
}

/** Returns the new state after answering with grade `g` at time `now`. */
export function review(state: CardState | undefined, g: Grade, now: number): CardState {
  if (!state) {
    const s = W[g - 1];
    const days = Math.min(intervalDays(s), FIRST_INTERVAL_CAP[g]);
    return {
      s,
      d: initialDifficulty(g),
      reps: 1,
      lapses: g === 1 ? 1 : 0,
      last: now,
      due: g === 1 ? now + RELEARN_DELAY : now + days * DAY,
      ok: g === 1 ? 0 : 1,
    };
  }
  const elapsed = (now - state.last) / DAY;
  const r = retrievability(elapsed, state.s);
  const d = nextDifficulty(state.d, g);
  if (g === 1) {
    return {
      s: Math.max(0.1, forgetStability(state.d, state.s, r)),
      d,
      reps: state.reps + 1,
      lapses: state.lapses + 1,
      last: now,
      due: now + RELEARN_DELAY,
      ok: 0,
    };
  }
  const s = recallStability(state.d, state.s, r, g);
  return {
    s,
    d,
    reps: state.reps + 1,
    lapses: state.lapses,
    last: now,
    due: now + intervalDays(s) * DAY,
    ok: state.ok + 1,
  };
}

export type Stage = 'new' | 'learning' | 'known' | 'mastered';

/** How well an item is learnt, for progress bars and dictionary badges. */
export function stage(state: CardState | undefined): Stage {
  if (!state) return 'new';
  if (state.s >= 30) return 'mastered';
  if (state.s >= 7) return 'known';
  return 'learning';
}
