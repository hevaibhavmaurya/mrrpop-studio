import { useRef, useState, type CSSProperties } from 'react';
import { download, squareSvg, svgToPng, withFonts } from '../lib/exportImage';
import { AvatarStudio } from '../components/AvatarStudio';
import { cssVarName, Icon, iconNames, resolveColor, themeIds, themes, useTheme, type EvidenceKind } from '@mrrpop/theme';
import { Character } from '@mrrpop/character';

function useCopy() {
  const [msg, setMsg] = useState<string | null>(null);
  const copy = async (text: string, label = text) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(`Copied ${label}`);
    } catch {
      setMsg(`Copy failed — ${text}`);
    }
    setTimeout(() => setMsg(null), 1400);
  };
  return { copy, toast: msg && <div className="toast">{msg}</div> };
}

const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150;
};

/** Evidence stamp: tinted pill + ink outline + hard shadow, with a solid "seal" coin holding the glyph. */
export function EvidenceChip({ kind, source, size = 1 }: { kind: EvidenceKind; source?: string; size?: number }) {
  const e = useTheme().evidence[kind];
  return (
    <span className="ev" style={{ '--ev-bg': e.bg, '--ev-fg': e.fg, '--ev-line': e.border, '--ev-s': size } as CSSProperties}>
      <span className="ev-coin">
        <Icon name={e.icon} size="96%" stroke={2.6} />
      </span>
      <span className="ev-label">{e.label}</span>
      {source && <span className="ev-src">{source}</span>}
    </span>
  );
}

/** Series tag: a candy sticker in the series colour, icon on a white tile, bubble-style heavy italic. */
export function SeriesTag({ id, rot = -3 }: { id: string; rot?: number }) {
  const t = useTheme();
  const s = t.series[id];
  if (!s) return null;
  return (
    <span
      className="stag"
      style={{ '--st-bg': resolveColor(t, s.chip), '--rot': `${rot}deg`, color: resolveColor(t, s.chipText ?? 'role.onPrimary') } as CSSProperties}
    >
      <span className="stag-ic">
        <Icon name={s.icon} size={28} stroke={2.4} fill={resolveColor(t, s.chip)} />
      </span>
      <span className="stag-txt">
        <small>Series</small>
        {s.label}
      </span>
    </span>
  );
}

function Bubble({ text, bg, fg, rot }: { text: string; bg: string; fg: string; rot: number }) {
  const t = useTheme();
  const b = resolveColor(t, bg);
  return (
    <div className="bubble" style={{ '--rot': `${rot}deg`, '--bub': b, color: resolveColor(t, fg) } as CSSProperties}>
      {text}
    </div>
  );
}

