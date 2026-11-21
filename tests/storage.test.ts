import { afterEach, describe, expect, it } from 'vitest';
import { saveItem, storageFull, subscribeStorage } from '../src/storage';

const setStorage = (setItem: (k: string, v: string) => void) =>
  ((globalThis as unknown as { localStorage: unknown }).localStorage = { setItem });

afterEach(() => {
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
});

describe('storage health', () => {
  it('tells the app when the browser refuses to save, and when it saves again', () => {
    let calls = 0;
    const off = subscribeStorage(() => calls++);
    setStorage(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(saveItem('a', 'x')).toBe(false);
    expect(storageFull()).toBe(true);
    // Failing again changes nothing: no new notice.
    saveItem('a', 'x');
    expect(calls).toBe(1);

    setStorage(() => {});
    expect(saveItem('a', 'x')).toBe(true);
    expect(storageFull()).toBe(false);
    expect(calls).toBe(2);
    off();
  });

  it('stays full while any store still fails', () => {
    setStorage((k) => {
      if (k === 'notes') throw new DOMException('full', 'QuotaExceededError');
    });
    saveItem('notes', 'x');
    saveItem('progress', 'x');
    expect(storageFull()).toBe(true);
    setStorage(() => {});
    saveItem('notes', 'x');
    expect(storageFull()).toBe(false);
  });

  it('counts a blocked storage as full', () => {
    // No localStorage at all, as in some private or embedded views.
    expect(saveItem('b', 'x')).toBe(false);
    expect(storageFull()).toBe(true);
    setStorage(() => {});
    saveItem('b', 'x');
  });
});
