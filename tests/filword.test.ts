import { describe, expect, it } from 'vitest';
import { WORDS_B1, WORDS_B2 } from '../src/content';
import { adjacent, DIFFICULTY, generateFilword, hamiltonianPath, type Difficulty, type PoolWord } from '../src/engine/filword';
import { makeRng } from '../src/engine/random';

const toPool = (words: typeof WORDS_B1): PoolWord[] => words.map((w) => ({ word: w.en, itemId: w.id, clue: w.ru }));

describe('hamiltonianPath', () => {
  it('visits every cell once through side-adjacent steps', () => {
    for (const size of [5, 6, 7]) {
      const path = hamiltonianPath(size, makeRng(size));
      expect(new Set(path).size).toBe(size * size);
      for (let i = 1; i < path.length; i++) expect(adjacent(path[i - 1], path[i], size)).toBe(true);
    }
  });
});

describe('generateFilword', () => {
  const levels: [string, PoolWord[]][] = [
    ['B1', toPool(WORDS_B1)],
    ['B2', toPool(WORDS_B2)],
  ];
  for (const [level, pool] of levels) {
    for (const difficulty of Object.keys(DIFFICULTY) as Difficulty[]) {
      it(`fills the whole ${difficulty} grid with ${level} words`, () => {
        for (let seed = 1; seed <= 15; seed++) {
          const game = generateFilword(pool, difficulty, makeRng(seed * 7919));
          expect(game).not.toBeNull();
          const { size, letters, words } = game!;
          expect(size).toBe(DIFFICULTY[difficulty].size);
          const covered = words.flatMap((w) => w.cells);
          expect(covered.length).toBe(size * size);
          expect(new Set(covered).size).toBe(size * size);
          expect(new Set(words.map((w) => w.word)).size).toBe(words.length);
          for (const w of words) {
            expect(w.cells.map((c) => letters[c]).join('')).toBe(w.word);
            for (let i = 1; i < w.cells.length; i++) expect(adjacent(w.cells[i - 1], w.cells[i], size)).toBe(true);
          }
        }
      });
    }
  }

  it('gives up on a pool that is too small', () => {
    const tiny: PoolWord[] = [{ word: 'cat', itemId: 'x', clue: 'кот' }];
    expect(generateFilword(tiny, 'easy', makeRng(1))).toBeNull();
  });

  it('skips phrasal verbs and repeats', () => {
    const pool: PoolWord[] = [
      { word: 'give up', itemId: 'a', clue: '' },
      { word: 'house', itemId: 'b', clue: '' },
      { word: 'House', itemId: 'c', clue: '' },
    ];
    const game = generateFilword([...pool, ...toPool(WORDS_B1)], 'easy', makeRng(3));
    expect(game!.words.every((w) => /^[a-z]+$/.test(w.word))).toBe(true);
  });
});

describe('preferred words', () => {
  it('uses the preferred words first', () => {
    const pool = toPool(WORDS_B1);
    const mine = new Set(pool.filter((w) => /^[a-z]{4,6}$/.test(w.word)).slice(0, 3).map((w) => w.itemId));
    for (let seed = 1; seed <= 10; seed++) {
      const game = generateFilword(pool, 'medium', makeRng(seed), mine)!;
      const used = game.words.filter((w) => mine.has(w.itemId)).length;
      expect(used).toBeGreaterThanOrEqual(1);
    }
  });
});
