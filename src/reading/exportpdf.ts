import { fileBytes } from './pdf';
import type { HighlightColor, Issue, PageNotes } from './types';

// "Save a copy with notes": the magazine's own PDF with the learner's highlights,
// Markup drawings and text notes drawn onto its pages, so the copy looks the same in
// Preview, Files or Books on any device and can live in iCloud Drive.

/** Page units across a page, as in the reader. */
const UNITS = 600;

const HL: Record<Exclude<HighlightColor, 'underline'>, string> = {
  yellow: '#ffd60a',
  green: '#34c759',
  blue: '#5ac8fa',
  pink: '#ff6482',
};

export async function annotatedPdf(issue: Issue, notes: PageNotes): Promise<Blob> {
  const { PDFDocument, rgb, BlendMode, LineCapStyle } = await import('pdf-lib');
  const doc = await PDFDocument.load(await fileBytes(issue.file!), { updateMetadata: false });
  const pages = doc.getPages();
  const color = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  };

  pages.forEach((page, i) => {
    const pg = i + 1;
    // The visible area, as pdf.js shows it: its origin can be away from 0, 0.
    const box = page.getCropBox();
    const k = box.width / UNITS;
    const top = box.y + box.height;

    for (const h of notes.hl)
      if (h.pg === pg)
        for (const [x, y, w, hh] of h.rects ?? []) {
          const left = box.x + x * box.width;
          const bottom = top - (y + hh) * box.height;
          if (h.color === 'underline') {
            page.drawLine({ start: { x: left, y: bottom + 0.5 }, end: { x: left + w * box.width, y: bottom + 0.5 }, thickness: 1.2, color: rgb(1, 0.23, 0.19) });
          } else {
            page.drawRectangle({ x: left, y: bottom, width: w * box.width, height: hh * box.height, color: color(HL[h.color]), opacity: 0.45, blendMode: BlendMode.Multiply });
          }
        }

    for (const s of notes.strokes)
      if (s.pg === pg && s.pts.length >= 2) {
        const d = pathOf(s.pts);
        page.drawSvgPath(d, {
          x: box.x,
          y: top,
          scale: k,
          borderColor: color(s.color),
          borderWidth: s.width,
          borderOpacity: s.tool === 'marker' ? 0.4 : s.tool === 'pencil' ? 0.75 : 1,
          borderLineCap: s.tool === 'marker' ? LineCapStyle.Projecting : LineCapStyle.Round,
          blendMode: s.tool === 'marker' ? BlendMode.Multiply : BlendMode.Normal,
        });
      }
  });

  // Text notes become pictures of the text, so any language and the handwriting-like font come through.
  for (const t of notes.texts) {
    if (!t.pg || !t.text.trim()) continue;
    const page = pages[t.pg - 1];
    if (!page) continue;
    const png = textImage(t.text, t.size, t.color);
    if (!png) continue;
    const img = await doc.embedPng(png.data);
    const box = page.getCropBox();
    const k = box.width / UNITS;
    page.drawImage(img, { x: box.x + t.x * k, y: box.y + box.height - t.y * k - png.height * k, width: png.width * k, height: png.height * k });
  }

  const bytes = await doc.save();
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
}

/** The stroke as an SVG path in page units (the same smooth curve as on screen). */
function pathOf(pts: number[]): string {
  if (pts.length < 4) return `M${pts[0]} ${pts[1]} L${pts[0] + 0.01} ${pts[1]}`;
  let d = `M${pts[0]} ${pts[1]}`;
  for (let i = 2; i < pts.length - 2; i += 2) d += ` Q${pts[i]} ${pts[i + 1]} ${(pts[i] + pts[i + 2]) / 2} ${(pts[i + 1] + pts[i + 3]) / 2}`;
  return `${d} L${pts[pts.length - 2]} ${pts[pts.length - 1]}`;
}

/** Draws a text note like on screen; size is in page units. */
function textImage(text: string, size: number, ink: string): { data: Uint8Array; width: number; height: number } | null {
  const scale = 4;
  const font = `${size}px 'Marker Felt', 'Chalkboard SE', 'Comic Sans MS', sans-serif`;
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) return null;
  probe.font = font;
  // Wrap at the same width as the note on screen.
  const maxWidth = 260;
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && probe.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  const pad = 4;
  const lineH = size * 1.25;
  const width = Math.ceil(Math.max(...lines.map((l) => probe.measureText(l).width)) + pad * 2);
  const height = Math.ceil(lines.length * lineH + pad * 2);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(0, 0, width, height);
  ctx.font = font;
  ctx.fillStyle = ink;
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, pad, pad + i * lineH + size * 0.1));
  const b64 = canvas.toDataURL('image/png').split(',')[1];
  canvas.width = canvas.height = 0;
  const data = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return { data, width, height };
}

/** Hands the file to iPhone's share sheet ("Save to Files" → iCloud Drive), or downloads it. */
export async function shareFile(blob: Blob, name: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  // Some browsers only honour the file name for a link that is in the page.
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
