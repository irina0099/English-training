import { BUILTIN } from '../content';
import { isFixed, mistakesByItem } from '../engine/mistakes';
import { dueCount, newLeftToday, progressOf, streak, todayKey, unseenCount } from '../engine/store';
import type { CloudStatus } from '../engine/cloud';
import type { Level } from '../types';
import { plural } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconCards, IconGear, IconGrid, IconShuffle } from './icons';

export function Home({ cloud }: { cloud: CloudStatus }) {
  const d = useData();
  const nav = useNav();
  const now = Date.now();
  const due = dueCount(d, now);
  const newLeft = Math.min(newLeftToday(d, now), unseenCount(d));
  const today = d.days[todayKey(now)];
  const days = streak(d, now);
  const byItem = mistakesByItem(d.mistakes, now);
  const openMistakes = [...byItem.keys()].filter((id) => !isFixed(d.states[id])).length;
  const levels: (Level | 'own')[] = [...d.settings.levels, ...(d.custom.length ? (['own'] as const) : [])];

  return (
    <div class="page">
      <div class="page-head">
        <div class="stack-sm">
          <h1 class="title">Английская тетрадь</h1>
          <p class="subtitle">
            Уровень {d.settings.levels.join(' + ')} · {cloud === 'synced' ? 'прогресс в вашем аккаунте' : 'прогресс в этом браузере'}
          </p>
        </div>
        <button type="button" class="icon-btn" onClick={() => nav.go('settings')} aria-label="Настройки">
          <IconGear size={20} />
        </button>
      </div>

      <section class="sheet stack" aria-labelledby="today">
        <p class="section-title" id="today">
          Сегодня
        </p>
        <div class="hero">
          <div class="stat">
            <b>{due}</b>
            <span>{plural(due, 'повторение', 'повторения', 'повторений')}</span>
          </div>
          <div class="stat">
            <b>{newLeft}</b>
            <span>{plural(newLeft, 'новое', 'новых', 'новых')} в запасе</span>
          </div>
          <div class="stat">
            <b>{days}</b>
            <span>{plural(days, 'день', 'дня', 'дней')} подряд</span>
          </div>
        </div>
        {today && (
          <p class="muted small">
            Сегодня {today.n} {plural(today.n, 'ответ', 'ответа', 'ответов')}, верных {today.ok}.
          </p>
        )}
        <button type="button" class="btn btn-primary btn-block" onClick={() => nav.startSession({ kind: 'daily' })}>
          {due + newLeft > 0 ? 'Начать тренировку' : 'Всё сделано — потренироваться ещё'}
        </button>
        <div class="row">
          <button type="button" class="btn" style={{ flex: 1 }} onClick={() => nav.startSession({ kind: 'mistakes' })} disabled={openMistakes === 0}>
            Работа над ошибками{openMistakes ? ` · ${openMistakes}` : ''}
          </button>
          <button type="button" class="btn" style={{ flex: 1 }} onClick={() => (d.custom.length ? nav.startSession({ kind: 'custom' }) : nav.go('words'))}>
            {d.custom.length ? `Мои слова · ${d.custom.length}` : 'Добавить свои слова'}
          </button>
        </div>
      </section>

      <section class="stack" aria-labelledby="progress">
        <p class="section-title" id="progress">
          Прогресс
        </p>
        <div class="sheet stack">
          {levels.map((lvl) => {
            const items = lvl === 'own' ? d.custom : BUILTIN.filter((i) => i.level === lvl);
            const p = progressOf(items, d.states);
            const known = p.total ? (p.known / p.total) * 100 : 0;
            const started = p.total ? ((p.started - p.known) / p.total) * 100 : 0;
            return (
              <div class="progress-row" key={lvl}>
                <span class={`chip ${lvl === 'B2' ? 'chip-b2' : lvl === 'own' ? 'chip-own' : ''}`}>{lvl === 'own' ? 'МОИ' : lvl}</span>
                <div class="bar" role="img" aria-label={`Знаю ${p.known} из ${p.total}, изучаю ${p.started - p.known}`}>
                  <i class="known" style={{ width: `${known}%` }} />
                  <i class="started" style={{ width: `${started}%` }} />
                </div>
                <span class="small muted">
                  {p.known}/{p.total}
                </span>
              </div>
            );
          })}
          <p class="muted small">Зелёным — то, что вы уверенно помните (повторение не раньше чем через неделю), жёлтым — то, что изучаете.</p>
        </div>
      </section>

      <section class="stack" aria-labelledby="games">
        <p class="section-title" id="games">
          Игры со словами
        </p>
        <div class="tiles">
          <button type="button" class="tile" onClick={() => nav.go('games', 'filword')}>
            <span class="tile-icon">
              <IconGrid />
            </span>
            <span class="tile-text">
              <span class="tile-title">Филворд</span>
              <span class="muted small">Найдите слова, спрятанные змейкой</span>
            </span>
          </button>
          <button type="button" class="tile" onClick={() => nav.go('games', 'anagram')}>
            <span class="tile-icon">
              <IconShuffle />
            </span>
            <span class="tile-text">
              <span class="tile-title">Анаграммы</span>
              <span class="muted small">Соберите слово из букв</span>
            </span>
          </button>
          <button type="button" class="tile" onClick={() => nav.go('games', 'pairs')}>
            <span class="tile-icon">
              <IconCards />
            </span>
            <span class="tile-text">
              <span class="tile-title">Пары</span>
              <span class="muted small">Соедините слово и перевод на время</span>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
