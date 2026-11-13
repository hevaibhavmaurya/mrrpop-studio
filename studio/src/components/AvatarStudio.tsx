import { useRef, useState, type ReactNode } from 'react';
import { Character } from '@mrrpop/character';
import { useTheme } from '@mrrpop/theme';
import { download, svgToPng, withFonts } from '../lib/exportImage';

// Profile-picture concepts. Everything lives inside one 1080×1080 <svg>, so the exported PNG is exactly what you see.
// Instagram shows it as a circle (~40–110 px): big face, high contrast, one idea per avatar.
const iconFiles = import.meta.glob<string>('@root/packages/ui/icons/*.svg', { eager: true, query: '?raw', import: 'default' });
const ICON: Record<string, string> = Object.fromEntries(Object.entries(iconFiles).map(([p, v]) => [p.split('/').pop()!.slice(0, -4), v]));
const icon = (name: string, x: number, y: number, s: number, rot = 0) => (
  <g transform={`translate(${x} ${y}) rotate(${rot} ${s / 2} ${s / 2})`} dangerouslySetInnerHTML={{ __html: (ICON[name] ?? '').replace('<svg ', `<svg width="${s}" height="${s}" `) }} />
);

const INK = '#1B1838';
const rays = (n: number, a: string, b: string, cx = 540, cy = 560, r = 900) =>
  [...Array(n)].map((_, i) => {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    return <path key={i} d={`M${cx} ${cy} L${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r} L${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r} Z`} fill={i % 2 ? a : b} />;
  });
const halftone = (id: string, color: string) => (
  <>
    <defs>
      <pattern id={`ht-${id}`} width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="5.5" fill={color} /></pattern>
      <radialGradient id={`hm-${id}`}><stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <mask id={`mk-${id}`}><rect width="1080" height="1080" fill={`url(#hm-${id})`} /></mask>
    </defs>
    <rect width="1080" height="1080" fill={`url(#ht-${id})`} mask={`url(#mk-${id})`} />
  </>
);
const popBadge = (x: number, y: number, s = 150, fill = '#C6F03A') => {
  const pts = [...Array(16)].map((_, i) => { const r = i % 2 ? s * 0.36 : s * 0.5, a = (i / 16) * Math.PI * 2 - Math.PI / 2; return `${x + Math.cos(a) * r},${y + Math.sin(a) * r}`; }).join(' ');
  return (
    <g>
      <polygon points={pts} fill={INK} transform="translate(8 8)" />
      <polygon points={pts} fill={fill} stroke={INK} strokeWidth="9" strokeLinejoin="round" />
      <text x={x} y={y + s * 0.15} textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize={s * 0.42} fill={INK}>P!</text>
    </g>
  );
};
// Mr. Pop, waist-up, filling the circle
const host = (expression: string, tilt = 0, x = 20, y = 105, w = 1040) => (
  <g transform={`translate(${x} ${y})`}>
    <Character expression={expression} crop="avatar" width={w} height={w} headTilt={tilt} style={{ overflow: 'visible' }} />
  </g>
);

