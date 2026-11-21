import { useState } from 'preact/hooks';
import type { CloudStatus } from '../engine/cloud';
import { CAMPS, climbOf, PEAKS } from '../engine/climb';
import { isFixed, mistakesByItem } from '../engine/mistakes';
import { dueCount, newLeftToday, progressOf, streak, studyItems, todayKey, unseenCount } from '../engine/store';
import { ISSUES_BY_ID } from '../reading/issues';
import { pagesRead } from '../reading/store';
import { Modal, Row } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconBook, IconCards, IconGear, IconGrid, IconNews, IconPen, IconShuffle } from './icons';
import { useReading } from './Library';
import { Mountain } from './Mountain';
import { Rings } from './Rings';

const fmt = (n: number) => Math.round(n).toLocaleString('en-GB');

function greeting(now: number): string {
  const h = new Date(now).getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function Home({ cloud }: { cloud: CloudStatus }) {
  const d = useData();
  const nav = useNav();
  const now = Date.now();
  const due = dueCount(d, now);
  const newLeft = Math.min(newLeftToday(d, now), unseenCount(d));
  const today = d.days[todayKey(now)] ?? { n: 0, ok: 0, new: 0 };
  const days = streak(d, now);
  const openMistakes = [...mistakesByItem(d.mistakes, now).keys()].filter((id) => !isFixed(d.states[id])).length;
  const reading = useReading();
  const pages = pagesRead(reading);
  const climb = climbOf(d, pages);
  const [showClimb, setShowClimb] = useState(false);
  const words = progressOf([...studyItems(d)].filter((i) => i.kind !== 'drill'), d.states);
  const last = reading.last && ISSUES_BY_ID[reading.last.issue];
  const lastPage = last?.pages.find((p) => p.id === reading.last!.page);
  const date = new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const goal = d.settings.sessionSize;

  return (
    <div class="page">
      <div class="page-head">
        <div class="stack-sm">
          <p class="eyebrow">{date}</p>
          <h1 class="title">Today</h1>
        </div>
        <button type="button" class="icon-btn" onClick={() => nav.go('settings')} aria-label="Settings">
          <IconGear size={20} />
        </button>
      </div>

      <section class="sheet climb" aria-label="Your climb">
        <button type="button" class="climb-art" onClick={() => setShowClimb(true)} aria-label="How the climb works">
          <Mountain fraction={climb.fraction} label={`${fmt(climb.inPeak)} of ${fmt(climb.peak.h)} metres up ${climb.peak.name}`} />
        </button>
        <div class="climb-body">
          <p class="climb-hello">{greeting(now)}!</p>
          <p class="climb-alt">
            <b>{fmt(climb.inPeak)} m</b>
            <span>of {fmt(climb.peak.h)} m</span>
          </p>
          <div class="climb-bar" aria-hidden="true">
            <i style={{ width: `${climb.fraction * 100}%` }} />
          </div>
          <p class="muted small">
            {climb.peak.name}, {climb.peak.where} · peak {climb.peakIndex + 1} of {PEAKS.length}
          </p>
          {climb.next && (
            <div class="climb-next">
              <span class="climb-next-icon" aria-hidden="true">
                ⌂
              </span>
              <span>
                <span class="muted small">Next stop</span>
                <b>
                  {climb.next.name} · {fmt(climb.next.left)} m to go
                </b>
                <span class="muted small">
                  about {climb.next.lessons} {climb.next.lessons === 1 ? 'lesson' : 'lessons'}
                </span>
              </span>
            </div>
          )}
          <button type="button" class="btn btn-primary btn-block btn-climb" onClick={() => nav.startSession({ kind: 'daily', more: due + newLeft === 0 })}>
            {due + newLeft > 0 ? 'Keep climbing' : 'Practise more'}
          </button>
        </div>
      </section>

      <div class="backpack" role="list" aria-label="Your backpack">
        <div role="listitem">
          <b>{words.known}</b>
          <span>words you know</span>
        </div>
        <div role="listitem">
          <b>{words.started - words.known}</b>
          <span>words in progress</span>
        </div>
        <div role="listitem">
          <b>{pages}</b>
          <span>pages read</span>
        </div>
        <div role="listitem">
          <b>{days}</b>
          <span>{days === 1 ? 'day' : 'days'} in a row</span>
        </div>
      </div>

      <section class="sheet today" aria-label="Your day">
        <Rings
          rings={[
            { label: 'Answers', value: today.n / goal, text: `${today.n}/${goal}`, color: 'var(--ring-1)' },
            { label: 'New words', value: today.new / d.settings.newPerDay, text: `${today.new}/${d.settings.newPerDay}`, color: 'var(--ring-2)' },
            { label: 'Accuracy', value: today.n ? today.ok / today.n : 0, text: today.n ? `${Math.round((today.ok / today.n) * 100)}%` : '—', color: 'var(--ring-3)' },
          ]}
        />
        <div class="facts">
          <div>
            <b>{due}</b>
            <span>due for review</span>
          </div>
          <div>
            <b>{newLeft}</b>
            <span>new {newLeft === 1 ? 'word' : 'words'} left</span>
          </div>
          <div>
            <b>{days}</b>
            <span>{days === 1 ? 'day' : 'days'} in a row</span>
          </div>
        </div>
      </section>

      <div class="list with-icons">
        <Row
          icon={<IconNews size={18} />}
          color="var(--teal)"
          title={lastPage ? 'Continue reading' : 'Read a magazine'}
          subtitle={lastPage ? lastPage.title : 'Look up and save words as you read'}
          onClick={() => (last && lastPage ? nav.openReader(last.id, lastPage.id) : nav.go('read'))}
        />
        <Row
          icon={<IconPen size={18} />}
          color="var(--red)"
          title="Mistakes & flashcards"
          value={openMistakes || 'none'}
          onClick={() => nav.go('mistakes')}
        />
        <Row
          icon={<IconBook size={18} />}
          color="var(--orange)"
          title={d.custom.length ? 'My words' : 'Add your own words'}
          value={d.custom.length || undefined}
          onClick={() => (d.custom.length ? nav.startSession({ kind: 'custom' }) : nav.go('words'))}
        />
      </div>

      <section class="section" aria-labelledby="games">
        <p class="section-title" id="games">
          Word games
        </p>
        <div class="list with-icons">
          <Row icon={<IconGrid size={18} />} color="var(--blue)" title="Fillword" subtitle="Find words hidden in the grid" onClick={() => nav.go('games', 'filword')} />
          <Row icon={<IconShuffle size={18} />} color="var(--purple)" title="Anagrams" subtitle="Unscramble the letters" onClick={() => nav.go('games', 'anagram')} />
          <Row icon={<IconCards size={18} />} color="var(--green)" title="Pairs" subtitle="Match words against the clock" onClick={() => nav.go('games', 'pairs')} />
        </div>
      </section>
      <p class="footnote">{cloud === 'synced' ? 'Your progress is saved to your account.' : 'Your progress is saved in this browser.'}</p>

      {showClimb && (
        <Modal title="Your climb" onClose={() => setShowClimb(false)}>
          <div class="sheet stack-sm">
            <p class="eyebrow">How you climb</p>
            {climb.parts.map((p) => (
              <div class="climb-part" key={p.label}>
                <span>
                  {p.count} {p.label} <span class="muted">× {p.per} m</span>
                </span>
                <b>{fmt(p.count * p.per)} m</b>
              </div>
            ))}
            <div class="climb-part total">
              <span>Total</span>
              <b>{fmt(climb.total)} m</b>
            </div>
          </div>
          <p class="footnote">No levels and no tests. Every lesson you finish — a practice session or a magazine article — takes you 25 m up; answers and words add a little more on the way. Reach the top and the next mountain begins.</p>
          <div class="list">
            {CAMPS.map((c) => {
              const reached = climb.fraction >= c.at;
              return (
                <div class="list-item" key={c.name}>
                  <span class={`camp-dot ${reached ? 'reached' : ''}`} aria-hidden="true" />
                  <span class="list-item-main">
                    <b>{c.name}</b>
                    <span>{fmt(c.at * climb.peak.h)} m on {climb.peak.name}</span>
                  </span>
                  {reached && <span class="chip chip-green">reached</span>}
                </div>
              );
            })}
          </div>
          <p class="section-title">Mountains</p>
          <div class="list">
            {PEAKS.map((p, i) => (
              <div class="list-item" key={p.name}>
                <span class="list-item-main">
                  <b>{p.name}</b>
                  <span>
                    {fmt(p.h)} m · {p.where}
                  </span>
                </span>
                {i < climb.peakIndex || climb.done ? (
                  <span class="chip chip-green">climbed</span>
                ) : i === climb.peakIndex ? (
                  <span class="chip">now</span>
                ) : null}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
