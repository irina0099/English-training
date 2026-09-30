import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { RULES_BY_ID } from '../content';
import { stage } from '../engine/fsrs';
import { canSpeak, speak } from '../tts';
import type { CardState, Item, VocabItem } from '../types';
import { useNav } from './context';
import { IconClose, IconSpeaker } from './icons';

/** Renders an example sentence, highlighting the *marked* target words. */
export function Example({ text, ru }: { text: string; ru?: string }) {
  const parts = text.split('*');
  return (
    <div class="stack-sm">
      <p class="example">
        {parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}
      </p>
      {ru && <p class="example-ru">{ru}</p>}
    </div>
  );
}

export function SpeakButton({ text, label = 'Произнести' }: { text: string; label?: string }) {
  if (!canSpeak()) return null;
  return (
    <button type="button" class="icon-btn" onClick={() => speak(text)} aria-label={label} title={label}>
      <IconSpeaker size={20} />
    </button>
  );
}

export function LevelChip({ item }: { item: Item }) {
  if (item.kind !== 'drill' && item.custom) return <span class="chip chip-own">МОЁ</span>;
  if (!item.level) return null;
  return <span class={`chip ${item.level === 'B2' ? 'chip-b2' : ''}`}>{item.level}</span>;
}

const STAGE_LABEL = { new: 'новое', learning: 'учу', known: 'знаю', mastered: 'выучено' } as const;

export function StageDot({ state }: { state: CardState | undefined }) {
  const st = stage(state);
  return <span class={`dot dot-${st}`} title={STAGE_LABEL[st]} aria-label={STAGE_LABEL[st]} />;
}

export function stageLabel(state: CardState | undefined): string {
  return STAGE_LABEL[stage(state)];
}

/** The short rule shown next to an answer, with a link to the full explanation. */
export function RuleNote({ ruleId, heading = 'Почему так' }: { ruleId: string; heading?: string }) {
  const nav = useNav();
  const rule = RULES_BY_ID[ruleId];
  if (!rule) return null;
  return (
    <div class="rule-note">
      <h4>
        {heading}: {rule.title}
      </h4>
      <p>{rule.summary}</p>
      <div>
        <button type="button" class="link" onClick={() => nav.openRule(rule.id)}>
          Правило целиком
        </button>
      </div>
    </div>
  );
}

/** Everything about one word or phrase: translation, example, usage note, rule. */
export function WordCard({ item, compact = false }: { item: VocabItem; compact?: boolean }) {
  return (
    <div class="stack">
      {!compact && (
        <div class="row">
          <span class="word">{item.en}</span>
          <SpeakButton text={item.en} />
        </div>
      )}
      <div class="row">
        {item.pos && <span class="pos">{item.pos}</span>}
        <LevelChip item={item} />
        <span>{item.ru}</span>
      </div>
      {item.ex && (
        <div class="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Example text={item.ex} ru={item.exRu} />
          </div>
          <SpeakButton text={item.ex} label="Произнести пример" />
        </div>
      )}
      {item.note && <p class="note">{item.note}</p>}
      {item.rule && <RuleNote ruleId={item.rule} heading="Правило" />}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div class="page-head">
          <h2 class="title" style={{ fontSize: '1.2rem' }}>
            {title}
          </h2>
          <button type="button" class="icon-btn" onClick={onClose} aria-label="Закрыть">
            <IconClose size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Two-step button for destructive actions: the page can't rely on confirm() dialogs. */
export function ConfirmButton({ label, confirmLabel, onConfirm, class: cls = 'btn btn-danger' }: { label: string; confirmLabel: string; onConfirm: () => void; class?: string }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" class={cls} onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <div class="row">
      <button
        type="button"
        class="btn btn-danger"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" class="btn btn-ghost" onClick={() => setArmed(false)}>
        Отмена
      </button>
    </div>
  );
}

export function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function relativeDay(at: number, now = Date.now()): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const diff = Math.floor((start.getTime() - at) / 86400000) + 1;
  if (at >= start.getTime()) return 'сегодня';
  if (diff <= 1) return 'вчера';
  return `${diff} ${plural(diff, 'день', 'дня', 'дней')} назад`;
}

export function dueLabel(state: CardState | undefined, now = Date.now()): string {
  if (!state) return 'ещё не изучали';
  const days = Math.ceil((state.due - now) / 86400000);
  if (days <= 0) return 'пора повторить';
  if (days === 1) return 'повторение завтра';
  return `повторение через ${days} ${plural(days, 'день', 'дня', 'дней')}`;
}
