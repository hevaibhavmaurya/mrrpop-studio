export interface ColorToken {
  value: string;
  role: string;
}

export interface FontDef {
  family: string;
  stack: string;
  files: { src: string; weight: string; style: 'normal' | 'italic' }[];
  features?: string;
  license?: string;
  use: string;
}

export interface EvidenceDef {
  label: string;
  /** icon name from packages/theme/src/icons.tsx */
  icon: string;
  bg: string;
  fg: string;
  border: string;
}

export type EvidenceKind =
  | 'payment-verified'
  | 'company-announced'
  | 'founder-reported'
  | 'estimated'
  | 'sponsored'
  | 'demo';

export interface Theme {
  id: string;
  name: string;
  version: string;
  brand: { name: string; handle: string; tagline: string; host: string };
  colors: Record<string, Record<string, ColorToken>>;
  /** Semantic roles → colour token path ('accent.violet') or literal hex. UI reads roles, not raw tokens. */
  roles: Record<string, string>;
  mix: { neutral: number; soft: number; accent: number };
  evidence: Record<EvidenceKind, EvidenceDef>;
  series: Record<string, { label: string; /** icon name from icons.tsx */ icon: string; scene: string; chip: string; chipText?: string }>;
  bubbles: { text: string; bg: string; fg: string }[];
  fonts: { sans: FontDef; accent: FontDef };
  type: Record<string, Record<string, number>>;
  radius: Record<string, number>;
  shadow: Record<string, string>;
  stroke: Record<string, number>;
  texture: { dotGrid: { color: string; dot: number; gap: number } };
  motion: {
    fps: number;
    easing: Record<string, string>;
    durations: Record<string, number>;
    sceneTransition: string;
    blinkEvery: number;
  };
  layout: Record<string, unknown>;
  rules: string[];
  logo?: { wordmark?: string; mark?: string };
}
