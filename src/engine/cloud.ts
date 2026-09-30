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

    let next = getData();
    const toWrite: Section[] = [];
    for (const s of SECTIONS) {
      const snap = await docs.doc(s).get();
      const body = snap.exists ? snap.data() : undefined;
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
    for (const s of toWrite) await write(s);
    onStatus('synced');

    // Writes are coalesced and go one at a time, as the store asks.
    const pending = new Set<Section>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let chain = Promise.resolve();
    const flush = () => {
      const sections = [...pending];
      pending.clear();
      chain = chain
        .then(async () => {
          for (const s of sections) await write(s);
          onStatus('synced');
        })
        .catch(() => onStatus('error'));
    };
    onLocalChange((_d, sections) => {
      sections.forEach((s) => pending.add(s));
      clearTimeout(timer);
      timer = setTimeout(flush, WRITE_DELAY);
    });
    window.addEventListener('pagehide', () => {
      if (pending.size) flush();
    });
  } catch {
    onStatus('error');
  }
}
