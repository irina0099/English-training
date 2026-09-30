/** Pronunciation through the browser's speech synthesis, when it has an English voice. */

let cachedVoice: SpeechSynthesisVoice | null | undefined;

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

function voice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  cachedVoice = en.find((v) => v.lang === 'en-GB') ?? en.find((v) => v.lang === 'en-US') ?? en[0] ?? null;
  return cachedVoice;
}

export function speak(text: string) {
  if (!canSpeak()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/\*/g, '').replace(/…/g, ''));
    const v = voice();
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'en-GB';
    u.rate = 0.92;
    synth.speak(u);
  } catch {
    // Speech is a convenience; ignore browsers that refuse it.
  }
}

if (canSpeak()) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => (cachedVoice = undefined));
}
