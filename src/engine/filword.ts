import { lettersOnly } from './check';
import { shuffle, type Rng } from './random';

/**
 * Филворд: a square grid completely filled by hidden words.
 * Each word is a chain of cells that touch by a side and may turn at right angles;
 * every letter of the grid belongs to exactly one word.
 */

export interface PoolWord {
  word: string;
  itemId: string;
  clue: string;
}

export interface Placement extends PoolWord {
  /** Cell indexes (row * size + col) in reading order. */
  cells: number[];
}

export interface Filword {
  size: number;
  letters: string[];
  words: Placement[];
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY: Record<Difficulty, { size: number; min: number; max: number; label: string }> = {
  easy: { size: 5, min: 3, max: 6, label: 'Лёгкий · 5×5' },
  medium: { size: 6, min: 3, max: 7, label: 'Средний · 6×6' },
  hard: { size: 7, min: 4, max: 9, label: 'Сложный · 7×7' },
};

export function neighbours(cell: number, size: number): number[] {
  const r = Math.floor(cell / size);
  const c = cell % size;
  const out: number[] = [];
  if (r > 0) out.push(cell - size);
  if (r < size - 1) out.push(cell + size);
  if (c > 0) out.push(cell - 1);
  if (c < size - 1) out.push(cell + 1);
  return out;
}

export function adjacent(a: number, b: number, size: number): boolean {
  return neighbours(a, size).includes(b);
}

/**
 * A random path through every cell, made by "backbite" moves on a snake-shaped start path.
 */
export function hamiltonianPath(size: number, rng: Rng, iterations = size * size * 60): number[] {
  const path: number[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) path.push(r * size + (r % 2 === 0 ? c : size - 1 - c));
  }
  const pos = new Int32Array(size * size);
  const reindex = (from: number, to: number) => {
    for (let i = from; i <= to; i++) pos[path[i]] = i;
  };
  reindex(0, path.length - 1);
  const last = path.length - 1;
  for (let it = 0; it < iterations; it++) {
    if (rng() < 0.5) {
      path.reverse();
      reindex(0, last);
    }
    const end = path[last];
    const options = neighbours(end, size);
    const next = options[Math.floor(rng() * options.length)];
    const i = pos[next];
    if (i === last - 1) continue;
    // Connect the end to `next` and reverse the tail after it.
    let a = i + 1;
    let b = last;
    while (a < b) {
      [path[a], path[b]] = [path[b], path[a]];
      a++;
      b--;
    }
    reindex(i + 1, last);
  }
  return path;
}

/** Splits `total` into word lengths that the pool can actually supply. */
export function partition(total: number, counts: Map<number, number>, min: number, max: number, rng: Rng): number[] | null {
  for (let attempt = 0; attempt < 300; attempt++) {
    const used = new Map<number, number>();
    const parts: number[] = [];
    let rest = total;
    while (rest > 0) {
      const options: number[] = [];
      for (let len = min; len <= Math.min(max, rest); len++) {
        const left = rest - len;
        if (left !== 0 && left < min) continue;
        if ((counts.get(len) ?? 0) - (used.get(len) ?? 0) <= 0) continue;
        // Mid-length words make the nicest puzzles.
        const weight = len >= 4 && len <= 7 ? 3 : 1;
        for (let k = 0; k < weight; k++) options.push(len);
      }
      if (!options.length) break;
      const len = options[Math.floor(rng() * options.length)];
      parts.push(len);
      used.set(len, (used.get(len) ?? 0) + 1);
      rest -= len;
    }
    if (rest === 0) return parts;
  }
  return null;
}

/** Keeps single words of usable length, one entry per spelling. */
export function preparePool(words: readonly PoolWord[], min: number, max: number): PoolWord[] {
  const seen = new Set<string>();
  const out: PoolWord[] = [];
  for (const w of words) {
    if (/[^a-zA-Z]/.test(w.word)) continue;
    const letters = lettersOnly(w.word);
    if (letters.length < min || letters.length > max || seen.has(letters)) continue;
    seen.add(letters);
    out.push({ ...w, word: letters });
  }
  return out;
}

/**
 * Builds a puzzle from the pool. Words whose ids are in `preferred` (the learner's
 * own or difficult words) are used first whenever their length fits.
 */
export function generateFilword(words: readonly PoolWord[], difficulty: Difficulty, rng: Rng, preferred?: ReadonlySet<string>): Filword | null {
  const { size, min, max } = DIFFICULTY[difficulty];
  const prepared = preparePool(words, min, max);
  const pool = preferred
    ? [...shuffle(prepared.filter((w) => preferred.has(w.itemId)), rng), ...shuffle(prepared.filter((w) => !preferred.has(w.itemId)), rng)]
    : shuffle(prepared, rng);
  const counts = new Map<number, number>();
  for (const w of pool) counts.set(w.word.length, (counts.get(w.word.length) ?? 0) + 1);
  const lengths = partition(size * size, counts, min, max, rng);
  if (!lengths) return null;

  const path = hamiltonianPath(size, rng);
  const letters = new Array<string>(size * size).fill('');
  const placed: Placement[] = [];
  const usedWords = new Set<string>();
  let offset = 0;
  for (const len of lengths) {
    const word = pool.find((w) => w.word.length === len && !usedWords.has(w.word))!;
    usedWords.add(word.word);
    let cells = path.slice(offset, offset + len);
    if (rng() < 0.5) cells = cells.reverse();
    cells.forEach((cell, i) => (letters[cell] = word.word[i]));
    placed.push({ ...word, cells });
    offset += len;
  }
  return { size, letters, words: placed };
}

/** How many words of fitting length a pool has — the UI warns when there are too few. */
export function poolSize(words: readonly PoolWord[], difficulty: Difficulty): number {
  const { min, max } = DIFFICULTY[difficulty];
  return preparePool(words, min, max).length;
}
