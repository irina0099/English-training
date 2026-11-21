import { useEffect, useState } from 'preact/hooks';
import { ISSUES, ISSUES_BY_ID } from '../reading/issues';
import { getReading, notesOf, setMenuStyle, subscribeReading } from '../reading/store';
import { useNav } from './context';
import { useData } from './hooks';
import { IconCheck, IconChevron } from './icons';

export function useReading() {
  const [, bump] = useState(0);
  useEffect(() => subscribeReading(() => bump((x) => x + 1)), []);
  return getReading();
}

export function Library() {
  const r = useReading();
  const d = useData();
  const nav = useNav();
  const last = r.last && ISSUES_BY_ID[r.last.issue];
  const lastPage = last?.pages.find((p) => p.id === r.last!.page);
  const highlights = ISSUES.flatMap((iss) =>
    iss.pages.flatMap((p) => notesOf(iss.id, p.id).hl.map((h) => ({ h, iss, p }))),
  ).sort((a, b) => b.h.at - a.h.at);
  const savedFromReading = d.custom.filter((w) => w.ctx?.length).length;
  const menu = r.menu ?? 'system';

  return (
    <div class="page">
      <div class="page-head">
        <div class="stack-sm">
          <h1 class="title">Read</h1>
          <p class="subtitle">Magazines page by page. Hold a word to look it up or save it.</p>
        </div>
      </div>

      {last && lastPage && (
        <button type="button" class="sheet continue" onClick={() => nav.openReader(last.id, lastPage.id)}>
          <span class="eyebrow">Continue reading</span>
          <b>{lastPage.title}</b>
          <span class="muted small">
            {last.magazine} {last.issue} · {lastPage.topic}
          </span>
        </button>
      )}

      {ISSUES.map((iss) => {
        const read = iss.pages.filter((p) => notesOf(iss.id, p.id).read).length;
        return (
          <section class="section" key={iss.id} aria-label={`${iss.magazine} ${iss.issue}`}>
            <div class="issue-card sheet">
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
              <div class="issue-info">
                <b>
                  {iss.magazine} {iss.issue}
                </b>
                <span class="muted small">{iss.date}</span>
                <div class="bar" role="img" aria-label={`${read} of ${iss.pages.length} pages read`}>
                  <i class="known" style={{ width: `${(read / iss.pages.length) * 100}%` }} />
                </div>
                <span class="muted small">
                  {read} of {iss.pages.length} pages read
                </span>
              </div>
            </div>
            <div class="list">
              {iss.pages.map((p) => {
                const n = notesOf(iss.id, p.id);
                const words = d.custom.filter((w) => w.ctx?.some((c) => c.issue === iss.id && c.page === p.id)).length;
                const marks = n.hl.length + n.strokes.length + n.texts.length;
                return (
                  <button type="button" class="list-item page-row" key={p.id} onClick={() => nav.openReader(iss.id, p.id)}>
                    <span class={`topic topic-${p.topic.toLowerCase()}`}>{p.topic}</span>
                    <span class="list-item-main">
                      <b>{p.title}</b>
                      <span>
                        {[p.dek, words ? `${words} saved ${words === 1 ? 'word' : 'words'}` : '', marks ? `${marks} notes` : ''].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {n.read && <IconCheck class="check" size={18} />}
                    <IconChevron class="chevron" />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {highlights.length > 0 && (
        <section class="section">
          <p class="section-title">Your highlights</p>
          <div class="list">
            {highlights.slice(0, 12).map(({ h, iss, p }) => (
              <button type="button" class="list-item" key={h.id} onClick={() => nav.openReader(iss.id, p.id, h.start)}>
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
        This is a demo issue. Send your magazines (PDF or photos) and each one will appear here, split into pages by topic, with its own fonts, pictures and layout.
      </p>
    </div>
  );
}