export function BrandPage({ themeId, onTheme }: { themeId: string; onTheme: (id: string) => void }) {
  const t = useTheme();
  const { copy, toast } = useCopy();
  const groups = Object.entries(t.colors);
  const avatarRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const exportAvatar = async (fmt: 'png' | 'svg') => {
    const svg = avatarRef.current?.querySelector('svg')?.outerHTML;
    if (!svg) return;
    setBusy('avatar');
    const bg = getComputedStyle(avatarRef.current!).getPropertyValue('--mp-role-highlight').trim() || '#C6F03A';
    const out = squareSvg(svg, { size: 1080, bg });
    if (fmt === 'svg') download(new Blob([out], { type: 'image/svg+xml' }), 'mrrpop-avatar.svg');
    else download(await svgToPng(out), 'mrrpop-avatar-1080.png');
    setBusy(null);
  };
  const exportMark = async (fmt: 'png' | 'svg') => {
    setBusy('mark');
    const bg = t.colors.accent?.violet?.value ?? '#6A42EC';
    const out = await withFonts(squareSvg(t.logoMarkSvg, { size: 1080, bg }), t);
    if (fmt === 'svg') download(new Blob([out], { type: 'image/svg+xml' }), 'mrrpop-logo-mark.svg');
    else download(await svgToPng(out), 'mrrpop-logo-mark-1080.png');
    setBusy(null);
  };

  return (
    <div>
      <style>{brandCss}</style>
      <header className="page-h">
        <div className="grow">
          <h1>
            Brand <span className="it" style={{ color: 'var(--mp-role-primary)', fontSize: 54 }}>kit</span>
          </h1>
          <p>
            Everything here is read live from <span className="mono">packages/theme/themes/{themeId}/theme.json</span>. Click any
            colour to copy it.
          </p>
        </div>
        <label className="select">
          Theme
          <select value={themeId} onChange={(e) => onTheme(e.target.value)}>
            {themeIds.map((id) => (
              <option key={id} value={id}>
                {themes[id].name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {/* Identity */}
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="card dots hero" style={{ background: 'var(--mp-role-hero)' }}>
          <div className="hero-logo" dangerouslySetInnerHTML={{ __html: t.logoSvg }} />
          <div className="hero-tag">
            The business <span className="it" style={{ color: 'var(--mp-role-secondary)' }}>behind</span> software.
          </div>
          <div className="hero-meta">
            <span className="pill" style={{ background: 'var(--mp-role-primary)', color: '#fff' }}>
              {t.brand.handle}
            </span>
            <span className="pill" style={{ background: 'var(--mp-role-surface)' }}>
              Host · {t.brand.host}
            </span>
          </div>
          <Character pose="pointing" expression="grin" width={150} crop="bust" style={{ position: 'absolute', right: 10, bottom: 0 }} />
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="card mark">
            <div dangerouslySetInnerHTML={{ __html: t.logoMarkSvg }} />
            <small>logo mark</small>
            <div className="dl">
              <button onClick={() => exportMark('png')} disabled={!!busy}>{busy === 'mark' ? '…' : 'PNG 1080'}</button>
              <button onClick={() => exportMark('svg')} disabled={!!busy}>SVG</button>
            </div>
          </div>
          <div className="card mark" style={{ background: 'var(--mp-role-card-a)' }}>
            <div ref={avatarRef} style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--mp-role-highlight)', overflow: 'hidden', border: '4px solid var(--mp-role-ink)' }}>
              <Character expression="grin" crop="avatar" width={112} height={112} />
            </div>
            <small>avatar · Instagram profile</small>
            <div className="dl">
              <button onClick={() => exportAvatar('png')} disabled={!!busy}>{busy === 'avatar' ? '…' : 'PNG 1080'}</button>
              <button onClick={() => exportAvatar('svg')} disabled={!!busy}>SVG</button>
            </div>
          </div>
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="mix">
              <div style={{ flex: t.mix.neutral, background: 'var(--mp-role-page)' }}>{Math.round(t.mix.neutral * 100)}% neutral</div>
              <div style={{ flex: t.mix.soft, background: 'var(--mp-role-card-a)' }}>{Math.round(t.mix.soft * 100)}% soft</div>
              <div style={{ flex: t.mix.accent, background: 'var(--mp-role-primary)', color: '#fff' }}>{Math.round(t.mix.accent * 100)}%</div>
            </div>
            <small style={{ color: 'var(--mp-role-muted)', fontSize: 12, display: 'block', marginTop: 8 }}>Colour mix per frame</small>
          </div>
        </div>
      </div>

      <section className="section">
        <h2>
          Avatar studio <small>profile-picture concepts · previewed at Instagram's real sizes · download PNG 1080</small>
        </h2>
        <AvatarStudio />
      </section>

      {/* Colours */}
      {groups.map(([group, entries]) => (
        <section className="section" key={group}>
          <h2>
            {group} <small>{group === 'scene' ? 'one per scene card' : group === 'accent' ? '≈10% of a frame' : ''}</small>
          </h2>
          <div className="swatches">
            {Object.entries(entries).map(([name, tok]) => (
              <button
                key={name}
                className="swatch"
                onClick={() => copy(tok.value)}
                style={{ background: tok.value, color: isLight(tok.value) ? 'var(--mp-role-ink)' : '#fff' }}
              >
                <b>{name}</b>
                <span className="mono">{tok.value}</span>
                <span className="role">{tok.role}</span>
                <span className="mono var" onClick={(e) => (e.stopPropagation(), copy(`var(${cssVarName(`${group}.${name}`)})`))}>
                  {cssVarName(`${group}.${name}`)}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* Type */}
      <section className="section">
        <h2>
          Typography <small>{t.fonts.sans.family} + {t.fonts.accent.family} Italic (one accent word)</small>
        </h2>
        <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
          <div className="card dots" style={{ background: 'var(--mp-role-card-b)', overflow: 'hidden' }}>
            <div style={{ font: '900 30px/1.05 var(--mp-font-sans)', letterSpacing: -1 }}>
              One <span className="it" style={{ color: 'var(--mp-role-primary)', fontSize: 35 }}>extension.</span>
            </div>
            <div style={{ font: '900 clamp(64px, 9vw, 120px)/1 var(--mp-font-sans)', letterSpacing: -5, margin: '6px 0' }}>$12,400</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="it" style={{ fontSize: 46, color: 'var(--mp-role-secondary)', transform: 'rotate(-6deg)', display: 'inline-block' }}>
                a month?!
              </span>
              <EvidenceChip kind="founder-reported" source="DEMO" />
            </div>
          </div>
          <div className="card">
            <table className="scale">
              <tbody>
                {Object.entries(t.type).map(([k, v]) => (
                  <tr key={k}>
                    <td>
                      <b>{k}</b>
                    </td>
                    <td className="mono">
                      {v.size ? `${v.size}px` : `×${v.scale}`} {v.weight ? `· ${v.weight}` : ''} {v.tracking !== undefined ? `· ${v.tracking}` : ''}
                    </td>
                    <td className="mono" style={{ color: 'var(--mp-role-faint)' }}>
                      {v.min ? `min ${v.min}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 12, fontSize: 12, color: 'var(--mp-role-muted)' }}>Sizes are at 1080 px wide (Reel / carousel canvas).</p>
          </div>
        </div>
        <div className="card" style={{ marginTop: 16, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="caption">
            Made <span className="kw">$12,400</span> in eight months
          </div>
          <span style={{ color: 'var(--mp-role-muted)', fontSize: 13 }}>Phrase caption · keyword in violet on butter highlighter</span>
        </div>
      </section>

      {/* Evidence */}
      <section className="section">
        <h2>
          Evidence labels <small>shown only when a number is on screen · always next to the source</small>
        </h2>
        <div className="card ev-board">
          {(Object.keys(t.evidence) as EvidenceKind[]).map((k) => (
            <EvidenceChip key={k} kind={k} />
          ))}
        </div>
        <div className="card dots ev-demo" style={{ background: 'var(--mp-dot-grid), var(--mp-role-card-b)' }}>
          <div className="ev-num">$12,400<span>/mo</span></div>
          <EvidenceChip kind="founder-reported" source="DEMO · Reddit post, Nov 2026" size={1.25} />
        </div>
      </section>

      {/* Series */}
      <section className="section">
        <h2>
          Series <small>tag sits top-left of the hook frame · card colour = scene background</small>
        </h2>
        <div className="series-grid">
          {Object.entries(t.series).map(([id, s], i) => (
            <div key={id} className="series" style={{ '--scene': resolveColor(t, s.scene) } as CSSProperties}>
              <SeriesTag id={id} rot={[-3, 2, -2, 3][i % 4]} />
              <div className="series-foot">
                <span className="mono">{id}</span>
                <span className="series-scene">
                  <i />
                  {s.scene.split('.').pop()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stickers & bubbles */}
      <section className="section">
        <h2>
          Bubbles & stickers <small>hover to pop</small>
        </h2>
        <div className="card dots" style={{ background: 'var(--mp-role-card-c)', display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap', padding: '40px 32px 52px' }}>
          {t.bubbles.map((b, i) => (
            <Bubble key={b.text} text={b.text} bg={b.bg} fg={b.fg} rot={[-8, 6, -6, 4][i % 4]} />
          ))}
          <span className="sticker">
            <Icon name="tag" size={28} stroke={2.6} fill="var(--mp-role-surface)" /> $9/mo
          </span>
          <span className="plus">+$9</span>
          <span className="cta">Follow {t.brand.handle}</span>
        </div>
      </section>

      {/* Icons */}
      <section className="section">
        <h2>
          Icons <small>original MRR Pop set · ink stroke + one candy fill · never emoji · click to copy name</small>
        </h2>
        <div className="card icon-grid">
          {iconNames.map((n, i) => (
            <button key={n} className="icon-cell" onClick={() => copy(`<Icon name="${n}" />`, n)}>
              <Icon
                name={n}
                size={40}
                fill={['var(--mp-accent-lime)', 'var(--mp-accent-lilac)', 'var(--mp-accent-yellow)', 'var(--mp-accent-pink)'][i % 4]}
              />
              <span className="mono">{n}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Motion & shape */}
      <section className="section">
        <h2>
          Motion <small>hover a row to replay</small>
        </h2>
        <div className="card">
          {Object.entries(t.motion.easing).map(([k, v]) => (
            <div key={k} className="ease">
              <b>{k}</b>
              <span className="mono">{v}</span>
              <div className="track">
                <i style={{ transitionTimingFunction: v }} />
              </div>
            </div>
          ))}
          <div className="mono" style={{ marginTop: 12, color: 'var(--mp-role-muted)' }}>
            {Object.entries(t.motion.durations)
              .map(([k, v]) => `${k} ${v}s`)
              .join(' · ')}{' '}
            · transition: {t.motion.sceneTransition} · {t.motion.fps} fps
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Rules</h2>
        <div className="card">
          <ul className="rules">
            {t.rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </section>
      {toast}
    </div>
  );
}

const brandCss = `
.hero{position:relative;min-height:260px;overflow:hidden;padding:30px 170px 30px 30px}
.hero-logo svg{width:340px;max-width:100%;height:auto;display:block}
.hero-tag{font:800 26px/1.2 var(--mp-font-sans);letter-spacing:-.6px;margin-top:14px}
.hero-tag .it{font-size:31px}
.hero-meta{display:flex;gap:8px;margin-top:18px;flex-wrap:wrap}
.mark{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.dl{display:flex;gap:6px}
.dl button{padding:6px 10px;border-radius:999px;border:2px solid var(--mp-role-ink);background:var(--mp-role-surface);font:800 11px/1 var(--mp-font-sans);cursor:pointer;letter-spacing:.3px}
.dl button:hover{background:var(--mp-role-highlight)}
.mark svg{width:120px;height:120px;display:block}
.mark small{font-size:12px;color:var(--mp-role-muted);font-weight:600}
.mix{display:flex;height:44px;border-radius:14px;overflow:hidden;border:2px solid color-mix(in srgb,var(--mp-role-ink) 12%,transparent);font:700 12px/44px var(--mp-font-sans)}
.mix div{padding:0 10px;white-space:nowrap;overflow:hidden}
.swatches{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}
.swatch{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-height:150px;padding:16px;border-radius:22px;border:0;cursor:pointer;text-align:left;
  box-shadow:var(--mp-shadow-card);transition:transform .2s var(--mp-ease-back)}
.swatch:hover{transform:translateY(-3px) rotate(-.6deg)}
.swatch b{font-size:17px;font-weight:800}
.swatch .role{font-size:12px;opacity:.75;margin-top:auto;line-height:1.3}
.swatch .var{opacity:.55;font-size:11px}
.swatch .var:hover{opacity:1;text-decoration:underline}
.scale{width:100%;border-collapse:collapse;font-size:14px}
.scale td{padding:7px 4px;white-space:nowrap;font-size:13px;border-bottom:1px solid color-mix(in srgb,var(--mp-role-ink) 8%,transparent)}
.caption{display:inline-block;padding:14px 24px;background:var(--mp-role-surface);border-radius:var(--mp-radius-caption);font:800 32px/1.15 var(--mp-font-sans);letter-spacing:-.8px;box-shadow:var(--mp-shadow-caption)}
.caption .kw{color:var(--mp-role-primary);background:linear-gradient(transparent 58%,var(--mp-role-highlight) 58%);padding:0 4px}
.ev{--ev-s:1;display:inline-flex;align-items:center;gap:calc(9px*var(--ev-s));padding:calc(5px*var(--ev-s)) calc(14px*var(--ev-s)) calc(5px*var(--ev-s)) calc(5px*var(--ev-s));
  background:var(--ev-bg);color:var(--mp-role-ink);border:calc(3px*var(--ev-s)) solid var(--mp-role-ink);border-radius:999px;
  box-shadow:calc(3px*var(--ev-s)) calc(3px*var(--ev-s)) 0 var(--mp-role-ink);font:800 calc(13px*var(--ev-s))/1 var(--mp-font-sans);
  letter-spacing:.6px;text-transform:uppercase;white-space:nowrap;transition:transform .2s var(--mp-ease-back),box-shadow .2s}
.ev:hover{transform:translate(-1px,-1px);box-shadow:calc(4px*var(--ev-s)) calc(4px*var(--ev-s)) 0 var(--mp-role-ink)}
.ev-coin{display:grid;place-items:center;width:calc(28px*var(--ev-s));height:calc(28px*var(--ev-s));border-radius:50%;background:var(--ev-fg);
  border:calc(2.5px*var(--ev-s)) solid var(--mp-role-ink);color:#fff;flex:none}
.ev-label{color:var(--ev-fg);filter:brightness(.78) saturate(1.2)}
.ev-src{font-weight:700;text-transform:none;letter-spacing:0;color:var(--mp-role-muted);padding-left:calc(9px*var(--ev-s));
  border-left:2px dashed color-mix(in srgb,var(--mp-role-ink) 22%,transparent)}
.ev-board{display:flex;gap:14px 16px;flex-wrap:wrap;padding:24px}
.ev-demo{margin-top:16px;display:flex;align-items:flex-end;gap:22px;flex-wrap:wrap;padding:26px 28px}
.ev-num{font:900 clamp(56px,7vw,96px)/.9 var(--mp-font-sans);letter-spacing:-4px}
.ev-num span{font-size:.38em;letter-spacing:-1px;color:var(--mp-role-muted)}
.stag{display:inline-flex;align-items:center;gap:12px;padding:7px 18px 7px 7px;background:var(--st-bg);border:4px solid var(--mp-role-ink);
  border-radius:20px;box-shadow:5px 5px 0 var(--mp-role-ink);transform:rotate(var(--rot));transition:transform .3s var(--mp-ease-back)}
.stag-ic{display:grid;place-items:center;width:44px;height:44px;border-radius:13px;background:var(--mp-role-surface);border:3px solid var(--mp-role-ink);
  color:var(--mp-role-ink);transform:rotate(-6deg)}
.stag-txt{display:flex;flex-direction:column;gap:3px;font:900 italic 25px/1 var(--mp-font-sans);letter-spacing:-.8px;text-transform:uppercase;white-space:nowrap}
.stag-txt small{font:800 normal 10px/1 var(--mp-font-sans);letter-spacing:2.2px;opacity:.72}
.series-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.series{display:flex;flex-direction:column;justify-content:space-between;gap:34px;min-height:170px;padding:24px 20px 16px;border-radius:24px;
  background:var(--mp-dot-grid),var(--scene);box-shadow:var(--mp-shadow-card)}
.series:hover .stag{transform:rotate(calc(var(--rot) * -1)) scale(1.06)}
.series-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;color:var(--mp-role-muted)}
.series-scene{display:inline-flex;align-items:center;gap:6px;font:700 12px/1 var(--mp-font-sans)}
.series-scene i{width:14px;height:14px;border-radius:5px;background:var(--mp-role-surface);border:2px solid var(--mp-role-ink)}
.bubble{position:relative;padding:12px 22px;background:var(--bub);border:5px solid var(--mp-role-ink);border-radius:var(--mp-radius-bubble);
  font:900 italic 38px/1 var(--mp-font-sans);letter-spacing:-1px;box-shadow:var(--mp-shadow-hard);transform:rotate(var(--rot));transform-origin:20% 100%;cursor:default}
.bubble:after{content:"";position:absolute;left:30px;bottom:-20px;width:24px;height:24px;background:var(--bub);border-right:5px solid var(--mp-role-ink);border-bottom:5px solid var(--mp-role-ink);transform:skewX(25deg) rotate(45deg)}
.bubble:hover{animation:bub .45s var(--mp-ease-back)}
@keyframes bub{0%{transform:rotate(var(--rot)) scale(.3);opacity:0}100%{transform:rotate(var(--rot)) scale(1)}}
.sticker{display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:999px;background:var(--mp-role-highlight);border:4px solid var(--mp-role-ink);box-shadow:5px 5px 0 var(--mp-role-ink);
  font:800 26px/1 var(--mp-font-sans);transform:rotate(8deg);transition:transform .3s var(--mp-ease-back)}
.sticker:hover{transform:rotate(-4deg) scale(1.1)}
.plus{padding:8px 16px;border-radius:999px;background:var(--mp-role-surface);border:3px solid var(--mp-role-positive);color:var(--mp-role-positive-ink);font:900 24px/1 var(--mp-font-sans)}
.cta{padding:14px 26px;border-radius:999px;background:var(--mp-role-primary);color:#fff;font:800 22px/1 var(--mp-font-sans);box-shadow:5px 5px 0 var(--mp-role-ink);border:4px solid var(--mp-role-ink)}
.ease{display:grid;grid-template-columns:80px 260px 1fr;gap:16px;align-items:center;padding:10px 0;border-bottom:1px solid color-mix(in srgb,var(--mp-role-ink) 8%,transparent)}
.ease .track{position:relative;height:28px;border-radius:999px;background:var(--mp-role-page)}
.ease .track i{position:absolute;left:4px;top:4px;width:20px;height:20px;border-radius:50%;background:var(--mp-role-primary);transition:left .8s}
.ease:hover .track i{left:calc(100% - 24px)}
.icon-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:10px}
.icon-cell{display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 6px 12px;border-radius:18px;border:2px solid transparent;background:var(--mp-role-page);cursor:pointer;color:var(--mp-role-ink);transition:transform .2s var(--mp-ease-back)}
.icon-cell:hover{border-color:var(--mp-role-ink);transform:translateY(-2px) rotate(-2deg);box-shadow:3px 3px 0 var(--mp-role-ink)}
.icon-cell .mono{font-size:11px;color:var(--mp-role-muted)}
.rules{display:grid;gap:8px;padding-left:20px;font-size:15px}
@media (max-width:860px){.ease{grid-template-columns:1fr}.grid{grid-template-columns:1fr!important}}
`;
