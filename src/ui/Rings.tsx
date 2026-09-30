export interface RingData {
  label: string;
  /** 0..1 */
  value: number;
  /** Text next to the label, e.g. "8/15". */
  text: string;
  /** CSS colour token, e.g. var(--ring-1). */
  color: string;
}

const SIZE = 116;
const STROKE = 13;
const GAP = 2;

/** Concentric progress rings in the style of Apple's Activity rings; each ring is a meter on its own-colour track. */
export function Rings({ rings }: { rings: RingData[] }) {
  return (
    <div class="rings-row">
      <svg class="rings" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={rings.map((r) => `${r.label}: ${r.text}`).join(', ')}>
        {rings.map((ring, i) => {
          const r = SIZE / 2 - STROKE / 2 - i * (STROKE + GAP);
          const c = 2 * Math.PI * r;
          const v = Math.max(0, Math.min(1, ring.value));
          return (
            <g key={ring.label}>
              <title>{`${ring.label}: ${ring.text}`}</title>
              <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke={ring.color} stroke-opacity="0.2" stroke-width={STROKE} />
              {v > 0 && (
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  stroke-width={STROKE}
                  stroke-linecap="round"
                  stroke-dasharray={`${c} ${c}`}
                  stroke-dashoffset={c * (1 - v)}
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
              )}
            </g>
          );
        })}
      </svg>
      <ul class="ring-legend">
        {rings.map((ring) => (
          <li key={ring.label}>
            <i style={{ background: ring.color }} />
            <span>{ring.label}</span>
            <b>{ring.text}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
