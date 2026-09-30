import type { Item, Level, VocabItem } from '../types';
import { DRILLS } from './drills';
import { FAMILIES, PHRASAL } from './phrasal';
import { PHRASES } from './phrases';
import { RULES, RULES_BY_ID } from './rules';
import { WORDS_B1 } from './words-b1';
import { WORDS_B2 } from './words-b2';

export { DRILLS, FAMILIES, PHRASAL, PHRASES, RULES, RULES_BY_ID, WORDS_B1, WORDS_B2 };

export const VOCAB: VocabItem[] = [...WORDS_B1, ...WORDS_B2, ...PHRASAL, ...PHRASES];
export const BUILTIN: Item[] = [...VOCAB, ...DRILLS];

const BUILTIN_BY_ID = new Map<string, Item>(BUILTIN.map((item) => [item.id, item]));

export function findItem(id: string, custom: readonly VocabItem[]): Item | undefined {
  return BUILTIN_BY_ID.get(id) ?? custom.find((w) => w.id === id);
}

/** Everything the learner studies with the given levels: built-in items plus own words. */
export function activeItems(levels: readonly Level[], custom: readonly VocabItem[]): Item[] {
  return [...BUILTIN.filter((item) => item.level !== null && levels.includes(item.level)), ...custom];
}

export const LEVEL_LABEL: Record<Level, string> = { B1: 'B1', B2: 'B2' };
