import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { BUILTIN, VOCAB } from '../content';
import { makeRng, randomSeed, type Rng } from '../engine/random';
import {
  buildTasks,
  checkExercise,
  gradeFor,
  makeExercise,
  planItems,
  retryPosition,
  type Exercise,
  type SessionContext,
  type SessionMode,
  type Task,
} from '../engine/session';
import { acceptAnswer, getData, newLeftToday, recordAnswer, studyItems, type AnswerRecord } from '../engine/store';
import { speak } from '../tts';
import type { Drill, Item, Verdict } from '../types';
import { Example, LevelChip, plural, RuleNote, SpeakButton, WordCard } from './common';
import { useNav } from './context';
import { IconCheckCircle, IconXCircle } from './icons';

interface Answered {
  verdict: Verdict;
  expected: string;
  given: string;
  record: AnswerRecord;
  accepted: boolean;
}

interface SessionMistake {
  item: Item;
  given: string;
  expected: string;
}

const MODE_TITLE: Record<SessionMode['kind'], string> = {
  daily: 'Тренировка',
  mistakes: 'Работа над ошибками',
  custom: 'Мои слова',
  rule: 'Правило',
};

const PRAISE = ['Верно!', 'Отлично!', 'Так держать!', 'Точно!', 'Правильно!'];

function contextFor(mode: SessionMode, rng: Rng, extraNew = 0): SessionContext {
  const d = getData();
  const now = Date.now();
  const everything = [...BUILTIN, ...d.custom];
  return {
    items: mode.kind === 'daily' || mode.kind === 'custom' ? studyItems(d) : everything,
    vocab: [...VOCAB, ...d.custom],
    states: d.states,
    mistakes: d.mistakes,
    now,
    size: d.settings.sessionSize,
    newLeft: newLeftToday(d, now) + extraNew,
    rng,
  };
}

function planSession(mode: SessionMode, rng: Rng, extraNew = 0): Task[] {
  const ctx = contextFor(mode, rng, extraNew);
  return buildTasks(planItems(mode, ctx), ctx);
}

export function Session({ mode, onClose }: { mode: SessionMode; onClose: () => void }) {
  const rng = useMemo(() => makeRng(randomSeed()), []);
  const [tasks, setTasks] = useState<Task[]>(() => planSession(mode, rng));
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [mistakes, setMistakes] = useState<SessionMistake[]>([]);
  const [score, setScore] = useState({ n: 0, ok: 0 });
  const retries = useRef(new Map<string, number>());

  const task = tasks[index];
  const finished = index >= tasks.length;

  const submit = (given: string, ms: number, usedHint: boolean) => {
    if (!task || answered) return;
    const ex = task.ex;
    const { verdict, expected } = checkExercise(ex, given);
    const grade = gradeFor(ex.t, verdict, ms, usedHint);
    const record = recordAnswer(ex, verdict, given, grade, Boolean(task.retry));
    setAnswered({ verdict, expected, given, record, accepted: false });
    setScore((s) => ({ n: s.n + 1, ok: s.ok + (verdict === 'wrong' ? 0 : 1) }));
    if (verdict !== 'ok') setMistakes((list) => [...list, { item: ex.item, given, expected }]);
    if (verdict === 'wrong') {
      const count = retries.current.get(ex.item.id) ?? 0;
      if (count < 2) {
        retries.current.set(ex.item.id, count + 1);
        const state = getData().states[ex.item.id];
        const again: Task = { ex: makeExercise(ex.item, state, { vocab: [...VOCAB, ...getData().custom], rng }, ex.t), retry: true };
        setTasks((list) => {
          const next = list.slice();
          next.splice(retryPosition(index + 1, next.length, rng), 0, again);
          return next;
        });
      }
    }
  };

  const accept = () => {
    if (!answered || answered.accepted) return;
    acceptAnswer(answered.record);
    setAnswered({ ...answered, accepted: true, verdict: 'ok' });
    setScore((s) => ({ ...s, ok: s.ok + 1 }));
    setMistakes((list) => list.slice(0, -1));
    // The repeat is no longer needed.
    setTasks((list) => {
      const id = task.ex.item.id;
      const at = list.findIndex((t, i) => i > index && t.retry && t.ex.item.id === id);
      return at < 0 ? list : [...list.slice(0, at), ...list.slice(at + 1)];
    });
  };

  const next = () => {
    setAnswered(null);
    setIndex((i) => i + 1);
  };

  const moreNew = () => {
    setTasks(planSession(mode, rng, 5));
    setIndex(0);
  };

  const progress = tasks.length ? Math.min(100, (index / tasks.length) * 100) : 0;

  return (
    <div class="session" role="dialog" aria-label={MODE_TITLE[mode.kind]}>
      <div class="session-bar">
        <div class="session-top">
          <button type="button" class="nav-btn" style={{ justifySelf: 'start' }} onClick={onClose}>
            Закрыть
          </button>
          <span class="counter">{tasks.length ? `${Math.min(index + 1, tasks.length)} из ${tasks.length}` : MODE_TITLE[mode.kind]}</span>
          <span />
        </div>
        <div class="session-progress" aria-hidden="true">
          <i style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div class="session-inner">
        {tasks.length === 0 ? (
          <NothingToDo mode={mode} onClose={onClose} onMoreNew={moreNew} />
        ) : finished ? (
          <Summary mode={mode} score={score} mistakes={mistakes} onClose={onClose} />
        ) : (
          <TaskView key={`${index}-${task.ex.item.id}-${task.ex.t}`} task={task} answered={answered} onSubmit={submit} onNext={next} onAccept={accept} />
        )}
      </div>
    </div>
  );
}

