import { RULES_BY_ID } from '../content/rules';
import type { CardState, Mistake } from '../types';
import { DAY } from './fsrs';

/** A mistake counts half as much after a week, so the trainer focuses on what is hard now. */
export const HALF_LIFE_DAYS = 7;
export const MAX_MISTAKES = 600;
/** Correct answers in a row after which a mistake counts as fixed. */
export const FIXED_AFTER = 3;

export function mistakeWeight(m: Mistake, now: number): number {
  const base = m.cat === 'spelling' ? 0.5 : 1;
  return base * Math.pow(0.5, Math.max(0, now - m.at) / DAY / HALF_LIFE_DAYS);
}

export interface ItemMistakes {
  id: string;
  count: number;
  weight: number;
  lastAt: number;
  lastGiven: string;
  expected: string;
  cat: string;
}

export function mistakesByItem(mistakes: readonly Mistake[], now: number): Map<string, ItemMistakes> {
  const out = new Map<string, ItemMistakes>();
  for (const m of mistakes) {
    const cur = out.get(m.id);
    const w = mistakeWeight(m, now);
    if (!cur) {
      out.set(m.id, { id: m.id, count: 1, weight: w, lastAt: m.at, lastGiven: m.given, expected: m.expected, cat: m.cat });
    } else {
      cur.count += 1;
      cur.weight += w;
      if (m.at >= cur.lastAt) {
        cur.lastAt = m.at;
        cur.lastGiven = m.given;
        cur.expected = m.expected;
        cur.cat = m.cat;
      }
    }
  }
  return out;
}

export interface CategoryMistakes {
  cat: string;
  count: number;
  weight: number;
}

export function mistakesByCategory(mistakes: readonly Mistake[], now: number): CategoryMistakes[] {
  const out = new Map<string, CategoryMistakes>();
  for (const m of mistakes) {
    const cur = out.get(m.cat) ?? { cat: m.cat, count: 0, weight: 0 };
    cur.count += 1;
    cur.weight += mistakeWeight(m, now);
    out.set(m.cat, cur);
  }
  return [...out.values()].sort((a, b) => b.weight - a.weight);
}

export function isFixed(state: CardState | undefined): boolean {
  return (state?.ok ?? 0) >= FIXED_AFTER;
}

export function categoryLabel(cat: string): string {
  if (cat === 'vocab') return 'Word meanings';
  if (cat === 'spelling') return 'Spelling';
  if (cat === 'games') return 'Words from games';
  return RULES_BY_ID[cat]?.title ?? cat;
}

export function appendMistake(list: Mistake[], m: Mistake): Mistake[] {
  const next = [...list, m];
  return next.length > MAX_MISTAKES ? next.slice(next.length - MAX_MISTAKES) : next;
}
