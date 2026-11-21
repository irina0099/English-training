import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, importJson, sanitize } from '../src/engine/store';

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
