import { BUILTIN } from '../content';
import type { CloudStatus } from '../engine/cloud';
import { isFixed, mistakesByItem } from '../engine/mistakes';
import { dueCount, newLeftToday, progressOf, streak, todayKey, unseenCount } from '../engine/store';
import type { Level } from '../types';
import { Row } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconBook, IconCards, IconGear, IconGrid, IconPen, IconShuffle } from './icons';
import { Rings } from './Rings';

export function Home({ cloud }: { cloud: CloudStatus }) {
  const d = useData();
  const nav = useNav();
  const now = Date.now();
  const due = dueCount(d, now);
  const newLeft = Math.min(newLeftToday(d, now), unseenCount(d));
  const today = d.days[todayKey(now)] ?? { n: 0, ok: 0, new: 0 };
  const days = streak(d, now);
  const openMistakes = [...mistakesByItem(d.mistakes, now).keys()].filter((id) => !isFixed(d.states[id])).length;
  const levels: (Level | 'own')[] = [...d.settings.levels, ...(d.custom.length ? (['own'] as const) : [])];
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
        <button type="button" class="btn btn-primary btn-block" onClick={() => nav.startSession({ kind: 'daily' })}>
          {due + newLeft > 0 ? 'Start practice' : 'Practise more'}
        </button>
      </section>

      <div class="list with-icons">
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

      <section class="section" aria-labelledby="progress">
        <p class="section-title" id="progress">
          Progress
        </p>
        <div class="list">
          {levels.map((lvl) => {
            const items = lvl === 'own' ? d.custom : BUILTIN.filter((i) => i.level === lvl);
            const p = progressOf(items, d.states);
            const known = p.total ? (p.known / p.total) * 100 : 0;
            const started = p.total ? ((p.started - p.known) / p.total) * 100 : 0;
            return (
              <div class="progress-row" key={lvl}>
                <span class={`chip ${lvl === 'B2' ? 'chip-b2' : lvl === 'own' ? 'chip-own' : ''}`}>{lvl === 'own' ? 'Mine' : lvl}</span>
                <div class="bar" role="img" aria-label={`${p.known} of ${p.total} known, ${p.started - p.known} learning`}>
                  {known > 0 && <i class="known" style={{ width: `${known}%` }} />}
                  {started > 0 && <i class="started" style={{ width: `${started}%` }} />}
                </div>
                <span class="small muted">
                  {p.known}/{p.total}
                </span>
              </div>
            );
          })}
        </div>
        <p class="footnote">
          Green means you know it well (next review in a week or more), orange means you are still learning it.{' '}
          {cloud === 'synced' ? 'Your progress is saved to your account.' : 'Your progress is saved in this browser.'}
        </p>
      </section>

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
    </div>
  );
}
