import { describe, expect, it } from 'vitest';
import { DAY, intervalDays, retrievability, review, stage } from '../src/engine/fsrs';

const T0 = Date.UTC(2026, 0, 1);

describe('fsrs', () => {
  it('reaches 90% retrievability after one stability period', () => {
    expect(retrievability(10, 10)).toBeCloseTo(0.9, 5);
    expect(intervalDays(10)).toBe(10);
  });

  it('schedules a new item soon after the first answer', () => {
    const good = review(undefined, 3, T0);
    expect(good.reps).toBe(1);
    expect(good.due - T0).toBe(2 * DAY);
    const again = review(undefined, 1, T0);
    expect(again.lapses).toBe(1);
    expect(again.due - T0).toBeLessThan(DAY);
  });

  it('grows intervals with each successful review', () => {
    let st = review(undefined, 3, T0);
    let prevGap = st.due - T0;
    let now = T0;
    for (let i = 0; i < 5; i++) {
      now = st.due;
      st = review(st, 3, now);
      const gap = st.due - now;
      expect(gap).toBeGreaterThan(prevGap);
      prevGap = gap;
    }
    expect(stage(st)).not.toBe('learning');
  });

  it('shrinks stability and counts a lapse after a mistake', () => {
    let st = review(undefined, 3, T0);
    st = review(st, 3, st.due);
    st = review(st, 3, st.due);
    const lapsed = review(st, 1, st.due);
    expect(lapsed.s).toBeLessThan(st.s);
    expect(lapsed.lapses).toBe(st.lapses + 1);
    expect(lapsed.ok).toBe(0);
  });

  it('gives Hard a shorter interval than Easy', () => {
    const st = review(review(undefined, 3, T0), 3, T0 + 2 * DAY);
    const hard = review(st, 2, st.due);
    const easy = review(st, 4, st.due);
    expect(hard.due).toBeLessThan(easy.due);
  });
});
