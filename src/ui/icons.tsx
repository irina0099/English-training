import type { JSX } from 'preact';

type Props = { size?: number } & JSX.SVGAttributes<SVGSVGElement>;

function Svg({ size = 22, children, ...rest }: Props & { children: preact.ComponentChildren }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconHome = (p: Props) => (
  <Svg {...p}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  </Svg>
);

export const IconBook = (p: Props) => (
  <Svg {...p}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
    <path d="M5 17a3 3 0 0 1 3-3h11" />
  </Svg>
);

export const IconGrid = (p: Props) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16" />
  </Svg>
);

export const IconPen = (p: Props) => (
  <Svg {...p}>
    <path d="M15 5l4 4L8.5 19.5 4 20l.5-4.5z" />
    <path d="M13 7l4 4" />
  </Svg>
);

export const IconRule = (p: Props) => (
  <Svg {...p}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" />
  </Svg>
);

export const IconSpeaker = (p: Props) => (
  <Svg {...p}>
    <path d="M4 10v4h4l5 4V6L8 10z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
  </Svg>
);

export const IconGear = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
);

export const IconClose = (p: Props) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconPlus = (p: Props) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconBack = (p: Props) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const IconShuffle = (p: Props) => (
  <Svg {...p}>
    <path d="M4 7h3.5c2 0 3 1 4.5 3.5S14.5 17 16.5 17H20M4 17h3.5c1.2 0 2-.4 2.8-1.2M14.3 8.2C15 7.4 15.8 7 17 7h3M17 4l3 3-3 3M17 14l3 3-3 3" />
  </Svg>
);

export const IconCards = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="6" width="11" height="14" rx="2" />
    <path d="M8 4h11a2 2 0 0 1 2 2v12" />
  </Svg>
);

export const IconChevron = (p: Props) => (
  <Svg size={14} stroke-width="2.4" {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

export const IconCheck = (p: Props) => (
  <Svg stroke-width="2.4" {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const IconCheckCircle = (p: Props) => (
  <svg width={p.size ?? 22} height={p.size ?? 22} viewBox="0 0 24 24" aria-hidden="true" class={p.class as string}>
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

export const IconXCircle = (p: Props) => (
  <svg width={p.size ?? 22} height={p.size ?? 22} viewBox="0 0 24 24" aria-hidden="true" class={p.class as string}>
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" />
  </svg>
);

export const IconSearch = (p: Props) => (
  <Svg size={18} stroke-width="2.2" {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 20 20" />
  </Svg>
);

export const IconFlame = (p: Props) => (
  <Svg {...p}>
    <path d="M12 21c-3.9 0-7-2.7-7-6.5 0-3.3 2.4-5.4 3.6-7.4.3 1.6 1.1 2.7 2.2 3.3C11 7 12.3 4.5 14.5 3c-.3 3 1.6 4.8 2.9 6.6A7.4 7.4 0 0 1 19 14.5C19 18.3 15.9 21 12 21z" />
  </Svg>
);

export const IconMarkup = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M8.5 15.5l1-3 5-5 2 2-5 5z" />
  </Svg>
);

export const IconUndo = (p: Props) => (
  <Svg {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Svg>
);

export const IconRedo = (p: Props) => (
  <Svg {...p}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </Svg>
);

export const IconMountain = (p: Props) => (
  <Svg {...p}>
    <path d="M3 20 9.5 8l3.5 6 2.5-4L21 20z" />
    <path d="m7.6 11.5 1.9 1.3 1.6-1.2" />
  </Svg>
);

export const IconNews = (p: Props) => (
  <Svg {...p}>
    <path d="M5 4h12v15a2 2 0 0 0 2 2H7a2 2 0 0 1-2-2z" />
    <path d="M17 9h2v10a2 2 0 0 1-2 2M8 8h6M8 12h6M8 16h4" />
  </Svg>
);

export const IconMore = (p: Props) => (
  <Svg {...p}>
    <circle cx="6" cy="12" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    <circle cx="18" cy="12" r="1.3" fill="currentColor" />
  </Svg>
);

export const IconList = (p: Props) => (
  <Svg {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" />
  </Svg>
);

export const IconShare = (p: Props) => (
  <Svg {...p}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" />
    <path d="M7 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
  </Svg>
);
