/** One page of a magazine issue: a single article or the cover, laid out at a fixed width. */
export interface MagPage {
  id: string;
  /** Section of the magazine: Travel, Food, Science… */
  topic: string;
  title: string;
  /** One-line summary shown in the contents list. */
  dek?: string;
  /** The page itself: HTML laid out at PAGE_WIDTH pixels, styled by the issue's theme class. */
  html: string;
  /** For a magazine added as a PDF: the PDF pages of this article, from 1. */
  pdf?: { from: number; to: number };
}

export interface Issue {
  id: string;
  magazine: string;
  issue: string;
  date: string;
  /** CSS class that carries the magazine's fonts, colours and layout. */
  theme: string;
  cover: { bg: string; fg: string; accent: string };
  pages: MagPage[];
  /** A magazine the learner added: the PDF is kept on this device under this key. */
  file?: string;
  /** Small picture of the cover, as a data URL. */
  thumb?: string;
  addedAt?: number;
  /** The device refused to store the file: it works until the app is closed. */
  unsaved?: boolean;
}

/** Pages are laid out at this width, like a printed page, and scaled to the screen. */
export const PAGE_WIDTH = 600;

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'underline';

/** A highlight, anchored by character offsets in the page's text. */
export interface Highlight {
  id: string;
  start: number;
  end: number;
  color: HighlightColor;
  text: string;
  at: number;
}

export type Tool = 'pen' | 'marker' | 'pencil' | 'eraser' | 'text';

/** A Markup stroke in page coordinates. Points are flattened: x0, y0, x1, y1… */
export interface Stroke {
  id: string;
  tool: 'pen' | 'marker' | 'pencil';
  color: string;
  width: number;
  pts: number[];
}

/** A text box added with Markup. */
export interface TextNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
}

export interface PageNotes {
  hl: Highlight[];
  strokes: Stroke[];
  texts: TextNote[];
  /** When the page was finished. */
  read?: number;
}

export type { WordContext } from '../types';
