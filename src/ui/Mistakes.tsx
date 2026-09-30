import { findItem } from '../content';
import { categoryLabel, isFixed, mistakesByCategory, mistakesByItem, type ItemMistakes } from '../engine/mistakes';
import { clearMistakes } from '../engine/store';
import type { AppData, Item } from '../types';
import { ConfirmButton, count, LevelChip, relativeDay } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconCards, IconPen } from './icons';

function itemTitle(item: Item): string {
  return item.kind === 'drill' ? (item.fix ? item.a : item.q.replace('___', '…')) : item.en;
}

function MistakeRow({ m, d, now }: { m: ItemMistakes; d: AppData; now: number }) {
  const nav = useNav();
  const item = findItem(m.id, d.custom);
  if (!item) return null;
  const fromGame = m.cat === 'games';
  return (
    <div class="list-item" style={{ alignItems: 'flex-start' }}>
      <div class="list-item-main">
        <b>{itemTitle(item)}</b>
        {item.kind !== 'drill' && <span lang="ru">{item.ru}</span>}
        {!fromGame && (
          <div class="red-pen">
            {m.lastGiven ? <s>{m.lastGiven}</s> : <span class="muted small">no answer</span>}
            <span class="fix">{m.expected}</span>
          </div>
        )}
        <span class="small">
          {fromGame ? `added from a game ${relativeDay(m.lastAt, now)}` : relativeDay(m.lastAt, now)}
          {item.rule && (
            <>
              {' · '}
              <button type="button" class="link" onClick={() => nav.openRule(item.rule!)}>
                rule
              </button>
            </>
          )}
        </span>
      </div>
      <div class="stack-sm" style={{ alignItems: 'flex-end' }}>
        {!fromGame && <span class="count">×{m.count}</span>}
        <LevelChip item={item} />
      </div>
    </div>
  );
}

export function Mistakes() {
  const d = useData();
  const nav = useNav();
  const now = Date.now();
  const byItem = [...mistakesByItem(d.mistakes, now).values()].filter((m) => findItem(m.id, d.custom));
  const open = byItem.filter((m) => !isFixed(d.states[m.id])).sort((a, b) => b.weight - a.weight);
  const fixed = byItem.filter((m) => isFixed(d.states[m.id])).sort((a, b) => b.lastAt - a.lastAt);
  const cats = mistakesByCategory(
    d.mistakes.filter((m) => !isFixed(d.states[m.id])),
    now,
  );
  const maxWeight = Math.max(0.01, ...cats.map((c) => c.weight));
  const deck = open.slice(0, 30).map((m) => findItem(m.id, d.custom)!);

  if (!d.mistakes.length) {
    return (
      <div class="page">
        <h1 class="title">Mistakes</h1>
        <div class="sheet empty">
          <p>No mistakes yet. When you get something wrong in practice, it lands here, and the app brings it back more often until you answer correctly three times in a row.</p>
          <p>Words you add after a game appear here too.</p>
          <button type="button" class="btn btn-primary" onClick={() => nav.startSession({ kind: 'daily' })}>
            Start practice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="page">
      <div class="stack-sm">
        <h1 class="title">Mistakes</h1>
        <p class="subtitle">Recent mistakes count more: a mistake’s weight halves every week. Three correct answers in a row, and it’s fixed.</p>
      </div>

      <div class="list with-icons">
        <button type="button" class="list-item" disabled={!open.length} onClick={() => nav.startSession({ kind: 'mistakes' })}>
          <span class="app-icon" style={{ '--c': 'var(--red)' } as Record<string, string>}>
            <IconPen size={18} />
          </span>
          <span class="list-item-main">
            <b>Practise mistakes</b>
            <span>Exercises in a new format each time</span>
          </span>
          <span class="value">{open.length || 'all fixed'}</span>
        </button>
        <button type="button" class="list-item" disabled={!deck.length} onClick={() => nav.startCards({ title: 'Mistake cards', items: deck })}>
          <span class="app-icon" style={{ '--c': 'var(--indigo)' } as Record<string, string>}>
            <IconCards size={18} />
          </span>
          <span class="list-item-main">
            <b>Flashcards</b>
            <span>Flip, remember, and be honest with yourself</span>
          </span>
          <span class="value">{deck.length || '—'}</span>
        </button>
      </div>

      {cats.length > 0 && (
        <section class="section" aria-labelledby="cats">
          <p class="section-title" id="cats">
            Hardest for you
          </p>
          <div class="list">
            {cats.slice(0, 8).map((c) => {
              const stats = d.ruleStats[c.cat];
              const isRule = c.cat !== 'vocab' && c.cat !== 'spelling' && c.cat !== 'games';
              return (
                <div class="cat-row" key={c.cat}>
                  <div class="row" style={{ alignItems: 'baseline' }}>
                    <b style={{ flex: 1, minWidth: 0 }}>{categoryLabel(c.cat)}</b>
                    <span class="count">×{c.count}</span>
                  </div>
                  <div class="bar" aria-hidden="true">
                    <i class="hot" style={{ width: `${(c.weight / maxWeight) * 100}%` }} />
                  </div>
                  <span class="muted small">
                    {stats
                      ? `${count(c.count, 'mistake')} in ${count(stats.n, 'try', 'tries')}`
                      : c.cat === 'spelling'
                        ? 'Almost right, but with a typo'
                        : c.cat === 'games'
                          ? 'Words you chose to practise after a game'
                          : 'You chose or typed the wrong word'}
                  </span>
                  {isRule && (
                    <div class="row">
                      <button type="button" class="btn btn-sm btn-ghost" onClick={() => nav.openRule(c.cat)}>
                        Rule
                      </button>
                      <button type="button" class="btn btn-sm" onClick={() => nav.startSession({ kind: 'rule', rule: c.cat })}>
                        Practise
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {open.length > 0 && (
        <section class="section" aria-labelledby="open">
          <p class="section-title" id="open">
            To work on
          </p>
          <div class="list">
            {open.map((m) => (
              <MistakeRow key={m.id} m={m} d={d} now={now} />
            ))}
          </div>
        </section>
      )}

      {fixed.length > 0 && (
        <details class="section">
          <summary class="section-title" style={{ cursor: 'pointer' }}>
            Fixed · {fixed.length}
          </summary>
          <div class="list" style={{ marginTop: 8 }}>
            {fixed.map((m) => (
              <MistakeRow key={m.id} m={m} d={d} now={now} />
            ))}
          </div>
        </details>
      )}

      <ConfirmButton class="btn btn-danger btn-block" label="Clear the mistakes list" confirmLabel="Clear the list" onConfirm={clearMistakes} />
    </div>
  );
}
