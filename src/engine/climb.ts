import type { AppData } from '../types';
import { stage } from './fsrs';

// Progress as a climb. The height grows with everything the learner does —
// answers, words learnt, pages read — and has nothing to do with language levels.

export interface Peak {
  name: string;
  where: string;
  h: number;
}

export const PEAKS: Peak[] = [
  { name: 'Snowdon', where: 'Wales', h: 1085 },
  { name: 'Ben Nevis', where: 'Scotland', h: 1345 },
  { name: 'Mont Blanc', where: 'the Alps', h: 4808 },
  { name: 'Kilimanjaro', where: 'Tanzania', h: 5895 },
  { name: 'Everest', where: 'the Himalayas', h: 8849 },
];

export const CAMPS: { at: number; name: string }[] = [
  { at: 0.25, name: 'Lower hut' },
  { at: 0.5, name: 'Halfway hut' },
  { at: 0.75, name: 'High camp' },
  { at: 1, name: 'Summit' },
];

/** Lessons are the big steps; everything else adds a little on the way. */
export const METERS = { lesson: 25, page: 10, answer: 1, learning: 1, known: 3, readingWord: 2 } as const;

export interface ClimbPart {
  label: string;
  count: number;
  per: number;
}

export interface Climb {
  total: number;
  parts: ClimbPart[];
  peakIndex: number;
  peak: Peak;
  /** Metres climbed on the current peak. */
  inPeak: number;
  fraction: number;
  /** The next camp, with the metres and roughly the lessons left to reach it. */
  next: { name: string; left: number; lessons: number } | null;
  /** All peaks conquered. */
  done: boolean;
}

export function climbOf(d: AppData, pagesRead: number): Climb {
  let answers = 0;
  let lessons = 0;
  for (const day of Object.values(d.days)) {
    answers += day.ok;
    lessons += day.lessons ?? 0;
  }
  let learning = 0;
  let known = 0;
  for (const st of Object.values(d.states)) {
    const s = stage(st);
    if (s === 'learning') learning++;
    else if (s === 'known' || s === 'mastered') known++;
  }
  const readingWords = d.custom.filter((w) => w.ctx?.length).length;
  const parts: ClimbPart[] = [
    { label: 'lessons finished', count: lessons, per: METERS.lesson },
    { label: 'magazine pages read', count: pagesRead, per: METERS.page },
    { label: 'correct answers', count: answers, per: METERS.answer },
    { label: 'words you are learning', count: learning, per: METERS.learning },
    { label: 'words you know well', count: known, per: METERS.known },
    { label: 'words saved while reading', count: readingWords, per: METERS.readingWord },
  ];
  const total = parts.reduce((sum, p) => sum + p.count * p.per, 0);
  return position(total, parts);
}

export function position(total: number, parts: ClimbPart[] = []): Climb {
  let left = total;
  let i = 0;
  while (i < PEAKS.length - 1 && left >= PEAKS[i].h) {
    left -= PEAKS[i].h;
    i++;
  }
  const peak = PEAKS[i];
  const inPeak = Math.min(left, peak.h);
  const fraction = inPeak / peak.h;
  const camp = CAMPS.find((c) => c.at * peak.h > inPeak);
  return {
    total,
    parts,
    peakIndex: i,
    peak,
    inPeak,
    fraction,
    next: camp ? { name: camp.name, left: Math.ceil(camp.at * peak.h - inPeak), lessons: Math.ceil((camp.at * peak.h - inPeak) / METERS.lesson) } : null,
    done: i === PEAKS.length - 1 && inPeak >= peak.h,
  };
}
