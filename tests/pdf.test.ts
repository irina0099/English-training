import { afterEach, describe, expect, it } from 'vitest';
import { deleteFile, PdfView } from '../src/reading/pdf';

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

/** Just enough of the DOM for PdfView to draw: canvases whose toBlob behaves as the test says. */
function fakeDom(toBlob: (cb: (b: Blob | null) => void) => void) {
  (globalThis as unknown as { document: unknown }).document = {
    createElement: () => ({ width: 0, height: 0, toBlob }),
  };
}

function fakeSlot() {
  return { dataset: {} as Record<string, string>, querySelector: () => null, insertBefore() {} } as unknown as HTMLElement;
}

function fakePage(render: () => Promise<void>) {
  let renders = 0;
  const page = {
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale, scale }),
    render: () => {
      renders++;
      return { promise: render() };
    },
  };
  return { page, renders: () => renders };
}

function viewWith(page: unknown) {
  const view = new PdfView(fakeSlot(), 'k');
  view.slots = [fakeSlot()];
  (view as unknown as { pages: unknown[] }).pages = [page];
  return view;
}

afterEach(() => {
  delete (globalThis as unknown as { document?: unknown }).document;
  delete (globalThis as unknown as { indexedDB?: unknown }).indexedDB;
});

describe('PdfView', () => {
  it('stops trying a page that could not be turned into a picture', async () => {
    // Out of memory on iPhone: toBlob gives null. Async, so a runaway loop can't freeze the test.
    fakeDom((cb) => setTimeout(() => cb(null), 0));
    const { page, renders } = fakePage(async () => {});
    const view = viewWith(page);
    view.show([1], 1200);
    await tick();
    expect(renders()).toBe(1);
    view.destroy();
  });

  it('survives a page that fails to render', async () => {
    fakeDom((cb) => setTimeout(() => cb(null), 0));
    const { page, renders } = fakePage(() => Promise.reject(new Error('broken page')));
    const view = viewWith(page);
    view.show([1], 1200);
    await tick();
    expect(renders()).toBe(1);
    // A new screen size is a fresh chance to draw it.
    view.show([1], 800);
    await tick();
    expect(renders()).toBe(2);
    view.destroy();
  });
});

describe('file storage', () => {
  it('reports a failure when the transaction aborts after the request succeeded', async () => {
    // What Safari does when there is no room left: the request succeeds, the commit doesn't.
    const t: Record<string, ((...a: unknown[]) => void) | unknown> = { error: new DOMException('full', 'QuotaExceededError') };
    const req: Record<string, unknown> = { result: undefined };
    t.objectStore = () => ({
      delete: () => {
        setTimeout(() => {
          (req.onsuccess as () => void)?.();
          setTimeout(() => (t.onabort as () => void)?.(), 0);
        }, 0);
        return req;
      },
    });
    const open: Record<string, unknown> = { result: { transaction: () => t } };
    (globalThis as unknown as { indexedDB: unknown }).indexedDB = {
      open: () => {
        setTimeout(() => (open.onsuccess as () => void)(), 0);
        return open;
      },
    };
    await expect(deleteFile('k')).rejects.toThrow('full');
  });
});