function NothingToDo({ mode, onClose, onMoreNew }: { mode: SessionMode; onClose: () => void; onMoreNew: () => void }) {
  const nav = useNav();
  const text =
    mode.kind === 'mistakes'
      ? 'Ошибок для повторения нет. Когда вы ошибётесь в задании, оно появится здесь.'
      : mode.kind === 'custom'
        ? 'Своих слов пока нет. Добавьте слова в словаре, и они сразу появятся в тренировках.'
        : 'На сегодня всё повторено, и дневной лимит новых слов исчерпан.';
  return (
    <div class="sheet empty">
      <p class="title" style={{ fontSize: '1.2rem' }}>
        Пока нечего тренировать
      </p>
      <p>{text}</p>
      <div class="row" style={{ justifyContent: 'center' }}>
        {mode.kind === 'daily' && (
          <button type="button" class="btn btn-primary" onClick={onMoreNew}>
            Взять ещё 5 новых
          </button>
        )}
        {mode.kind === 'custom' && (
          <button
            type="button"
            class="btn btn-primary"
            onClick={() => {
              onClose();
              nav.go('words');
            }}
          >
            Добавить слова
          </button>
        )}
        <button
          type="button"
          class="btn"
          onClick={() => {
            onClose();
            nav.go('games');
          }}
        >
          Поиграть
        </button>
      </div>
    </div>
  );
}

