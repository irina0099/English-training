import { describe, expect, it } from 'vitest';
import { activeItems, FAMILIES, VOCAB } from '../src/content';
import { makeRng } from '../src/engine/random';
import { checkExercise, makeExercise, particleParts, planItems, type SessionContext } from '../src/engine/session';
import type { CardState } from '../src/types';

const NOW = Date.UTC(2026, 5, 1, 12);
const known = (s: number): CardState => ({ due: NOW - 1, s, d: 5, reps: 4, lapses: 0, last: NOW - s * 86400000, ok: 3 });

describe('vocabulary', () => {
  it('has no word or phrase twice', () => {
    const seen = new Map<string, string>();
    for (const v of VOCAB) {
      const key = v.en.toLowerCase().replace(/[^a-z ]/g, '').trim();
      expect(seen.get(key), `${v.id} repeats ${seen.get(key)}`).toBeUndefined();
      seen.set(key, v.id);
    }
  });

  it('keeps a large B1 and B2 base', () => {
    const count = (level: string, kind: string) => VOCAB.filter((v) => v.level === level && v.kind === kind).length;
    expect(count('B1', 'word')).toBeGreaterThan(250);
    expect(count('B2', 'word')).toBeGreaterThan(220);
    expect(VOCAB.filter((v) => v.kind === 'phrase').length).toBeGreaterThan(80);
  });
});

describe('phrasal verb families', () => {
  it('groups every phrasal verb under its base verb', () => {
    for (const f of FAMILIES) {
      expect(f.items.length, f.verb).toBeGreaterThan(0);
      for (const v of f.items) {
        expect(v.en.split(' ')[0], v.en).toBe(f.verb);
        expect(v.family).toBe(f.verb);
        expect(v.pos).toBe('phr v');
      }
    }
    expect(FAMILIES.flatMap((f) => f.items).length).toBeGreaterThan(120);
  });

  it('can blank the particle in every example', () => {
    const failing = FAMILIES.flatMap((f) => f.items)
      .filter((v) => !particleParts(v))
      .map((v) => v.en);
    // "let go" has no particle to choose.
    expect(failing).toEqual(['let go']);
  });

  it('builds a choose-the-particle task with the family’s own particles', () => {
    const getOver = FAMILIES.find((f) => f.verb === 'get')!.items.find((v) => v.en === 'get over')!;
    let found = false;
    for (let seed = 0; seed < 40 && !found; seed++) {
      const ex = makeExercise(getOver, known(3), { vocab: VOCAB, rng: makeRng(seed) });
      if (ex.t !== 'particle') continue;
      found = true;
      expect(ex.verb.toLowerCase()).toBe('get');
      expect(ex.answer).toBe('over');
      expect(ex.options).toHaveLength(4);
      expect(new Set(ex.options).size).toBe(4);
      expect(ex.options).toContain('over');
      expect(checkExercise(ex, 'over').verdict).toBe('ok');
      expect(checkExercise(ex, 'up').verdict).toBe('wrong');
    }
    expect(found).toBe(true);
  });

  it('handles a verb split by its object', () => {
    const pickUp = VOCAB.find((v) => v.en === 'pick up')!;
    expect(particleParts(pickUp)).toMatchObject({ verb: 'pick', middle: ' you ', answer: 'up' });
  });

  it('practises one family on its own', () => {
    const get = FAMILIES.find((f) => f.verb === 'get')!;
    const ids = get.items.map((i) => i.id);
    const ctx: SessionContext = {
      items: activeItems(['B1', 'B2'], []),
      vocab: VOCAB,
      states: {},
      mistakes: [],
      now: NOW,
      size: 30,
      newLeft: 0,
      rng: makeRng(1),
    };
    const plan = planItems({ kind: 'set', title: 'get', ids }, ctx);
    expect(plan.map((i) => i.id).sort()).toEqual([...ids].sort());
  });
});
