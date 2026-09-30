import type { Verdict } from '../types';

const CONTRACTIONS: [RegExp, string][] = [
  [/\bwon't\b/g, 'will not'],
  [/\bcan't\b/g, 'cannot'],
  [/\bshan't\b/g, 'shall not'],
  [/\bcan not\b/g, 'cannot'],
  [/n't\b/g, ' not'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'ll\b/g, ' will'],
  [/'d\b/g, ' would'],
  [/\bi'm\b/g, 'i am'],
  [/\blet's\b/g, 'let us'],
];

/**
 * Lower-case, unify quotes, expand contractions and drop punctuation,
 * so "I'm fine." and "i am fine" compare equal.
 */
export function normalize(text: string): string {
  let t = text
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\*/g, '');
  for (const [re, to] of CONTRACTIONS) t = t.replace(re, to);
  return t
    .replace(/[^a-z0-9'\- ]+/g, ' ')
    .replace(/(^|\s)['-]+|['-]+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Maps British spellings to American ones so either is accepted. */
function unifySpelling(text: string): string {
  return text
    .split(' ')
    .map((w) =>
      w
        .replace(/isation$/, 'ization')
        .replace(/is(e|ed|es|ing)$/, (_m, end) => `iz${end}`)
        .replace(/^(.{3,})our(s?)$/, '$1or$2')
        .replace(/^(.{2,})tre(s?)$/, '$1ter$2')
        .replace(/^(.{3,})ogue(s?)$/, '$1og$2'),
    )
    .join(' ');
}

/** Drops "to" before verbs and articles before nouns for lenient vocabulary checks. */
function stripParticles(text: string): string {
  return text.replace(/^(to|a|an|the) /, '');
}

/** Damerau–Levenshtein distance (optimal string alignment). */
export function distance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[rows - 1][cols - 1];
}

export interface CheckOptions {
  /** Vocabulary mode: ignore leading "to"/articles and accept small typos. */
  lenient?: boolean;
}

/**
 * Compares a typed answer with the accepted answers.
 * Grammar drills use strict mode: "in" vs "on" or "make" vs "made" is a real mistake, not a typo.
 */
export function checkAnswer(given: string, accepted: readonly string[], opts: CheckOptions = {}): Verdict {
  const prep = (s: string) => {
    const n = unifySpelling(normalize(s));
    return opts.lenient ? stripParticles(n) : n;
  };
  const g = prep(given);
  if (!g) return 'wrong';
  const targets = accepted.map(prep);
  if (targets.includes(g)) return 'ok';
  if (!opts.lenient) return 'wrong';
  for (const t of targets) {
    const allowed = t.length >= 8 ? 2 : t.length >= 4 ? 1 : 0;
    if (allowed > 0 && distance(g, t) <= allowed) return 'typo';
  }
  return 'wrong';
}

/** Letters-only form used by word games. */
export function lettersOnly(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, '');
}