function Summary({ mode, score, mistakes, onClose }: { mode: SessionMode; score: { n: number; ok: number }; mistakes: SessionMistake[]; onClose: () => void }) {
  const nav = useNav();
  const unique = mistakes.filter((m, i) => mistakes.findIndex((x) => x.item.id === m.item.id) === i);
  const rules = [...new Set(unique.map((m) => m.item.rule).filter((r): r is string => Boolean(r)))];
  return (
    <div class="stack">
      <div class="sheet stack">
        <p class="section-title">{MODE_TITLE[mode.kind]} завершена</p>
        <p class="title">
          {score.ok} из {score.n} {plural(score.n, 'ответа', 'ответов', 'ответов')} верно
        </p>
        <p class="muted">
          {unique.length === 0
            ? 'Без единой ошибки. Следующее повторение запланировано автоматически.'
            : `Слова и задания с ошибками вернутся раньше обычного, пока вы не ответите на них верно три раза подряд.`}
        </p>
      </div>
      {unique.length > 0 && (
        <div class="stack">
          <p class="section-title">Над чем поработать</p>
          <div class="list">
            {unique.map((m) => (
              <div class="list-item" key={m.item.id}>
                <div class="list-item-main">
                  <b>{m.item.kind === 'drill' ? m.item.q.replace('___', '…') : m.item.en}</b>
                  <div class="red-pen">
                    {m.given && <s>{m.given}</s>}
                    <span class="fix">{m.expected}</span>
                  </div>
                </div>
                <LevelChip item={m.item} />
              </div>
            ))}
          </div>
          {rules.map((r) => (
            <RuleNote key={r} ruleId={r} heading="Повторите правило" />
          ))}
        </div>
      )}
      <div class="sticky-actions">
        {unique.length > 0 && mode.kind !== 'mistakes' && (
          <button type="button" class="btn" onClick={() => nav.startSession({ kind: 'mistakes' })}>
            Работа над ошибками
          </button>
        )}
        <button type="button" class="btn btn-primary" onClick={onClose}>
          Готово
        </button>
      </div>
    </div>
  );
}

const KIND_LABEL: Record<Exercise['t'], string> = {
  intro: 'Новое слово',
  'pick-ru': 'Выберите перевод',
  'pick-en': 'Как сказать по-английски?',
  'type-en': 'Напишите по-английски',
  gap: 'Вставьте слово',
  build: 'Соберите фразу',
  'drill-pick': 'Выберите вариант',
  'drill-type': 'Впишите пропущенное',
  'drill-fix': 'Какое предложение правильное?',
};

interface TaskProps {
  task: Task;
  answered: Answered | null;
  onSubmit: (given: string, ms: number, usedHint: boolean) => void;
  onNext: () => void;
  onAccept: () => void;
}

