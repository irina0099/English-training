import { afterEach, describe, expect, it, vi } from 'vitest';
import { DocView } from '../src/reading/docview';

/** Just enough of the DOM for DocView to draw: canvases whose toBlob behaves as the test says. */
function fakeDom(toBlob: (cb: (b: Blob | null) => void) => void) {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: () => ({ width: 0, height: 0, toBlob }),
  };
}

function fakePage(render: () => Promise<void>) {
  let renders = 0;
  let cleaned = 0;
  const page = {
    cleanup: () => {
      cleaned++;
      return true;
    },
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale, scale }),
    render: () => {
      renders++;
      return { promise: render() };
    },
  };
  return { page, renders: () => renders, cleaned: () => cleaned };
}

/** A DocView with one page on screen, without a real document behind it. */
function viewWith(page: unknown) {
  (globalThis as unknown as { window: unknown }).window = { devicePixelRatio: 1, removeEventListener() {} };
  (globalThis as unknown as { cancelAnimationFrame: unknown }).cancelAnimationFrame = () => {};
  const scroller = { scrollTop: 0, clientHeight: 800, removeEventListener() {} } as unknown as HTMLElement;
  const view = new DocView(scroller, {} as HTMLElement, 'k', () => {}, () => {});
  const el = { insertBefore() {} } as unknown as HTMLElement;
  view.slots = [{ el, page: page as never, w: 600, h: 800, top: 0, height: 520, img: null, drawn: 0, text: null, textIndex: null, textPromise: null, overlay: el }];
  return view;
}
const drain = (view: DocView) => (view as unknown as { drain(): Promise<void> }).drain();

afterEach(() => {
  delete (globalThis as unknown as { document?: unknown }).document;
  delete (globalThis as unknown as { window?: unknown }).window;
  delete (globalThis as unknown as { indexedDB?: unknown }).indexedDB;
});

describe('DocView', () => {
  it('stops trying a page that could not be turned into a picture', async () => {
    // Out of memory on iPhone: toBlob gives null. Async, so a runaway loop can't freeze the test.
    fakeDom((cb) => setTimeout(() => cb(null), 0));
    const { page, renders } = fakePage(async () => {});
    await drain(viewWith(page));
    expect(renders()).toBe(1);
  });

  it('survives a page that fails to render', async () => {
    fakeDom((cb) => setTimeout(() => cb(null), 0));
    const { page, renders } = fakePage(() => Promise.reject(new Error('broken page')));
    await expect(drain(viewWith(page))).resolves.toBeUndefined();
    expect(renders()).toBe(1);
  });

  it('frees its pages when closed', () => {
    const { page, cleaned } = fakePage(async () => {});
    viewWith(page).destroy();
    expect(cleaned()).toBe(1);
  });
});

/** IndexedDB in memory. Requests succeed first and transactions finish after, as in browsers. */
function fakeIdb(opts: { abortWrites?: boolean; loseFiles?: boolean } = {}) {
  const files = new Map<string, unknown>();
  let opens = 0;
  const later = (f: () => void) => setTimeout(f, 0);
  const database = {
    transaction: () => {
      const t: Record<string, unknown> = {};
      // Like a real transaction: it completes (or aborts) once, after all of its requests.
      const changes: (() => void)[] = [];
      let open = 0;
      let wrote = false;
      const run = (req: Record<string, unknown>, result: unknown, write: boolean, apply = () => {}) => {
        open++;
        wrote ||= write;
        changes.push(apply);
        later(() => {
          req.result = result;
          (req.onsuccess as () => void)?.();
          if (--open) return;
          later(() => {
            if (wrote && opts.abortWrites) {
              t.error = new DOMException('full', 'QuotaExceededError');
              (t.onabort as () => void)?.();
            } else {
              changes.forEach((f) => f());
              (t.oncomplete as () => void)?.();
            }
          });
        });
        return req;
      };
      t.objectStore = () => ({
        put: (v: unknown, k: string) => run({}, k, true, () => files.set(k, v)),
        get: (k: string) => run({}, opts.loseFiles ? undefined : files.get(k), false),
        delete: (k: string) => run({}, undefined, true, () => files.delete(k)),
      });
      return t;
    },
  };
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = {
    open: () => {
      opens++;
      const req: Record<string, unknown> = { result: database };
      later(() => (req.onsuccess as () => void)());
      return req;
    },
  };
  return { files, opens: () => opens };
}

/** A fresh copy of the module, so its database connection doesn't carry over between tests. */
async function freshPdf() {
  vi.resetModules();
  return import('../src/reading/pdf');
}

const pdfFile = (name = 'Issue_12.pdf') => ({ name, arrayBuffer: async () => new ArrayBuffer(8) }) as unknown as File;

describe('file storage', () => {
  it('reports a failure when the transaction aborts after the request succeeded', async () => {
    // What Safari does when there is no room left: the request succeeds, the commit doesn't.
    fakeIdb({ abortWrites: true });
    const { deleteFile } = await freshPdf();
    await expect(deleteFile('k')).rejects.toThrow('full');
  });

  it('removes the saved file when the magazine cannot be read', async () => {
    const idb = fakeIdb({ loseFiles: true });
    const { importPdf, ImportError } = await freshPdf();
    const result = importPdf(pdfFile(), () => {});
    await expect(result).rejects.toBeInstanceOf(ImportError);
    await expect(result).rejects.toThrow('open PDF');
    expect(idb.files.size).toBe(0);
  });

  it('opens the database once for many requests', async () => {
    const idb = fakeIdb();
    const { deleteFile } = await freshPdf();
    await deleteFile('a');
    await deleteFile('b');
    await deleteFile('c');
    expect(idb.opens()).toBe(1);
  });

  it('removes the cover picture together with the magazine', async () => {
    const idb = fakeIdb();
    idb.files.set('k', new ArrayBuffer(8));
    idb.files.set('k#thumb', new ArrayBuffer(4));
    idb.files.set('other', new ArrayBuffer(8));
    const { deleteFile } = await freshPdf();
    await deleteFile('k');
    expect([...idb.files.keys()]).toEqual(['other']);
  });

  it('gives the cover picture as a URL, or nothing when there is none', async () => {
    const idb = fakeIdb();
    idb.files.set('k#thumb', new ArrayBuffer(4));
    const { loadThumb } = await freshPdf();
    const url = await loadThumb('k');
    expect(url).toMatch(/^blob:/);
    URL.revokeObjectURL(url!);
    expect(await loadThumb('missing')).toBeNull();
  });
});
