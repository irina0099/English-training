import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { RULES_BY_ID } from '../content';
import { stage } from '../engine/fsrs';
import { getData } from '../engine/store';
import { canSpeak, speak } from '../tts';
import type { CardState, Item, VocabItem } from '../types';
import { useNav } from './context';
import { IconChevron, IconRule, IconSpeaker } from './icons';

/**
 * A Russian translation kept one tap away, so the page stays in English.
 * Settings → "Always show translations" shows them right away.
 */
export function Translation({ text, label = 'Show translation', lang = 'ru' }: { text: string; label?: string; lang?: string }) {
  const [open, setOpen] = useState(() => getData().settings.showTranslations);
  if (open) return <p class="example-ru" lang={lang}>{text}</p>;
  return (
    <button type="button" class="reveal" onClick={() => setOpen(true)}>
      {label}
    </button>
  );
}

/** Renders an example sentence, highlighting the *marked* target words. */
export function Example({ text, ru }: { text: string; ru?: string }) {
  const parts = text.split('*');
  return (
    <div class="stack-sm">
      <p class="example">
        {parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}
      </p>
      {ru && <Translation text={ru} />}
    </div>
  );
}

export function SpeakButton({ text, label = 'Listen' }: { text: string; label?: string }) {
  if (!canSpeak()) return null;
  return (
    <button type="button" class="icon-btn" onClick={() => speak(text)} aria-label={label} title={label}>
      <IconSpeaker size={20} />
    </button>
  );
}

export function LevelChip({ item }: { item: Item }) {
  if (item.kind !== 'drill' && item.custom) return <span class="chip chip-own">MINE</span>;
  if (!item.level) return null;
  return <span class={`chip ${item.level === 'B2' ? 'chip-b2' : ''}`}>{item.level}</span>;
}

const STAGE_LABEL = { new: 'new', learning: 'learning', known: 'known', mastered: 'mastered' } as const;

export function StageDot({ state }: { state: CardState | undefined }) {
  const st = stage(state);
  return <span class={`dot dot-${st}`} title={STAGE_LABEL[st]} aria-label={STAGE_LABEL[st]} />;
}

/** The short rule shown next to an answer, with a Russian version and a link to the full rule. */
export function RuleNote({ ruleId, heading = 'Why' }: { ruleId: string; heading?: string }) {
  const nav = useNav();
  const [ru, setRu] = useState(false);
  const rule = RULES_BY_ID[ruleId];
  if (!rule) return null;
  const text = ru ? rule.ru : rule;
  return (
    <div class="rule-note">
      <IconRule size={22} />
      <h4 lang={ru ? 'ru' : 'en'}>
        {heading}: {text.title}
      </h4>
      <p lang={ru ? 'ru' : 'en'}>{text.summary}</p>
      <div class="row" style={{ gap: '16px' }}>
        <button type="button" class="link" onClick={() => nav.openRule(rule.id)}>
          Full rule
        </button>
        <button type="button" class="link" aria-pressed={ru} onClick={() => setRu(!ru)}>
          {ru ? 'EN' : 'RU'}
        </button>
      </div>
    </div>
  );
}

/** Everything about one word or phrase: translation, example, usage note, rule. */
export function WordCard({ item }: { item: VocabItem }) {
  return (
    <div class="stack">
      <div class="row">
        <span class="word">{item.en}</span>
        <SpeakButton text={item.en} />
      </div>
      <div class="row">
        {item.pos && <span class="pos">{item.pos}</span>}
        <LevelChip item={item} />
        <span lang="ru">{item.ru}</span>
      </div>
      {item.ex && (
        <div class="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Example text={item.ex} ru={item.exRu} />
          </div>
          <SpeakButton text={item.ex} label="Listen to the example" />
        </div>
      )}
      {item.note && <p class="note">{item.note}</p>}
      {item.rule && <RuleNote ruleId={item.rule} heading="Rule" />}
    </div>
  );
}

/** iOS-style sheet: grabber, centred title, "Done" on the right. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Rendered into <body>: inside the page's scroll area, Safari on iPhone clips the
  // sheet to that area and the tab bar covers its bottom.
  return createPortal(
    <div class="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div class="modal-head">
          <span class="grabber" aria-hidden="true" />
          <h2>{title}</h2>
          <button type="button" class="nav-btn" onClick={onClose}>
            Done
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** A row of an inset grouped list, like in iOS Settings. */
export function Row({
  title,
  subtitle,
  value,
  icon,
  color,
  onClick,
  disabled,
  chevron = true,
}: {
  title: ComponentChildren;
  subtitle?: ComponentChildren;
  value?: ComponentChildren;
  icon?: ComponentChildren;
  color?: string;
  onClick?: () => void;
  disabled?: boolean;
  chevron?: boolean;
}) {
  return (
    <button type="button" class="list-item" onClick={onClick} disabled={disabled}>
      {icon && (
        <span class="app-icon" style={{ '--c': color } as Record<string, string>}>
          {icon}
        </span>
      )}
      <span class="list-item-main">
        <b>{title}</b>
        {subtitle && <span>{subtitle}</span>}
      </span>
      {value !== undefined && <span class="value">{value}</span>}
      {chevron && !disabled && <IconChevron class="chevron" />}
    </button>
  );
}

export function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" class="nav-back" onClick={onClick}>
      <IconChevron size={20} style={{ transform: 'rotate(180deg)' }} />
      {label}
    </button>
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
        style={{ flex: 1 }}
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" class="btn btn-ghost" onClick={() => setArmed(false)}>
        Cancel
      </button>
    </div>
  );
}

/** "1 word", "5 words". */
export function count(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function relativeDay(at: number, now = Date.now()): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (at >= start.getTime()) return 'today';
  const diff = Math.floor((start.getTime() - at) / 86400000) + 1;
  if (diff <= 1) return 'yesterday';
  return `${diff} days ago`;
}

export function dueLabel(state: CardState | undefined, now = Date.now()): string {
  if (!state) return 'not studied yet';
  const days = Math.ceil((state.due - now) / 86400000);
  if (days <= 0) return 'due for review';
  if (days === 1) return 'next review tomorrow';
  return `next review in ${days} days`;
}
