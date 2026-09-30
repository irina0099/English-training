export type Level = 'B1' | 'B2';

/** A word, phrasal verb or conversational phrase. */
export interface VocabItem {
  id: string;
  kind: 'word' | 'phrase';
  /** English headword or phrase — the main expected answer. */
  en: string;
  /** Other accepted English answers. */
  alt?: string[];
  /** Russian translation. */
  ru: string;
  /** Null for the learner's own words without a level. */
  level: Level | null;
  /** Part of speech: n, v, adj, adv, phr v, expr… */
  pos?: string;
  /** English example; the target form is wrapped in *asterisks*. */
  ex?: string;
  exRu?: string;
  /** Short usage note shown with the answer. */
  note?: string;
  /** Id of the grammar rule that explains typical mistakes with this item. */
  rule?: string;
  /** Situation prompt for phrases, in English: when would you say it? */
  sit?: string;
  /** The same situation in Russian. */
  sitRu?: string;
  /** Base verb of a phrasal verb: "get" for "get over". */
  family?: string;
  custom?: boolean;
  createdAt?: number;
}

/** A grammar drill: a sentence with a gap, or a "which sentence is correct" task. */
export interface Drill {
  id: string;
  kind: 'drill';
  level: Level;
  rule: string;
  /** Sentence with ___ for the gap. For fix drills — the incorrect sentence. */
  q: string;
  /** Correct answer (the gap filler, or the corrected sentence for fix drills). */
  a: string;
  alt?: string[];
  /** Wrong options for multiple choice. */
  wrong: string[];
  /** Russian translation of the sentence. */
  ru?: string;
  /** Choose the correct sentence instead of filling a gap. */
  fix?: boolean;
  /** Allow typing the answer (default: true for gap drills). */
  typeable?: boolean;
}

export type Item = VocabItem | Drill;

export interface RuleText {
  title: string;
  /** One or two sentences: the short version shown after an answer. */
  summary: string;
  points: string[];
}

/** A grammar rule in simple English, with a Russian version on request. */
export interface Rule extends RuleText {
  id: string;
  level: Level;
  /** Pairs of [correct, incorrect?]. */
  examples: [string, string?][];
  ru: RuleText;
}

/** FSRS memory state of one item. Times are epoch milliseconds. */
export interface CardState {
  due: number;
  /** Stability, days. */
  s: number;
  /** Difficulty, 1..10. */
  d: number;
  reps: number;
  lapses: number;
  last: number;
  /** Correct answers in a row. */
  ok: number;
}

export type Grade = 1 | 2 | 3 | 4;

export interface Mistake {
  id: string;
  at: number;
  given: string;
  expected: string;
  ex: ExerciseType;
  /** Rule id, 'vocab', 'spelling' or 'games'. */
  cat: string;
}

export interface DayStat {
  /** Answers given. */
  n: number;
  /** Correct answers. */
  ok: number;
  /** New items introduced. */
  new: number;
}

export interface Settings {
  levels: Level[];
  sessionSize: number;
  newPerDay: number;
  autoSpeak: boolean;
  /** Show Russian translations of examples right away instead of on tap. */
  showTranslations: boolean;
}

export interface AppData {
  v: 1;
  states: Record<string, CardState>;
  mistakes: Mistake[];
  custom: VocabItem[];
  settings: Settings;
  days: Record<string, DayStat>;
  /** Per-rule counters: attempts and errors. */
  ruleStats: Record<string, { n: number; e: number }>;
  /** Last change per sync section. */
  stamps: { progress: number; mistakes: number; words: number };
}

export type ExerciseType =
  | 'intro'
  | 'pick-ru'
  | 'pick-en'
  | 'type-en'
  | 'gap'
  | 'build'
  | 'drill-pick'
  | 'drill-type'
  | 'drill-fix'
  /** Choose the particle of a phrasal verb: get ___ = пережить. */
  | 'particle'
  /** Self-graded flashcard. */
  | 'card'
  /** Added to practice after a word game. */
  | 'game';

export type Verdict = 'ok' | 'typo' | 'wrong';
