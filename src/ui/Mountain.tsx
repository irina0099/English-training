import { CAMPS } from '../engine/climb';

// The climb drawn as a mountain: a winding trail from the valley to the summit,
// huts at the camps, and a marker where the learner is now.

const BASE = 222;
const TOP = 40;
const SUMMIT_X = 214;

/** The trail, sampled densely so the marker can sit exactly on it. */
const TRAIL: [number, number][] = Array.from({ length: 161 }, (_, i) => {
  const t = i / 160;
  const y = BASE - t * (BASE - TOP - 6);
  const amp = 74 * (1 - t) ** 1.1;
  const x = SUMMIT_X - 8 * (1 - t) + amp * Math.sin(t * Math.PI * 5.2 + 0.4);
  return [x, y];
});

const LENGTHS = TRAIL.reduce<number[]>((acc, p, i) => {
  acc.push(i ? acc[i - 1] + Math.hypot(p[0] - TRAIL[i - 1][0], p[1] - TRAIL[i - 1][1]) : 0);
  return acc;
}, []);
const TOTAL = LENGTHS[LENGTHS.length - 1];

function pointAt(f: number): [number, number] {
  const target = Math.max(0, Math.min(1, f)) * TOTAL;
  const i = LENGTHS.findIndex((l) => l >= target);
  if (i <= 0) return TRAIL[0];
  const k = (target - LENGTHS[i - 1]) / (LENGTHS[i] - LENGTHS[i - 1] || 1);
  return [TRAIL[i - 1][0] + (TRAIL[i][0] - TRAIL[i - 1][0]) * k, TRAIL[i - 1][1] + (TRAIL[i][1] - TRAIL[i - 1][1]) * k];
}

function trailUpTo(f: number): string {
  const target = f * TOTAL;
  const pts = TRAIL.filter((_, i) => LENGTHS[i] <= target);
  const end = pointAt(f);
  return [...pts, end].map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
}

const FULL = TRAIL.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

const TREES: [number, number, number][] = [
  [62, 206, 1], [84, 198, 0.8], [104, 210, 1.1], [330, 196, 0.9], [352, 206, 1.1], [372, 192, 0.8],
  [128, 174, 0.7], [300, 168, 0.75], [312, 182, 0.9], [146, 190, 0.8],
];

export function Mountain({ fraction, label }: { fraction: number; label: string }) {
  const [mx, my] = pointAt(fraction);
  return (
    <svg class="mountain" viewBox="0 0 420 240" role="img" aria-label={label}>
      <rect class="m-sky" width="420" height="240" />
      <circle class="m-sun" cx="350" cy="52" r="22" />
      <g class="m-cloud">
        <ellipse cx="78" cy="48" rx="30" ry="10" />
        <ellipse cx="96" cy="42" rx="18" ry="11" />
        <ellipse cx="300" cy="86" rx="26" ry="8" />
        <ellipse cx="314" cy="81" rx="14" ry="9" />
      </g>
      <path class="m-far" d="M0 170 L70 112 L118 150 L160 118 L210 160 V240 H0Z" />
      <path class="m-far" d="M240 160 L300 108 L344 140 L380 116 L420 150 V240 H240Z" />
      <path class="m-main" d={`M28 240 L${SUMMIT_X} 30 L400 240Z`} />
      <path class="m-shade" d={`M${SUMMIT_X} 30 L400 240 L300 240 L250 150Z`} />
      <path class="m-snow" d={`M${SUMMIT_X} 30 L240 58 L228 54 L216 64 L204 54 L190 58Z`} />
      <path class="m-hill" d="M0 214 C60 196 120 204 170 222 L170 240 H0Z" />
      <path class="m-hill" d="M250 226 C300 200 370 196 420 206 V240 H250Z" />
      <g class="m-tree">
        {TREES.map(([x, y, k], i) => (
          <path key={i} d={`M${x} ${y} l${-7 * k} ${15 * k} h${14 * k}z M${x} ${y + 6 * k} l${-8 * k} ${15 * k} h${16 * k}z`} />
        ))}
      </g>
      <path class="m-trail" d={FULL} />
      {fraction > 0 && <path class="m-trail-done" d={trailUpTo(fraction)} />}
      <line class="m-pole" x1={SUMMIT_X} y1="30" x2={SUMMIT_X} y2="8" />
      <path class="m-flag" d={`M${SUMMIT_X} 8 l16 5 l-16 5z`} />
      {CAMPS.slice(0, -1).map((c) => {
        const [x, y] = pointAt(c.at);
        const reached = fraction >= c.at;
        return (
          <g key={c.name} class={`m-camp ${reached ? 'reached' : ''}`} transform={`translate(${x} ${y})`}>
            <circle r="9" />
            <path d="M-4.5 1.5 L0 -3 L4.5 1.5 V4.5 H-4.5Z" />
          </g>
        );
      })}
      <g class="m-me" transform={`translate(${mx} ${my})`}>
        <circle class="m-me-halo" r="12" />
        <circle class="m-me-dot" r="6.5" />
        <circle r="2.6" fill="#fff" />
      </g>
    </svg>
  );
}