function TaskView({ task, answered, onSubmit, onNext, onAccept }: TaskProps) {
  const ex = task.ex;
  const started = useRef(Date.now());
  const [hint, setHint] = useState(false);
  const submit = (given: string) => onSubmit(given, Date.now() - started.current, hint);

  useEffect(() => {
    const auto = getData().settings.autoSpeak;
    if (auto && (ex.t === 'intro' || ex.t === 'pick-ru')) speak(ex.item.en);
  }, []);

  useEffect(() => {
    if (!answered && ex.t !== 'intro') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        onNext();
      }
    };
    // Let the Enter that submitted the answer finish first.
    const t = setTimeout(() => window.addEventListener('keydown', onKey), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [answered, ex.t]);

  if (ex.t === 'intro') {
    return (
      <div class="stack">
        <p class="task-kind">{KIND_LABEL.intro}</p>
        <div class="sheet">
          <WordCard item={ex.item} />
        </div>
        <div class="sticky-actions">
          <button type="button" class="btn btn-primary" onClick={onNext}>
            Запомнил(а), дальше
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="stack">
      <div class="row">
        <p class="task-kind">{task.retry ? 'Ещё раз · ' : ''}{KIND_LABEL[ex.t]}</p>
        <span class="spacer" />
        <LevelChip item={ex.item} />
      </div>
      <Prompt ex={ex} hint={hint} />
      {(ex.t === 'pick-ru' || ex.t === 'pick-en' || ex.t === 'drill-pick' || ex.t === 'drill-fix') && (
        <Options options={ex.options} answer={ex.answer} answered={answered} onPick={submit} />
      )}
      {(ex.t === 'type-en' || ex.t === 'gap' || ex.t === 'drill-type') && (
        <TypeAnswer answered={answered} onSubmit={submit} canHint={!hint} onHint={() => setHint(true)} />
      )}
      {ex.t === 'build' && <BuildPhrase tiles={ex.tiles} answered={answered} onSubmit={submit} />}
      {answered && <Feedback ex={ex} answered={answered} onNext={onNext} onAccept={onAccept} />}
    </div>
  );
}

function fillDrill(d: Drill): string {
  return d.fix ? `*${d.a}*` : d.q.replace('___', `*${d.a}*`);
}

function hintText(ex: Exercise): string {
  const answer = ex.t === 'type-en' ? ex.item.en : 'answer' in ex ? ex.answer : '';
  return answer
    .split(' ')
    .map((w) => w[0] + w.slice(1).replace(/[a-zA-Z]/g, '·'))
    .join(' ');
}

function Prompt({ ex, hint }: { ex: Exercise; hint: boolean }) {
  switch (ex.t) {
    case 'pick-ru':
      return (
        <div class="sheet row">
          <span class="word">{ex.item.en}</span>
          <SpeakButton text={ex.item.en} />
        </div>
      );
    case 'pick-en':
      return (
        <div class="sheet stack-sm">
          {ex.item.kind === 'phrase' && ex.item.sit ? (
            <>
              <p class="muted small">Ситуация</p>
              <p class="prompt">{ex.prompt}</p>
            </>
          ) : (
            <p class="prompt">{ex.prompt}</p>
          )}
        </div>
      );
    case 'type-en':
      return (
        <div class="sheet stack-sm">
          <p class="prompt">{ex.item.ru}</p>
          {ex.item.pos && <p class="pos">{ex.item.pos}</p>}
          {hint && <p class="muted">Подсказка: {hintText(ex)}</p>}
        </div>
      );
    case 'gap':
      return (
        <div class="sheet stack-sm">
          <p class="prompt-sentence">
            {ex.before}
            <span class="blank">{hint ? hintText(ex) : '?'}</span>
            {ex.after}
          </p>
          <p class="muted small">
            Подсказка: {ex.item.ru}
            {ex.item.exRu ? ` · ${ex.item.exRu}` : ''}
          </p>
        </div>
      );
    case 'build':
      return (
        <div class="sheet stack-sm">
          <p class="prompt">{ex.item.ru}</p>
          {ex.item.sit && <p class="muted small">{ex.item.sit}</p>}
        </div>
      );
    case 'drill-pick':
    case 'drill-type': {
      const [before, after] = ex.item.q.split('___');
      return (
        <div class="sheet stack-sm">
          <p class="prompt-sentence">
            {before}
            <span class="blank">{hint && ex.t === 'drill-type' ? hintText(ex) : '?'}</span>
            {after}
          </p>
          {ex.item.ru && <p class="muted small">{ex.item.ru}</p>}
        </div>
      );
    }
    case 'drill-fix':
      return (
        <div class="sheet stack-sm">
          <p class="muted small">Смысл: {ex.item.ru}</p>
        </div>
      );
    default:
      return null;
  }
}

function Options({ options, answer, answered, onPick }: { options: string[]; answer: string; answered: Answered | null; onPick: (v: string) => void }) {
  useEffect(() => {
    if (answered) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) onPick(options[n - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, options]);
  return (
    <div class="options">
      {options.map((opt, i) => {
        const cls = answered ? (opt === answer ? 'is-right' : opt === answered.given ? 'is-wrong' : '') : '';
        return (
          <button type="button" key={opt} class={`option ${cls}`} disabled={Boolean(answered)} onClick={() => onPick(opt)}>
            <kbd>{i + 1}</kbd>
            <span>{opt}</span>
            {cls === 'is-right' && <IconCheckCircle class="mark-icon" />}
            {cls === 'is-wrong' && <IconXCircle class="mark-icon" />}
          </button>
        );
      })}
    </div>
  );
}

function TypeAnswer({ answered, onSubmit, canHint, onHint }: { answered: Answered | null; onSubmit: (v: string) => void; canHint: boolean; onHint: () => void }) {
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const cls = answered ? (answered.verdict === 'wrong' ? 'is-wrong' : 'is-right') : '';
  return (
    <form
      class="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (!answered && value.trim()) onSubmit(value.trim());
      }}
    >
      <label class="sr-only" for="answer">
        Ваш ответ
      </label>
      <input
        id="answer"
        ref={input}
        class={`answer-input ${cls}`}
        value={value}
        onInput={(e) => setValue(e.currentTarget.value)}
        readOnly={Boolean(answered)}
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck={false}
        lang="en"
        placeholder="Ответ по-английски"
      />
      {!answered && (
        <div class="row">
          <button type="submit" class="btn btn-primary" style={{ flex: 1 }} disabled={!value.trim()}>
            Проверить
          </button>
          {canHint && (
            <button type="button" class="btn btn-ghost" onClick={onHint}>
              Подсказка
            </button>
          )}
          <button type="button" class="btn btn-ghost" onClick={() => onSubmit('')}>
            Не знаю
          </button>
        </div>
      )}
    </form>
  );
}

