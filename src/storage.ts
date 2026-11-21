// Whether this browser could save the last change. Both stores report here, so the app can
// warn the learner when the storage is full instead of losing their work without a word.

const failing = new Set<string>();
const listeners = new Set<() => void>();

/** Called by a store after each save: `ok` is false when the browser refused it. */
export function reportSave(key: string, ok: boolean) {
  const was = failing.has(key);
  if (ok) failing.delete(key);
  else failing.add(key);
  if (was !== !ok) for (const fn of listeners) fn();
}

export function storageFull(): boolean {
  return failing.size > 0;
}

export function subscribeStorage(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** localStorage.setItem that reports whether it worked. */
export function saveItem(key: string, value: string): boolean {
  let ok = true;
  try {
    localStorage.setItem(key, value);
  } catch {
    ok = false;
  }
  reportSave(key, ok);
  return ok;
}
