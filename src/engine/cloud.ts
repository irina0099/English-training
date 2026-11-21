import type { AppData } from '../types';
import { getData, onLocalChange, replaceData, sanitize, type Section } from './store';

/**
 * Optional sync for the copy published on claude.ai: progress is kept in the
 * viewer's private storage there, so it follows them between devices.
 * Anywhere else (GitHub Pages, local dev) this does nothing and data stays in localStorage.
 */

interface DocSnap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface DocRef {
  get(): Promise<DocSnap>;
  set(body: Record<string, unknown>): Promise<void>;
}
interface Db {
  collection(path: string): { doc(id: string): DocRef };
}
interface UserCap {
  id(): Promise<string | null>;
}
interface ClaudeRuntime {
  use(name: string): Promise<unknown>;
}

export type CloudStatus = 'local' | 'connecting' | 'synced' | 'error';

const SECTIONS: Section[] = ['progress', 'mistakes', 'words'];
const WRITE_DELAY = 1500;
/** After a failed write: try again in 5 s, then 10, 20… up to a minute. */
const RETRY_DELAY = 5000;
const MAX_RETRY_DELAY = 60_000;

function payload(d: AppData, s: Section): Record<string, unknown> {
  switch (s) {
    case 'progress':
      return { updatedAt: d.stamps.progress, states: d.states, settings: d.settings, days: d.days, ruleStats: d.ruleStats };
    case 'mistakes':
      return { updatedAt: d.stamps.mistakes, list: d.mistakes };
    case 'words':
      return { updatedAt: d.stamps.words, list: d.custom };
  }
}

function merge(d: AppData, s: Section, body: Record<string, unknown>): AppData {
  const at = Number(body.updatedAt) || 0;
  switch (s) {
    case 'progress':
      return sanitize({ ...d, states: body.states, settings: body.settings, days: body.days, ruleStats: body.ruleStats, stamps: { ...d.stamps, progress: at } });
    case 'mistakes':
      return sanitize({ ...d, mistakes: body.list, stamps: { ...d.stamps, mistakes: at } });
    case 'words':
      return sanitize({ ...d, custom: body.list, stamps: { ...d.stamps, words: at } });
  }
}

export async function startCloudSync(onStatus: (s: CloudStatus) => void): Promise<void> {
  const runtime = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!runtime?.use) return;
  onStatus('connecting');
  let off: (() => void) | undefined;
  try {
    const [db, user] = (await Promise.all([runtime.use('db'), runtime.use('user')])) as [Db | null, UserCap | null];
    const uid = db && user ? await user.id() : null;
    if (!db || !uid) {
      onStatus('local');
      return;
    }
    const docs = db.collection(`data/users/${uid}`);
    const written: Record<Section, number> = { progress: 0, mistakes: 0, words: 0 };

    const write = async (s: Section) => {
      const d = getData();
      if (d.stamps[s] <= written[s]) return;
      const stamp = d.stamps[s];
      await docs.doc(s).set(payload(d, s));
      written[s] = stamp;
    };

    // Listen before the first read: answers given while we connect must reach the cloud too.
    // Writes are coalesced and go one at a time, as the store asks.
    const pending = new Set<Section>();
    let ready = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let chain = Promise.resolve();
    let retries = 0;
    const flush = () => {
      clearTimeout(timer);
      const sections = [...pending];
      pending.clear();
      chain = chain.then(async () => {
        let failed = false;
        for (const s of sections) {
          try {
            await write(s);
          } catch {
            // Kept for the next try: otherwise it would only go again after another change.
            pending.add(s);
            failed = true;
          }
        }
        if (failed) {
          onStatus('error');
          clearTimeout(timer);
          timer = setTimeout(flush, Math.min(MAX_RETRY_DELAY, RETRY_DELAY * 2 ** retries++));
        } else {
          retries = 0;
          onStatus('synced');
        }
      });
    };
    off = onLocalChange((_d, sections) => {
      sections.forEach((s) => pending.add(s));
      if (!ready) return;
      clearTimeout(timer);
      timer = setTimeout(flush, WRITE_DELAY);
    });
    window.addEventListener('pagehide', () => {
      if (ready && pending.size) flush();
    });

    const remote = await Promise.all(
      SECTIONS.map(async (s) => {
        const snap = await docs.doc(s).get();
        return [s, snap.exists ? snap.data() : undefined] as const;
      }),
    );
    // Taken only now, with no await before replaceData: nothing the learner did meanwhile is lost.
    let next = getData();
    const toWrite: Section[] = [];
    for (const [s, body] of remote) {
      const remoteAt = Number(body?.updatedAt) || 0;
      if (body && remoteAt > next.stamps[s]) {
        next = merge(next, s, body);
        written[s] = remoteAt;
      } else if (next.stamps[s] > remoteAt) {
        toWrite.push(s);
      } else {
        written[s] = remoteAt;
      }
    }
    if (next !== getData()) replaceData(next);
    ready = true;
    toWrite.forEach((s) => pending.add(s));
    if (pending.size) flush();
    else onStatus('synced');
  } catch {
    off?.();
    onStatus('error');
  }
}