function BuildPhrase({ tiles, answered, onSubmit }: { tiles: string[]; answered: Answered | null; onSubmit: (v: string) => void }) {
  const [chosen, setChosen] = useState<number[]>([]);
  const complete = chosen.length === tiles.length;
  return (
    <div class="stack">
      <div class="tiles-line" aria-label="Ваша фраза">
        {chosen.length === 0 && <span class="muted small">Нажимайте на слова по порядку</span>}
        {chosen.map((i, pos) => (
          <button type="button" key={`${i}-${pos}`} class="word-tile" disabled={Boolean(answered)} onClick={() => setChosen((c) => c.filter((_, k) => k !== pos))}>
            {tiles[i]}
          </button>
        ))}
      </div>
      <div class="row key-tray" style={{ justifyContent: 'center' }}>
        {tiles.map((t, i) => (
          <button type="button" key={i} class={`word-tile ${chosen.includes(i) ? 'used' : ''}`} disabled={Boolean(answered) || chosen.includes(i)} onClick={() => setChosen((c) => [...c, i])}>
            {t}
          </button>
        ))}
      </div>
      {!answered && (
        <button type="button" class="btn btn-primary" disabled={!complete} onClick={() => onSubmit(chosen.map((i) => tiles[i]).join(' '))}>
          Проверить
        </button>
      )}
    </div>
  );
}

function Feedback({ ex, answered, onNext, onAccept }: { ex: Exercise; answered: Answered; onNext: () => void; onAccept: () => void }) {
  const { verdict } = answered;
  const praise = useMemo(() => PRAISE[Math.floor(Math.random() * PRAISE.length)], []);
  const typed = ex.t === 'type-en' || ex.t === 'gap' || ex.t === 'drill-type';
  return (
    <div class={`sheet feedback ${verdict === 'wrong' ? 'is-wrong' : verdict === 'typo' ? 'is-typo' : ''}`} aria-live="polite">
      <p class={`verdict ${verdict}`}>
        {verdict === 'wrong' ? <IconXCircle size={26} /> : <IconCheckCircle size={26} />}
        {answered.accepted ? 'Засчитано' : verdict === 'ok' ? praise : verdict === 'typo' ? 'Почти! Проверьте написание' : 'Ошибка'}
      </p>
      {verdict !== 'ok' && (
        <div class="red-pen">
          {answered.given ? <s>{answered.given}</s> : <span class="muted">нет ответа</span>}
          <span class="fix">{answered.expected}</span>
        </div>
      )}
      {ex.item.kind === 'drill' ? (
        <div class="stack">
          <Example text={fillDrill(ex.item)} ru={ex.item.ru} />
          <RuleNote ruleId={ex.item.rule} />
        </div>
      ) : (
        <WordCard item={ex.item} />
      )}
      <div class="sticky-actions">
        {typed && verdict === 'wrong' && answered.given && !answered.accepted && (
          <button type="button" class="btn btn-ghost" onClick={onAccept}>
            Мой ответ тоже верный
          </button>
        )}
        <button type="button" class="btn btn-primary" onClick={onNext}>
          Дальше
        </button>
      </div>
    </div>
  );
}
