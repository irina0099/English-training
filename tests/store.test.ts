import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, defaultData, getData, importJson, MAX_CUSTOM_WORDS, replaceData, sanitize, saveCustomWord, saveCustomWords } from '../src/engine/store';
import type { VocabItem } from '../src/types';

const word = (id: string): VocabItem => ({ id, kind: 'word', en: id, ru: id, level: null, custom: true });

afterEach(() => replaceData(defaultData()));

describe('sanitize', () => {
  it('drops cards that would break the schedule and fills in missing counters', () => {
    const d = sanitize({
      states: {
        good: { due: 1, s: 2, d: 5 },
        noDue: { s: 2, d: 5 },
        nanStability: { due: 1, s: 'x', d: 5 },
        notAnObject: 7,
      },
    });
    expect(Object.keys(d.states)).toEqual(['good']);
    expect(d.states.good).toEqual({ due: 1, s: 2, d: 5, reps: 0, lapses: 0, last: 0, ok: 0 });
  });

  it('repairs mistakes and words where it can and drops the rest', () => {
    const d = sanitize({
      mistakes: [{ id: 'a', at: 5 }, { id: 'b' }, null, 'x'],
      custom: [{ id: 'w', en: 'kettle' }, { en: 'no id' }, { id: 'x' }],
    });
    expect(d.mistakes).toEqual([{ id: 'a', at: 5, given: '', expected: '', ex: 'card', cat: 'vocab' }]);
    expect(d.custom).toEqual([{ id: 'w', en: 'kettle', ru: '' }]);
  });

  it('falls back to defaults for settings of the wrong type or out of range', () => {
    const d = sanitize({ settings: { sessionSize: 'abc', newPerDay: -3, autoSpeak: 'yes', levels: ['B2', 'C1', 'B2'] } });
    expect(d.settings).toEqual({ ...DEFAULT_SETTINGS, levels: ['B2'] });
  });

  it('keeps valid days and rule stats only', () => {
    const d = sanitize({ days: { '2026-01-01': { n: 3, ok: 2, new: 1 }, bad: { ok: 1 } }, ruleStats: { r: { n: 2, e: 1 }, q: {} } });
    expect(d.days).toEqual({ '2026-01-01': { n: 3, ok: 2, new: 1 } });
    expect(d.ruleStats).toEqual({ r: { n: 2, e: 1 } });
  });

  it('keeps everything in a sound backup', () => {
    const backup = {
      v: 1,
      states: { a: { due: 10, s: 3, d: 4, reps: 2, lapses: 1, last: 5, ok: 1 } },
      mistakes: [{ id: 'a', at: 5, given: 'x', expected: 'y', ex: 'type-en', cat: 'spelling' }],
      custom: [{ id: 'w', kind: 'word', en: 'kettle', ru: 'чайник', level: null, custom: true }],
      settings: { ...DEFAULT_SETTINGS, sessionSize: 20 },
      days: { '2026-01-01': { n: 3, ok: 2, new: 1, lessons: 1 } },
      ruleStats: { r: { n: 2, e: 1 } },
      stamps: { progress: 1, mistakes: 2, words: 3 },
    };
    const d = importJson(JSON.stringify(backup));
    expect({ ...d, stamps: backup.stamps }).toEqual(backup);
  });
});

describe('own words', () => {
  it('refuses a new word when the list is full, but still updates saved ones', () => {
    replaceData({ ...defaultData(), custom: Array.from({ length: MAX_CUSTOM_WORDS }, (_, i) => word(`w${i}`)) });
    expect(saveCustomWord(word('new'))).toBe(false);
    expect(getData().custom.some((w) => w.id === 'new')).toBe(false);
    expect(saveCustomWord({ ...word('w0'), ru: 'другое' })).toBe(true);
    expect(getData().custom[0].ru).toBe('другое');
  });

  it('adds a list of words once each and only as many as fit', () => {
    replaceData({ ...defaultData(), custom: Array.from({ length: MAX_CUSTOM_WORDS - 2 }, (_, i) => word(`w${i}`)) });
    const added = saveCustomWords([word('w0'), word('a'), word('a'), word('b'), word('c')]);
    expect(added).toBe(2);
    expect(getData().custom.slice(-2).map((w) => w.id)).toEqual(['a', 'b']);
  });
});
