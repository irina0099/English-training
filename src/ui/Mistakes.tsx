import { findItem } from '../content';
import { categoryLabel, isFixed, mistakesByCategory, mistakesByItem, type ItemMistakes } from '../engine/mistakes';
import { clearMistakes } from '../engine/store';
import type { AppData, Item } from '../types';
import { ConfirmButton, LevelChip, plural, relativeDay } from './common';
import { useNav } from './context';
import { useData } from './hooks';

function itemTitle(item: Item): string {
  return item.kind === 'drill' ? (item.fix ? item.a : item.q.replace('___', '…')) : item.en;
}

function MistakeRow({ m, d, now }: { m: ItemMistakes; d: AppData; now: number }) {
  const nav = useNav();
  const item = findItem(m.id, d.custom);
  if (!item) return null;
  return (
    <div class="list-item" style={{ alignItems: 'flex-start' }}>
      <div class="list-item-main">
        <b>{itemTitle(item)}</b>
        {item.kind !== 'drill' && <span>{item.ru}</span>}
        <div class="red-pen">
          {m.lastGiven ? <s>{m.lastGiven}</s> : <span class="muted small">без ответа</span>}
          <span class="fix">{m.expected}</span>
        </div>
        <span class="small">
          {relativeDay(m.lastAt, now)}
          {item.rule && (
            <>
              {' · '}
              <button type="button" class="link" onClick={() => nav.openRule(item.rule!)}>
                правило
              </button>
            </>
          )}
        </span>
      </div>
      <div class="stack-sm" style={{ alignItems: 'flex-end' }}>
        <span class="count">×{m.count}</span>
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

  if (!d.mistakes.length) {
    return (
      <div class="page">
        <h1 class="title">Мои ошибки</h1>
        <div class="sheet empty">
          <p>Ошибок пока нет. Когда вы ошибётесь в тренировке, задание попадёт сюда, а тренажёр будет возвращать его чаще, пока вы не ответите верно три раза подряд.</p>
          <button type="button" class="btn btn-primary" onClick={() => nav.startSession({ kind: 'daily' })}>
            Начать тренировку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="page">
      <div class="stack-sm">
        <h1 class="title">Мои ошибки</h1>
        <p class="subtitle">
          Свежие ошибки весят больше: через неделю вес ошибки уменьшается вдвое. Задание считается исправленным после трёх верных ответов подряд.
        </p>
      </div>

      <button type="button" class="btn btn-primary btn-block" disabled={!open.length} onClick={() => nav.startSession({ kind: 'mistakes' })}>
        {open.length ? `Работа над ошибками · ${open.length}` : 'Все ошибки исправлены'}
      </button>

      {cats.length > 0 && (
        <section class="stack" aria-labelledby="cats">
          <p class="section-title" id="cats">
            Что даётся труднее всего
          </p>
          <div class="list">
            {cats.slice(0, 8).map((c) => {
              const stats = d.ruleStats[c.cat];
              const isRule = c.cat !== 'vocab' && c.cat !== 'spelling';
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
                    {stats ? `${c.count} ${plural(c.count, 'ошибка', 'ошибки', 'ошибок')} из ${stats.n} ${plural(stats.n, 'попытки', 'попыток', 'попыток')}` : c.cat === 'spelling' ? 'Почти верно, но с опечаткой' : 'Выбрали или написали не то слово'}
                  </span>
                  {isRule && (
                    <div class="row">
                      <button type="button" class="btn btn-sm btn-ghost" onClick={() => nav.openRule(c.cat)}>
                        Правило
                      </button>
                      <button type="button" class="btn btn-sm" onClick={() => nav.startSession({ kind: 'rule', rule: c.cat })}>
                        Тренировать
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
        <section class="stack" aria-labelledby="open">
          <p class="section-title" id="open">
            Повторяющиеся ошибки
          </p>
          <div class="list">
            {open.map((m) => (
              <MistakeRow key={m.id} m={m} d={d} now={now} />
            ))}
          </div>
        </section>
      )}

      {fixed.length > 0 && (
        <details class="stack">
          <summary class="section-title" style={{ cursor: 'pointer' }}>
            Исправлено · {fixed.length}
          </summary>
          <div class="list" style={{ marginTop: 12 }}>
            {fixed.map((m) => (
              <MistakeRow key={m.id} m={m} d={d} now={now} />
            ))}
          </div>
        </details>
      )}

      <ConfirmButton class="btn btn-ghost btn-sm" label="Очистить журнал ошибок" confirmLabel="Очистить журнал" onConfirm={clearMistakes} />
    </div>
  );
}