interface Concept { id: string; name: string; idea: string; art: ReactNode }
const CONCEPTS: Concept[] = [
  {
    id: 'pop-burst',
    name: 'Pop Burst',
    idea: 'Signature: violet sunburst on lime, cheeky raised brow, the P! pop badge. Loud and instantly "MRR Pop".',
    art: (
      <>
        <rect width="1080" height="1080" fill="#C6F03A" />
        {rays(20, '#6A42EC', '#8466F5')}
        <circle cx="540" cy="560" r="330" fill="#C6F03A" stroke={INK} strokeWidth="12" />
        {host('cheeky', -5)}
        {popBadge(860, 250, 190)}
        {icon('sparkle', 150, 170, 120, -12)}
      </>
    ),
  },
  {
    id: 'money-eyes',
    name: 'Money Eyes',
    idea: 'The revenue show in one look: $ eyes, coins flying, violet halftone. Says "we talk money" before any words.',
    art: (
      <>
        <rect width="1080" height="1080" fill="#6A42EC" />
        {halftone('money', '#8A6CF6')}
        <circle cx="540" cy="580" r="360" fill="#FFD43B" stroke={INK} strokeWidth="12" />
        {host('money-eyes', 4)}
        {icon('coin', 120, 220, 170, -18)}
        {icon('coin', 820, 160, 140, 14)}
        {icon('coin', 850, 600, 110, -8)}
      </>
    ),
  },
  {
    id: 'cool-pop',
    name: 'Cool Pop',
    idea: 'Confident insider: sunglasses + smirk on navy, lime ring. Feels premium and stands out in a pastel feed.',
    art: (
      <>
        <rect width="1080" height="1080" fill="#20244A" />
        {halftone('cool', '#2E3466')}
        <circle cx="540" cy="570" r="380" fill="none" stroke="#C6F03A" strokeWidth="34" />
        <circle cx="540" cy="570" r="346" fill="#6A42EC" stroke={INK} strokeWidth="10" />
        {host('cool', -4)}
        {icon('sparkle', 820, 170, 130, 10)}
        {icon('sparkle', 150, 260, 80, -10)}
      </>
    ),
  },
  {
    id: 'hello-pop',
    name: 'Hello Pop',
    idea: 'Friendliest: big grin, lavender halftone, a chat bubble with "pop!". Best for approachability.',
    art: (
      <>
        <rect width="1080" height="1080" fill="#ECE6FF" />
        {halftone('hello', '#BBA6FF')}
        <circle cx="540" cy="580" r="350" fill="#FFFFFF" stroke={INK} strokeWidth="12" />
        {host('grin', 5)}
        <g transform="translate(700 130) rotate(8)">
          <path d="M0 40 Q0 0 40 0 H250 Q290 0 290 40 V120 Q290 160 250 160 H110 L60 205 L70 160 H40 Q0 160 0 120 Z" fill={INK} transform="translate(9 9)" />
          <path d="M0 40 Q0 0 40 0 H250 Q290 0 290 40 V120 Q290 160 250 160 H110 L60 205 L70 160 H40 Q0 160 0 120 Z" fill="#C6F03A" stroke={INK} strokeWidth="9" strokeLinejoin="round" />
          <text x="145" y="112" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontWeight="900" fontStyle="italic" fontSize="92" fill={INK}>pop!</text>
        </g>
      </>
    ),
  },
];

export function AvatarStudio() {
  const t = useTheme();
  const refs = useRef<Record<string, SVGSVGElement | null>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const exportOne = async (id: string, fmt: 'png' | 'svg') => {
    const el = refs.current[id];
    if (!el) return;
    setBusy(id);
    try {
      const svg = await withFonts(el.outerHTML.replace(/\swidth="[^"]*"/, ' width="1080"').replace(/\sheight="[^"]*"/, ' height="1080"'), t);
      if (fmt === 'svg') download(new Blob([svg], { type: 'image/svg+xml' }), `mrrpop-avatar-${id}.svg`);
      else download(await svgToPng(svg), `mrrpop-avatar-${id}-1080.png`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="av-grid">
      <style>{css}</style>
      {CONCEPTS.map((c) => (
        <div key={c.id} className="card av">
          <div className="av-circle">
            <svg ref={(e) => { refs.current[c.id] = e; }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="220" height="220">
              {c.art}
            </svg>
          </div>
          <div className="av-small">
            {[110, 40].map((s) => (
              <div key={s} className="av-mini" style={{ width: s, height: s }} title={`${s}px — how Instagram shows it`}>
                <svg viewBox="0 0 1080 1080" width={s} height={s}>{c.art}</svg>
              </div>
            ))}
            <span>real sizes</span>
          </div>
          <b>{c.name}</b>
          <p>{c.idea}</p>
          <div className="dl">
            <button onClick={() => exportOne(c.id, 'png')} disabled={!!busy}>{busy === c.id ? '…' : 'PNG 1080'}</button>
            <button onClick={() => exportOne(c.id, 'svg')} disabled={!!busy}>SVG</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const css = `
.av-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.av{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}
.av-circle{width:220px;height:220px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 4px var(--mp-role-ink),0 18px 30px -16px rgba(27,24,56,.5)}
.av-small{display:flex;align-items:center;gap:10px;font-size:11px;color:var(--mp-role-muted);font-weight:700}
.av-mini{border-radius:50%;overflow:hidden;flex:none;box-shadow:0 0 0 2px rgba(27,24,56,.15)}
.av b{font-size:18px}
.av p{font-size:13px;line-height:1.4;color:var(--mp-role-muted);min-height:54px}
`;
