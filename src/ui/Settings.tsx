import { useState } from 'preact/hooks';
import type { CloudStatus } from '../engine/cloud';
import { BackupError, exportJson, importJson, replaceData, resetProgress, updateSettings } from '../engine/store';
import { canSpeak, speak } from '../tts';
import type { Level } from '../types';
import { BackButton, ConfirmButton } from './common';
import { useNav } from './context';
import { useData } from './hooks';
import { IconCheck } from './icons';

const IS_ARTIFACT = import.meta.env.MODE === 'artifact';

export function Settings({ cloud }: { cloud: CloudStatus }) {
  const d = useData();
  const nav = useNav();
  const s = d.settings;
  const [backup, setBackup] = useState('');
  const [message, setMessage] = useState('');

  const toggleLevel = (l: Level) => {
    const has = s.levels.includes(l);
    const levels = has ? s.levels.filter((x) => x !== l) : [...s.levels, l].sort();
    if (levels.length) updateSettings({ levels });
  };

  const copy = async () => {
    const text = exportJson(d);
    setBackup(text);
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Backup copied. Keep it in Notes or in a file.');
    } catch {
      setMessage('Copy the text from the box below.');
    }
  };

  const download = () => {
    const blob = new Blob([exportJson(d)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `english-notebook-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const restore = (text: string) => {
    try {
      replaceData(importJson(text), true);
      setMessage('Progress restored from the backup.');
      setBackup('');
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
        <p class="section-title">Level</p>
        <div class="list">
          {(['B1', 'B2'] as const).map((l) => (
            <button type="button" key={l} class="list-item" role="menuitemcheckbox" aria-checked={s.levels.includes(l)} onClick={() => toggleLevel(l)}>
              <span class="list-item-main">
                <b>{l === 'B1' ? 'B1 — Intermediate' : 'B2 — Upper-intermediate'}</b>
              </span>
              {s.levels.includes(l) && <IconCheck class="check" size={20} />}
            </button>
          ))}
        </div>
        <p class="footnote">You can choose both. Your own words are always included.</p>
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
                <b style={{ color: 'var(--blue)' }}>Download as a file</b>
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
        {message && <p class="footnote">{message}</p>}
      </section>

      <section class="section">
        <ConfirmButton class="btn btn-danger btn-block" label="Reset progress" confirmLabel="Yes, reset everything" onConfirm={resetProgress} />
        <p class="footnote">This deletes your review schedule, statistics and mistakes list. Your own words stay.</p>
      </section>
    </div>
  );
}
