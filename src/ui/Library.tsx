import { useEffect, useRef, useState } from 'preact/hooks';
import { packAt } from '../reading/docview';
import { annotatedPdf, shareFile } from '../reading/exportpdf';
import { deleteFile, ImportError, importPdf, loadThumb, redetect } from '../reading/pdf';
import { addIssue, allIssues, seenPages, updateIssuePages, getIssue, getReading, notesOf, removeIssue, setMenuStyle, subscribeReading } from '../reading/store';
import type { Issue, MagPage } from '../reading/types';
import { ConfirmButton } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconCheck, IconChevron, IconPlus } from './icons';

export function useReading() {
  const [, bump] = useState(0);
  useEffect(() => subscribeReading(() => bump((x) => x + 1)), []);
  return getReading();
}

/** The cover picture: kept in the magazine's record (older imports) or as a file next to the PDF. */
function useThumb(iss: Issue): string | undefined {
  const [url, setUrl] = useState<string | undefined>(iss.thumb);
  useEffect(() => {
    if (iss.thumb || !iss.thumbFile) return setUrl(iss.thumb);
    let alive = true;
    let made: string | null = null;
    loadThumb(iss.thumbFile).then((u) => {
      made = u;
      if (alive) setUrl(u ?? undefined);
      else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [iss.thumb, iss.thumbFile]);
  return url;
}

function articleAt(iss: Issue, pg: number): MagPage {
  const byPage = iss.pages.slice().sort((a, b) => (a.pdf?.from ?? 0) - (b.pdf?.from ?? 0));
  return [...byPage].reverse().find((a) => (a.pdf?.from ?? 1) <= pg) ?? byPage[0];
}

/** Articles grouped by the magazine's sections, in the order they first appear. */
function byTopic(pages: MagPage[]): [string, MagPage[]][] {
  const groups = new Map<string, MagPage[]>();
  for (const p of pages) groups.set(p.topic, [...(groups.get(p.topic) ?? []), p]);
  return [...groups];
}

export function Library() {
  const r = useReading();
  const d = useData();
  const nav = useNav();
  const issues = allIssues(r);
  const last = r.last && getIssue(r.last.issue);
  const lastPage = last?.pages.find((p) => p.id === r.last!.page);
  const highlights = issues
    .flatMap((iss) => [
      ...iss.pages.flatMap((p) => notesOf(iss.id, p.id).hl.map((h) => ({ h, iss, p }))),
      // A PDF magazine keeps its highlights for the whole issue; find the article by page.
      ...notesOf(iss.id, 'pages').hl.map((h) => ({ h, iss, p: articleAt(iss, h.pg ?? 1) })),
    ])
    .sort((a, b) => b.h.at - a.h.at);
  const savedFromReading = d.custom.filter((w) => w.ctx?.length).length;
  const menu = r.menu ?? 'system';
  const [open, setOpen] = useState<string | null>(() => issues[0]?.id ?? null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      const issue = await importPdf(file, setStep);
      const replaced = addIssue(issue);
      if (replaced) deleteFile(replaced).catch(() => {});
      setOpen(issue.id);
    } catch (e) {
      const why = e instanceof ImportError ? e.message : e instanceof Error ? `${e.name} ${e.message}` : String(e);
      setError(`Couldn’t open this file. Check that it is a PDF and that it is downloaded to the phone (not only in iCloud), then try again. Details: ${why}`);
    } finally {
      setStep('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div class="page">
      <div class="page-head">
        <div class="stack-sm">
          <h1 class="title">Read</h1>
          <p class="subtitle">Your magazines, article by article. Hold a word to look it up or save it.</p>
        </div>
        <button type="button" class="icon-btn" onClick={() => fileRef.current?.click()} aria-label="Add a magazine" title="Add a magazine (PDF)">
          <IconPlus size={22} />
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => onFile(e.currentTarget.files?.[0])} />

      {step && (
        <div class="sheet import-progress" role="status">
          <span class="spinner" aria-hidden="true" />
          <span>{step}</span>
        </div>
      )}
      {error && <p class="error">{error}</p>}

      {last && lastPage && (
        <button type="button" class="sheet continue" onClick={() => nav.openReader(last.id, lastPage.id)}>
          <span class="eyebrow">Continue reading</span>
          <b>{lastPage.title}</b>
          <span class="muted small">
            {[last.magazine, last.issue, lastPage.topic].filter(Boolean).join(' · ')}
          </span>
        </button>
      )}

      {!issues.some((i) => i.file) && (
        <button type="button" class="sheet add-mag" onClick={() => fileRef.current?.click()}>
          <span class="add-mag-icon" aria-hidden="true">
            <IconPlus size={22} />
          </span>
          <span>
            <b>Add a magazine</b>
            <span class="muted small">Choose a PDF from Files. It stays on this phone and keeps its own pictures and layout.</span>
          </span>
        </button>
      )}

      {issues.map((iss) => (
        <IssueBlock key={iss.id} iss={iss} open={open === iss.id} onToggle={() => setOpen(open === iss.id ? null : iss.id)} />
      ))}

      {highlights.length > 0 && (
        <section class="section">
          <p class="section-title">Your highlights</p>
          <div class="list">
            {highlights.slice(0, 12).map(({ h, iss, p }) => (
              <button type="button" class="list-item" key={h.id} onClick={() => nav.openReader(iss.id, p.id, iss.file && h.pg ? packAt(h.pg, h.start) : h.start)}>
                <i class={`hl-dot hl-${h.color}`} aria-hidden="true" />
                <span class="list-item-main">
                  <b class="quote">“{h.text}”</b>
                  <span>
                    {iss.magazine} · {p.title}
                  </span>
                </span>
                <IconChevron class="chevron" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section class="section">
        <p class="section-title">When you hold a word</p>
        <div class="segmented" role="group" aria-label="Word menu">
          <button type="button" aria-pressed={menu === 'system'} onClick={() => setMenuStyle('system')}>
            iPhone menu
          </button>
          <button type="button" aria-pressed={menu === 'app'} onClick={() => setMenuStyle('app')}>
            App menu
          </button>
        </div>
        <p class="footnote">
          {menu === 'system'
            ? 'iPhone’s own menu: Look Up and Translate from the system, plus a bar below with Highlight and Add to Words. Drag the handles to select a phrase.'
            : 'The app’s menu: Highlight, Look Up (English dictionary), Translate and Add to Words in one place. Hold and slide to select a phrase.'}
        </p>
      </section>

      <p class="footnote">
        {savedFromReading ? `${savedFromReading} words saved from reading are in Words → From reading. ` : ''}
        Magazines you add are kept only on this device. Known issues are split into sections and articles automatically; others are split by their bookmarks or page by page.
      </p>
    </div>
  );
}

function IssueBlock({ iss, open, onToggle }: { iss: Issue; open: boolean; onToggle: () => void }) {
  const nav = useNav();
  const d = useData();
  // A PDF magazine counts printed pages read (they move the climb); the demo counts articles.
  const total = iss.file ? Math.max(...iss.pages.map((p) => p.pdf?.to ?? 1)) : iss.pages.length;
  const read = iss.file ? seenPages(iss.id).length : iss.pages.filter((p) => notesOf(iss.id, p.id).read).length;
  const unit = iss.file ? 'pages' : 'articles';
  const groups = byTopic(iss.pages);
  const thumb = useThumb(iss);

  // Magazines added while unknown issues were listed page by page get their articles found now.
  const [finding, setFinding] = useState('');
  const pageByPage = !!iss.file && iss.pages.length > 1 && iss.pages.every((p) => p.topic === 'Pages');
  useEffect(() => {
    if (!pageByPage) return;
    let alive = true;
    redetect(iss, (t) => alive && setFinding(t))
      .then((pages) => {
        if (alive && pages?.length) updateIssuePages(iss.id, pages);
      })
      .catch(() => {})
      .finally(() => alive && setFinding(''));
    return () => {
      alive = false;
    };
  }, [pageByPage, iss.id]);
  return (
    <section class="section" aria-label={`${iss.magazine} ${iss.issue}`}>
      <div class="issue-card sheet">
        {thumb ? (
          <button type="button" class="cover-img" onClick={() => nav.openReader(iss.id, iss.pages[0].id)} aria-label={`Open ${iss.magazine}`}>
            <img src={thumb} alt="" />
          </button>
        ) : (
          <button
            type="button"
            class="cover-tile"
            style={{ '--c-bg': iss.cover.bg, '--c-fg': iss.cover.fg, '--c-ac': iss.cover.accent } as Record<string, string>}
            onClick={() => nav.openReader(iss.id, iss.pages[0].id)}
            aria-label={`Open the cover of ${iss.magazine}`}
          >
            <span class="cover-name">{iss.magazine}</span>
            <span class="cover-no">{iss.issue}</span>
            <span class="cover-head">{iss.pages[1]?.title}</span>
          </button>
        )}
        <div class="issue-info">
          <b>{[iss.magazine, iss.issue].filter(Boolean).join(' ')}</b>
          <span class="muted small">{finding || (iss.file ? `${iss.pages.length} articles · ${total} pages` : 'Demo issue')}</span>
          {iss.unsaved && <span class="error small">This phone didn’t let the app keep the file: it will be gone after you close the app.</span>}
          <div class="bar" role="img" aria-label={`${read} of ${total} ${unit} read`}>
            <i class="known" style={{ width: `${(read / total) * 100}%` }} />
          </div>
          <span class="muted small">
            {read} of {total} {unit} read
          </span>
          <button type="button" class="link small" style={{ alignSelf: 'flex-start' }} aria-expanded={open} onClick={onToggle}>
            {open ? 'Hide contents' : 'Show contents'}
          </button>
        </div>
      </div>
      {open &&
        groups.map(([topic, pages]) => (
          <div class="stack-sm" key={topic}>
            {groups.length > 1 && <p class="section-title">{topic}</p>}
            <div class="list">
              {pages.map((p) => {
                const n = notesOf(iss.id, p.id);
                const words = d.custom.filter((w) => w.ctx?.some((c) => c.issue === iss.id && c.page === p.id)).length;
                const marks = n.hl.length + n.strokes.length + n.texts.length;
                const where = p.pdf ? (p.pdf.from === p.pdf.to ? `p. ${p.pdf.from}` : `pp. ${p.pdf.from}–${p.pdf.to}`) : '';
                return (
                  <button type="button" class="list-item page-row" key={p.id} onClick={() => nav.openReader(iss.id, p.id)}>
                    <span class="list-item-main">
                      <b>{p.title}</b>
                      <span>{[p.dek, where, words ? `${words} saved ${words === 1 ? 'word' : 'words'}` : '', marks ? `${marks} notes` : ''].filter(Boolean).join(' · ')}</span>
                    </span>
                    {n.read && <IconCheck class="check" size={18} />}
                    <IconChevron class="chevron" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      {open && iss.file && <SaveCopy iss={iss} />}
      {open && iss.file && (
        <ConfirmButton
          class="btn btn-sm btn-ghost"
          label="Remove this magazine"
          confirmLabel="Remove it and its notes"
          onConfirm={() => {
            removeIssue(iss.id);
            deleteFile(iss.file!).catch(() => {});
          }}
        />
      )}
    </section>
  );
}

/**
 * "Save a copy with notes": the PDF with highlights, drawings and text notes on its pages,
 * for iCloud Drive via the share sheet. Two taps, because iPhone opens the share sheet only
 * straight after a tap, and preparing a large magazine takes a few seconds.
 */
export function SaveCopy({ iss }: { iss: Issue }) {
  const [state, setState] = useState<'idle' | 'busy' | 'ready' | 'done' | 'error'>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const name = `${[iss.magazine, iss.issue].filter(Boolean).join(' ')} — with notes.pdf`;
  const notes = notesOf(iss.id, 'pages');
  const count = notes.hl.length + notes.strokes.length + notes.texts.length;

  const prepare = async () => {
    setState('busy');
    try {
      setBlob(await annotatedPdf(iss, notes));
      setState('ready');
    } catch {
      setState('error');
    }
  };
  const save = async () => {
    if (!blob) return;
    const how = await shareFile(blob, name);
    if (how !== 'cancelled') {
      setState('done');
      setBlob(null);
    }
  };

  return (
    <div class="sheet stack-sm save-copy">
      <b>A copy with your notes</b>
      <span class="muted small">
        {count
          ? `The magazine as a PDF with your ${count} highlights, drawings and notes on its pages. Save it to Files → iCloud Drive; it opens in Preview and Books on any device.`
          : 'Add highlights, drawings or text notes while reading, then save the magazine with them as a PDF to iCloud Drive.'}
      </span>
      {state === 'ready' ? (
        <button type="button" class="btn btn-primary" onClick={save}>
          Save to Files…
        </button>
      ) : (
        <button type="button" class="btn" disabled={state === 'busy' || !count} onClick={prepare}>
          {state === 'busy' ? 'Preparing the copy…' : state === 'done' ? 'Saved ✓ Prepare again' : 'Prepare a copy with notes'}
        </button>
      )}
      {state === 'error' && <p class="error small">Couldn’t make the copy. Try again; if the magazine is very large, close other apps first.</p>}
    </div>
  );
}
