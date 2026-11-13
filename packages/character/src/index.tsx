import { useId, useMemo, type CSSProperties } from 'react';
import type { CharacterManifest, LayerDef } from './types';
import { motionTransforms, type Motion } from './motion';

export type * from './types';
export { textToVisemes, useTalk, visemeAt, type VisemeCue } from './talk';
export { bodyMotion, energyAt, motionTransforms, type Motion, type MotionInput } from './motion';

// Packs are discovered from packages/character/packs/<id>/ — only folders whose
// manifest.json has "format": "mrrpop-character@1" are treated as part-based packs.
const manifests = import.meta.glob<CharacterManifest>('../packs/*/manifest.json', { eager: true, import: 'default' });
const partFiles = import.meta.glob<string>('../packs/*/parts/**/*.svg', { eager: true, query: '?raw', import: 'default' });

export interface LoadedPack extends CharacterManifest {
  /** 'parts/eyes/open.svg' → inner SVG markup */
  parts: Record<string, string>;
  variants: Record<string, string[]>;
}

const stripWrapper = (svg: string) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

export const packs: Record<string, LoadedPack> = {};
for (const [path, m] of Object.entries(manifests)) {
  if (m.format !== 'mrrpop-character@1') continue;
  const id = path.split('/')[2];
  const prefix = `../packs/${id}/`;
  const parts: Record<string, string> = {};
  for (const [p, raw] of Object.entries(partFiles)) if (p.startsWith(prefix)) parts[p.slice(prefix.length)] = stripWrapper(raw);
  const variants: Record<string, string[]> = {};
  for (const l of m.layers) {
    if (!l.dir) continue;
    const slot = l.slot ?? l.id;
    variants[slot] ??= [];
    for (const p of Object.keys(parts)) {
      const v = p.startsWith(l.dir + '/') ? p.slice(l.dir.length + 1, -4) : null;
      if (v && !variants[slot].includes(v)) variants[slot].push(v);
    }
  }
  packs[id] = { ...m, id, parts, variants };
}
export const packIds = Object.keys(packs);

/** 'avatar' = square, face-centred (profile pictures, circles). Packs may define more crops. */
export type Crop = 'full' | 'bust' | 'head' | 'avatar' | (string & {});

export interface CharacterProps {
  pack?: string;
  pose?: string;
  expression?: string;
  /** Rhubarb viseme A–H or X. Anything but X overrides the expression's mouth. */
  viseme?: string;
  /** Direct overrides (win over expression). */
  eyes?: string;
  brows?: string;
  mouth?: string;
  /** Show the $ pin. false for Sponsored content. */
  badge?: boolean;
  blink?: boolean;
  /** Head rotation in degrees around the pack's head pivot. */
  headTilt?: number;
  headLift?: number;
  /** Whole-body motion (knees, weight shift, lean, laugh curl, hop) — see bodyMotion(). */
  motion?: Motion;
  crop?: Crop;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

/** Resolve which variant each slot shows: defaults < pose < expression < direct props < viseme / blink. */
export function resolveSlots(p: LoadedPack, props: CharacterProps): Record<string, string> {
  const pose = p.poses[props.pose ?? 'idle'] ?? Object.values(p.poses)[0];
  const exp = p.expressions[props.expression ?? 'smile'] ?? Object.values(p.expressions)[0];
  const strip = (o: Record<string, string | undefined>) => {
    const { use_for: _u, ...rest } = o;
    return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) as Record<string, string>;
  };
  const slots: Record<string, string> = {
    ...(p.defaults ?? {}),
    ...strip(pose),
    ...strip(exp),
    ...strip({ eyes: props.eyes, brows: props.brows, mouth: props.mouth }),
  };
  if (props.viseme && props.viseme !== 'X') slots.mouth = p.visemes.map[props.viseme] ?? props.viseme;
  if (props.blink && p.blink && p.blink.onlyWhen.includes(slots.eyes)) slots.eyes = p.blink.eyes;
  return slots;
}

function scopeIds(markup: string, uid: string) {
  // Parts may define ids (clipPath etc.). Make them unique per instance so many characters can share a page.
  return markup
    .replace(/\sid="([^"]+)"/g, (_, id) => ` id="${id}-${uid}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${id}-${uid})`);
}

export function Character(props: CharacterProps) {
  const p = packs[props.pack ?? packIds[0]] ?? packs[packIds[0]];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  // reactions can take over the hands (laughing → hands on the stomach, shocked → hands up …)
  const slots = resolveSlots(p, props.motion ? { ...props, pose: props.motion.pose } : props);
  const [vx, vy, vw, vh] = p.crops?.[props.crop ?? 'full'] ?? p.crops?.head ?? p.viewBox;
  const [px, py] = p.headPivot;
  const hideBadge = props.badge === false;

  const html = useMemo(() => {
    const partFor = (l: LayerDef): string => {
      if (l.optional && l.id === 'badge' && hideBadge) return '';
      if (l.file) return p.parts[l.file] ?? '';
      return p.parts[`${l.dir}/${slots[l.slot ?? l.id]}.svg`] ?? '';
    };
    const lower: string[] = [];
    const body: string[] = [];
    const arms: string[] = [];
    const head: string[] = [];
    for (const l of p.layers) {
      const g = `<g data-layer="${l.id}">${partFor(l)}</g>`;
      if (l.head) head.push(g);
      else if (l.lower ?? l.id === 'legs') lower.push(g);
      else if ((l.slot ?? l.id) === 'arms') arms.push(g);
      else body.push(g);
    }
    const sc = (a: string[]) => scopeIds(a.join(''), uid);
    return { lower: sc(lower), body: sc(body), arms: sc(arms), head: sc(head) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, uid, JSON.stringify(slots), hideBadge]);

  const tilt = (props.headTilt ?? 0) + (props.motion?.headTilt ?? 0);
  const mt = props.motion ? motionTransforms(props.motion, p.hip ?? [300, 880], p.feet ?? 1346, p.waist) : null;
  const lift = (props.headLift ?? 0) + (mt?.headY ?? 0); // svg y: + = down

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      width={props.width}
      height={props.height}
      className={props.className}
      style={{ overflow: (props.crop ?? 'full') === 'full' ? 'visible' : 'hidden', display: 'block', ...props.style }}
      role="img"
      aria-label={props.title ?? `${p.name} — ${props.pose ?? 'idle'}, ${props.expression ?? 'smile'}`}
    >
      <g transform={mt?.root}>
        <g transform={mt?.legs} dangerouslySetInnerHTML={{ __html: html.lower }} />
        <g transform={mt?.upper}>
          <g dangerouslySetInnerHTML={{ __html: html.body }} />
          <g transform={mt?.arms} dangerouslySetInnerHTML={{ __html: html.arms }} />
          <g transform={`translate(0 ${lift}) rotate(${tilt} ${px} ${py})`} dangerouslySetInnerHTML={{ __html: html.head }} />
        </g>
      </g>
    </svg>
  );
}
