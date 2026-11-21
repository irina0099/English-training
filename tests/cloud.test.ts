import { afterEach, describe, expect, it } from 'vitest';
import { startCloudSync, type CloudStatus } from '../src/engine/cloud';
import { getData, replaceData, defaultData, updateSettings } from '../src/engine/store';

/** A fake claude.ai runtime whose reads wait until the test lets them through. */
function fakeCloud(remote: Record<string, Record<string, unknown>> = {}) {
  const stored: Record<string, Record<string, unknown>> = { ...remote };
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const db = {
    collection: () => ({
      doc: (id: string) => ({
        get: async () => {
          await gate;
          return { exists: id in stored, data: () => stored[id] };
        },
        set: async (body: Record<string, unknown>) => {
          stored[id] = body;
        },
      }),
    }),
  };
  const runtime = { use: async (name: string) => (name === 'db' ? db : { id: async () => 'u1' }) };
  (globalThis as unknown as { window: unknown }).window = { claude: runtime, addEventListener() {} };
  return { stored, release };
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
  replaceData(defaultData());
});

describe('startCloudSync', () => {
  it('keeps changes made while it connects, and sends them to the cloud', async () => {
    const { stored, release } = fakeCloud();
    const statuses: CloudStatus[] = [];
    const done = startCloudSync((s) => statuses.push(s));

    // The learner changes something while the first read is still on its way.
    await new Promise((r) => setTimeout(r, 0));
    updateSettings({ sessionSize: 25 });

    release();
    await done;
    await new Promise((r) => setTimeout(r, 0));

    expect(getData().settings.sessionSize).toBe(25);
    expect((stored.progress?.settings as { sessionSize: number }).sessionSize).toBe(25);
    expect(statuses.at(-1)).toBe('synced');
  });

  it('still takes newer progress from the cloud', async () => {
    const remoteSettings = { ...defaultData().settings, sessionSize: 30 };
    const { release } = fakeCloud({
      progress: { updatedAt: Date.now() + 60_000, states: {}, settings: remoteSettings, days: {}, ruleStats: {} },
    });
    const done = startCloudSync(() => {});
    release();
    await done;
    expect(getData().settings.sessionSize).toBe(30);
  });
});
