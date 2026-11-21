import { useState } from 'preact/hooks';
import type { CloudStatus } from '../engine/cloud';
import { BackupError, exportJson, importJson, replaceData, resetProgress, updateSettings } from '../engine/store';
import { shareFile } from '../reading/exportpdf';
import { readingBackup, restoreReading } from '../reading/store';
import { canSpeak, speak } from '../tts';
import type { Level } from '../types';
import { BackButton, ConfirmButton } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconCheck } from './icons';

const IS_ARTIFACT = import.meta.env.MODE === 'artifact';

/** A checked backup: the progress and, in newer backups, the magazine notes. */
interface Restore {
  next: ReturnType<typeof importJson>;
  reading: unknown;
}

export function Settings({ cloud }: { cloud: CloudStatus }) {
  const d = useData();
  const nav = useNav();
  const s = d.settings;
  const [backup, setBackup] = useState('');
  const [message, setMessage] = useState('');
  /** A checked backup waiting for "Replace" while the progress is synced to the account. */
  const [pending, setPending] = useState<Restore | null>(null);

  const toggleLevel = (l: Level) => {
    const has = s.levels.includes(l);
    const levels = has ? s.levels.filter((x) => x !== l) : [...s.levels, l].sort();
    if (levels.length) updateSettings({ levels });
  };

  /** Progress plus magazine notes (highlights, drawings, text); the magazines' PDFs stay out, they are large. */
  const backupText = () => JSON.stringify({ ...(JSON.parse(exportJson(d)) as object), reading: readingBackup() });

  const copy = async () => {
    const text = backupText();
    setBackup(text);
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Backup copied. Keep it in Notes or in a file.');
    } catch {
      setMessage('Copy the text from the box below.');
    }
  };

  const download = async () => {
    const blob = new Blob([backupText()], { type: 'application/json' });
    // On iPhone this opens the share sheet: "Save to Files" → iCloud Drive.
    const how = await shareFile(blob, `english-notebook-${new Date().toISOString().slice(0, 10)}.json`);
    if (how !== 'cancelled') setMessage('Backup saved. It includes your magazine notes, but not the magazines themselves: keep their PDFs too.');
  };

  const apply = ({ next, reading }: Restore) => {
    replaceData(next, true);
    restoreReading(reading);
    setPending(null);
    setMessage(reading ? 'Progress and magazine notes restored. If a magazine is missing its file, add its PDF again in Read: its notes will be there.' : 'Progress restored from the backup.');
    setBackup('');
  };

  const restore = (text: string) => {
    try {
      const next = importJson(text);
      const parsed = JSON.parse(text) as { reading?: unknown };
      // Synced progress is replaced on every device: ask first.
      if (cloud === 'synced') {
        setPending({ next, reading: parsed.reading });
        setMessage('');
      } else apply({ next, reading: parsed.reading });
    } catch (e) {
      setMessage(e instanceof BackupError ? e.message : 'Couldn’t read the backup. Check that you copied all of the text.');
    }
  };

  return (
    <div class="page">
      <div class="stack-sm">
        <BackButton label="Today" onClick={() => nav.go('home')} />
        <h1 class="title">Settings</h1>
      </div>

      <section class="section">
        <p class="section-title">Built-in words</p>
        <div class="list">
          {(['B1', 'B2'] as const).map((l) => (
            <button type="button" key={l} class="list-item" role="menuitemcheckbox" aria-checked={s.levels.includes(l)} onClick={() => toggleLevel(l)}>
              <span class="list-item-main">
                <b>{l === 'B1' ? 'Everyday words' : 'Advanced words'}</b>
              </span>
              {s.levels.includes(l) && <IconCheck class="check" size={20} />}
            </button>
          ))}
        </div>
        <p class="footnote">Which of the app’s word lists join your practice. Your own words and words from reading are always included.</p>
      </section>

      <section class="section">
        <p class="section-title">Tasks per practice</p>
        <div class="segmented" role="group" aria-label="Tasks per practice">
          {[10, 15, 20, 30].map((n) => (
            <button type="button" key={n} aria-pressed={s.sessionSize === n} onClick={() => updateSettings({ sessionSize: n })}>
              {n}
            </button>
          ))}
        </div>
      </section>

      <section class="section">
        <p class="section-title">New words and tasks per day</p>
        <div class="segmented" role="group" aria-label="New per day">
          {[5, 10, 15, 20].map((n) => (
            <button type="button" key={n} aria-pressed={s.newPerDay === n} onClick={() => updateSettings({ newPerDay: n })}>
              {n}
            </button>
          ))}
        </div>
      </section>

      {canSpeak() && (
        <section class="section">
          <p class="section-title">Pronunciation</p>
          <div class="list">
            <label class="list-item" for="auto-speak">
              <span class="list-item-main">
                <b>Say new words aloud</b>
              </span>
              <input id="auto-speak" type="checkbox" class="switch" checked={s.autoSpeak} onChange={(e) => updateSettings({ autoSpeak: e.currentTarget.checked })} />
            </label>
            <button type="button" class="list-item" onClick={() => speak('I’m looking forward to seeing you.')}>
              <span class="list-item-main">
                <b style={{ color: 'var(--blue)' }}>Test the sound</b>
              </span>
            </button>
          </div>
        </section>
      )}

      <section class="section">
        <p class="section-title">Translations</p>
        <div class="list">
          <label class="list-item" for="show-ru">
            <span class="list-item-main">
              <b>Always show translations</b>
            </span>
            <input id="show-ru" type="checkbox" class="switch" checked={s.showTranslations} onChange={(e) => updateSettings({ showTranslations: e.currentTarget.checked })} />
          </label>
        </div>
        <p class="footnote">Off: translations of examples and sentences stay hidden until you tap “Show translation”, so you think in English first.</p>
      </section>

      <section class="section">
        <p class="section-title">Backup</p>
        <div class="list">
          <button type="button" class="list-item" onClick={copy}>
            <span class="list-item-main">
              <b style={{ color: 'var(--blue)' }}>Copy a backup of my progress</b>
            </span>
          </button>
          {!IS_ARTIFACT && (
            <button type="button" class="list-item" onClick={download}>
              <span class="list-item-main">
                <b style={{ color: 'var(--blue)' }}>Save to Files (iCloud Drive)</b>
              </span>
            </button>
          )}
          <label class="list-item" style={{ cursor: 'pointer' }}>
            <span class="list-item-main">
              <b style={{ color: 'var(--blue)' }}>Restore from a file…</b>
            </span>
            <input
              type="file"
              accept="application/json,.json"
              class="sr-only"
              onChange={async (e) => {
                const file = e.currentTarget.files?.[0];
                if (file) restore(await file.text());
              }}
            />
          </label>
        </div>
        <p class="footnote">
          {cloud === 'synced'
            ? 'Your progress is saved to your Claude account, so it’s the same on every device where you open this page.'
            : cloud === 'connecting'
              ? 'Connecting to your account…'
              : 'Your progress is saved in this browser. To move it to another device, copy a backup and paste it there.'}
        </p>
      </section>

      <section class="section">
        <div class="field">
          <label for="backup">Paste a backup to restore it</label>
          <textarea id="backup" value={backup} onInput={(e) => setBackup(e.currentTarget.value)} spellcheck={false} />
        </div>
        <button type="button" class="btn" disabled={!backup.trim()} onClick={() => restore(backup)}>
          Restore from text
        </button>
        {pending && (
          <div class="stack-sm">
            <p class="footnote">The backup will replace your progress on every device that uses this account, including anything newer than the backup.</p>
            <div class="row">
              <button type="button" class="btn btn-danger" style={{ flex: 1 }} onClick={() => apply(pending)}>
                Replace my progress
              </button>
              <button type="button" class="btn" style={{ flex: 1 }} onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {message && <p class="footnote">{message}</p>}
      </section>

      <section class="section">
        <ConfirmButton class="btn btn-danger btn-block" label="Reset progress" confirmLabel="Yes, reset everything" onConfirm={resetProgress} />
        <p class="footnote">This deletes your review schedule, statistics and mistakes list. Your own words stay.</p>
      </section>
    </div>
  );
}
