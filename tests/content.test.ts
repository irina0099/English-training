import { describe, expect, it } from 'vitest';
import { BUILTIN, DRILLS, PHRASES, RULES, RULES_BY_ID, VOCAB } from '../src/content';
import { NO_ARTICLE } from '../src/content/drills';
import { normalize } from '../src/engine/check';

describe('content', () => {
  it('has unique ids', () => {
    const ids = BUILTIN.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
  });

  it('marks the target in every example and translates it', () => {
    for (const v of VOCAB) {
      expect(v.ex, v.en).toMatch(/\*[^*]+\*/);
      expect(v.exRu, v.en).toBeTruthy();
      expect(v.ru, v.en).toBeTruthy();
      expect((v.ex!.match(/\*/g) ?? []).length % 2, v.en).toBe(0);
    }
  });

  it('links only to existing rules', () => {
    for (const item of BUILTIN) {
      if (item.rule) expect(RULES_BY_ID[item.rule], `${item.id} → ${item.rule}`).toBeDefined();
    }
  });

  it('has a situation for every phrase', () => {
    for (const p of PHRASES) expect(p.sit, p.en).toBeTruthy();
  });

  it('keeps drills unambiguous', () => {
    for (const d of DRILLS) {
      if (!d.fix) expect(d.q, d.id).toContain('___');
      expect(d.wrong.length, d.id).toBeGreaterThan(0);
      const answers = [d.a, ...(d.alt ?? [])].map(normalize);
      for (const w of d.wrong) expect(answers, `${d.id}: ${w}`).not.toContain(normalize(w));
      if (d.a === NO_ARTICLE) expect(d.typeable, d.id).toBe(false);
    }
  });

  it('has drills for every rule and several items per level', () => {
    for (const r of RULES) expect(DRILLS.some((d) => d.rule === r.id), r.id).toBe(true);
    for (const level of ['B1', 'B2'] as const) {
      expect(VOCAB.filter((v) => v.level === level).length).toBeGreaterThan(100);
      expect(DRILLS.filter((d) => d.level === level).length).toBeGreaterThan(20);
    }
  });
});
