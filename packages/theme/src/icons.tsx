import type { CSSProperties, ReactNode } from 'react';

/**
 * MRR Pop icon set — original, 24×24, chunky rounded strokes in ink (currentColor).
 * Shapes with className "mp-icf" are the duotone fill: set `fill` (any colour or token var) to make them pop like stickers.
 * Use these instead of emoji anywhere in the studio, templates or Reels.
 */
const P: Record<string, ReactNode> = {
  // evidence
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  megaphone: (
    <>
      <path className="mp-icf" d="M4 9.5v5h3.2L14 18.5v-13L7.2 9.5z" />
      <path d="M7.2 14.5l1.2 5h2.4l-1-4.2" />
      <path d="M17.5 9.2a4 4 0 010 5.6" />
    </>
  ),
  quote: (
    <>
      <path className="mp-icf" d="M4.5 5.5h15v10.5h-7.5l-4.5 3.8V16h-3z" />
      <path d="M8.5 9.4h7M8.5 12.4h4.5" />
    </>
  ),
  approx: (
    <>
      <path d="M5 10c2-2 4.5-2 7 0s5 2 7 0" />
      <path d="M5 15c2-2 4.5-2 7 0s5 2 7 0" />
    </>
  ),
  star: <path className="mp-icf" d="M12 3.6l2.6 5.2 5.7.8-4.1 4 1 5.7L12 16.6l-5.2 2.7 1-5.7-4.1-4 5.7-.8z" />,
  flask: (
    <>
      <path className="mp-icf" d="M10.3 4.5v5.2L5.4 17.8A1.5 1.5 0 006.7 20h10.6a1.5 1.5 0 001.3-2.2l-4.9-8.1V4.5" />
      <path d="M9 4.5h6M7.6 15h8.8" />
    </>
  ),
  // series
  cash: (
    <>
      <rect className="mp-icf" x="2.8" y="6.2" width="18.4" height="11.6" rx="2.4" />
      <circle cx="12" cy="12" r="2.7" />
      <path d="M6.3 9.6v.01M17.7 14.4v.01" />
    </>
  ),
  rocket: (
    <>
      <path className="mp-icf" d="M12 2.8c3.2 2.2 4.7 5.5 4.6 9.6L14.6 16H9.4l-2-3.6C7.3 8.3 8.8 5 12 2.8z" />
      <circle cx="12" cy="9.2" r="1.7" />
      <path d="M7.6 12.2l-2.8 3.2 3.1.7M16.4 12.2l2.8 3.2-3.1.7M10.4 19l1.6 2.4 1.6-2.4" />
    </>
  ),
  handshake: (
    <>
      <path d="M2.5 8h3.5v8.5H2.5M21.5 8H18v8.5h3.5" />
      <path className="mp-icf" d="M6 9.4l3.6-1.7h3.2L18 9.4v6.2l-5.4 3.9a1.5 1.5 0 01-1.8 0L6 15.9z" />
      <path d="M12.8 7.7l-3.4 2.9a1.4 1.4 0 001.9 2l2.4-1.6M11.2 16l1.7 1.5M13.4 14.4l1.7 1.5" />
    </>
  ),
  growth: (
    <>
      <path className="mp-icf" d="M4 20V14l4.5-4 3.5 3 7.5-7.5V20z" />
      <path d="M4 14l4.5-4 3.5 3 7.5-7.5M14.5 5.5h5v5M4 20h16" />
    </>
  ),
  bulb: (
    <>
      <path className="mp-icf" d="M9 16.2v-1.7A6.3 6.3 0 015.8 9a6.2 6.2 0 0112.4 0 6.3 6.3 0 01-3.2 5.5v1.7z" />
      <path d="M9.6 19.2h4.8M10.7 21.8h2.6M12 16v-3.6l-1.6-1.6M12 12.4l1.6-1.6" />
    </>
  ),
  tag: (
    <>
      <path className="mp-icf" d="M3.5 12.4V4.8a1.3 1.3 0 011.3-1.3h7.6l8.2 8.2a1.6 1.6 0 010 2.2l-6.7 6.7a1.6 1.6 0 01-2.2 0z" />
      <circle cx="8.2" cy="8.2" r="1.7" />
    </>
  ),
  // studio nav
  palette: (
    <>
      <path className="mp-icf" d="M12 3.5a8.5 8.5 0 100 17c1.4 0 2-.9 1.7-2.1-.4-1.4.4-2.6 2-2.6h1.6c1.8 0 3.2-1.4 3.2-3.2 0-5-3.8-9.1-8.5-9.1z" />
      <path d="M7.8 11v.01M10.2 7.5v.01M14.4 7.5v.01" />
    </>
  ),
  face: (
    <>
      <circle className="mp-icf" cx="12" cy="12" r="8.6" />
      <path d="M9 10v.01M15 10v.01M8.6 14c1 1.5 2.1 2.2 3.4 2.2s2.4-.7 3.4-2.2" />
    </>
  ),
  blocks: (
    <>
      <rect x="3.5" y="3.5" width="7.2" height="7.2" rx="2" />
      <rect className="mp-icf" x="13.3" y="3.5" width="7.2" height="7.2" rx="2" />
      <rect className="mp-icf" x="3.5" y="13.3" width="7.2" height="7.2" rx="2" />
      <rect x="13.3" y="13.3" width="7.2" height="7.2" rx="2" />
    </>
  ),
  play: (
    <>
      <rect x="2.8" y="5" width="18.4" height="14" rx="3.4" />
      <path className="mp-icf" d="M10 9.2v5.6l4.8-2.8z" />
    </>
  ),
  slides: (
    <>
      <path d="M8 4.2h9.5a2.5 2.5 0 012.5 2.5v9.5" />
      <rect className="mp-icf" x="4" y="7.8" width="12.5" height="12.5" rx="2.5" />
    </>
  ),
  mic: (
    <>
      <rect className="mp-icf" x="8.8" y="3" width="6.4" height="11.2" rx="3.2" />
      <path d="M5.8 11a6.2 6.2 0 0012.4 0M12 17.2v3.6M8.8 20.8h6.4" />
    </>
  ),
  book: (
    <>
      <path className="mp-icf" d="M5 5a1.8 1.8 0 011.8-1.8H18v13.6H7.4A2.4 2.4 0 005 19.2z" />
      <path d="M5 19.2a2.4 2.4 0 002.4 2.4H18v-4.8M9 7.5h5.5" />
    </>
  ),
  sparkle: (
    <>
      <path className="mp-icf" d="M11 3.5l1.9 5 5 1.9-5 1.9-1.9 5-1.9-5-5-1.9 5-1.9z" />
      <path d="M18.5 15v5M16 17.5h5" />
    </>
  ),
};

export type IconName = keyof typeof P;
export const iconNames = Object.keys(P) as IconName[];

export function Icon({
  name,
  size = 24,
  fill = 'none',
  stroke = 2.3,
  className,
  style,
}: {
  name: string;
  size?: number | string;
  /** duotone fill for the "f" shapes */
  fill?: string;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const body = P[name];
  if (!body) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ '--ic-fill': fill, flex: 'none', ...style } as CSSProperties}
    >
      <style>{'.mp-icf{fill:var(--ic-fill)}'}</style>
      {body}
    </svg>
  );
}
