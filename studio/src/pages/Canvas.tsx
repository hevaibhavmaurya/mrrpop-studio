import { useEffect, useMemo, useRef, useState } from 'react';
import { bodyMotion, energyAt, motionTransforms, packs, packIds, type LoadedPack } from '@mrrpop/character';

// Live preview of a Reel: the story's template + voiceover + mouth track + character pack, assembled in the browser.
// Edit reel.tpl.html, the pack, or re-voice → the page hot-reloads. Render the MP4 only once it looks right.
const tpls = import.meta.glob<string>('@root/content/stories/*/build/*.tpl.html', { eager: true, query: '?raw', import: 'default' });
const tplUrls = import.meta.glob<string>('@root/content/stories/*/build/*.tpl.html', { eager: true, query: '?url', import: 'default' });
const beatsFiles = import.meta.glob<any>('@root/content/stories/*/voice/**/voiceover.beats.json', { eager: true, import: 'default' });
const visFiles = import.meta.glob<any>('@root/content/stories/*/build/visemes.json', { eager: true, import: 'default' });
const faceFiles = import.meta.glob<any>('@root/content/stories/*/voice/**/voiceover.face.json', { eager: true, import: 'default' });
/** face.json (voice engine: cues from the real audio + text) → per-frame mouth string the templates read */
const faceToVis = (face: any) => {
  const n = Math.ceil(face.duration * 30), f: string[] = Array(n).fill('X');
  for (const c of face.visemes) for (let i = Math.floor(c.start * 30); i < Math.min(n, Math.ceil(c.end * 30)); i++) f[i] = c.value;
  return { fps: 30, frames: f.join(''), energy: face.energy, source: 'face.json' };
};
const wavs = import.meta.glob<string>('@root/content/stories/*/voice/**/voiceover.wav', { eager: true, query: '?url', import: 'default' });
const metas = import.meta.glob<any>('@root/content/stories/*/source-files/meta.json', { eager: true, import: 'default' });
const iconFiles = import.meta.glob<string>('@root/packages/ui/icons/*.svg', { eager: true, query: '?raw', import: 'default' });
const ICONS = Object.fromEntries(Object.entries(iconFiles).map(([p, v]) => [p.split('/').pop()!.slice(0, -4), v.trim()]));

const slugOf = (p: string) => p.match(/content\/stories\/([^/]+)\//)?.[1] ?? '';
const find = <T,>(m: Record<string, T>, slug: string) => Object.entries(m).find(([p]) => slugOf(p) === slug)?.[1];
// versions: build/reel.tpl.html = current, build/reel-v3.tpl.html = "v3" (uses voice/v3/ if present, else voice/)
interface Version { key: string; slug: string; tplPath: string; stem: string; voiceDir: string }
const VERSIONS: Version[] = Object.keys(tpls).map((p) => {
  const stem = p.split('/').pop()!.replace('.tpl.html', '');
  const v = stem.startsWith('reel-') ? stem.slice(5) : '';
  return { key: `${slugOf(p)}|${stem}`, slug: slugOf(p), tplPath: p, stem, voiceDir: v };
}).sort((a, b) => (a.slug === b.slug ? b.stem.localeCompare(a.stem) : b.slug.localeCompare(a.slug)));
const reels = VERSIONS.map((v) => v.key);
/** voice file for a version: voice/<v>/voiceover.* if it exists, else voice/voiceover.* */
const findVoice = <T,>(m: Record<string, T>, v: Version): T | undefined => {
  const own = v.voiceDir && Object.entries(m).find(([p]) => slugOf(p) === v.slug && p.includes(`/voice/${v.voiceDir}/`))?.[1];
  return own || Object.entries(m).find(([p]) => slugOf(p) === v.slug && /\/voice\/voiceover\./.test(p))?.[1];
};

/** Same output as packages/character/scripts/rig.mjs: every slot variant as <g id="slot-variant">, head layers in <g id="head">. */
function buildRig(p: LoadedPack): string {
  const first = Object.values(p.expressions)[0] ?? {};
  const def: Record<string, string> = { ...(p.defaults ?? {}), ...first, arms: Object.values(p.poses)[0]?.arms };
  let lower = '';
  let arms = '';
  let body = '';
  let head = '';
  for (const l of p.layers) {
    let g: string;
    if (l.file) g = `<g data-layer="${l.id}">${p.parts[l.file] ?? ''}</g>`;
    else {
      const slot = l.slot ?? l.id;
      g = `<g data-layer="${l.id}">` +
        (p.variants[slot] ?? []).map((v) => `<g id="${slot}-${v}" style="display:${v === def[slot] ? 'inline' : 'none'}">${p.parts[`${l.dir}/${v}.svg`] ?? ''}</g>`).join('') +
        `</g>`;
    }
    if (l.head) head += g;
    else if (l.lower ?? l.id === 'legs') lower += g;
    else if ((l.slot ?? l.id) === 'arms') arms += g;
    else body += g;
  }
  // root (hops) › legs (knees, planted feet) + upper (body + head, rides on the hips) — see bodyMotion()
  let svg = `<g id="root"><g id="legs">${lower}</g><g id="upper">` + body + `<g id="armsrig">${arms}</g>` +
    `<g id="head" style="transform-box:view-box;transform-origin:${p.headPivot[0]}px ${p.headPivot[1]}px">${head}</g></g></g>`;
  // unique clip ids; each url(#x) points at the nearest preceding definition
  let n = 0;
  const orig = new Map<string, string>();
  svg = svg.replace(/<clipPath id="([^"]+)"/g, (_, id) => { const nid = `${id}-c${n++}`; orig.set(nid, id); return `<clipPath id="${nid}"`; });
  const last: Record<string, string> = {};
  svg = svg.replace(/id="([^"]+-c\d+)"|url\(#([^)]+)\)/g, (s, defId, ref) => {
    if (defId) { last[orig.get(defId)!] = defId; return s; }
    return last[ref] ? `url(#${last[ref]})` : s;
  });
  const [x, y, w, h] = p.viewBox;
  return `<svg id="rig" xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" style="overflow:visible">${svg}</svg>`;
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

export function CanvasPage({ packId }: { packId: string }) {
  const [sel, setSel] = useState(reels[0]);
  const ver = VERSIONS.find((v) => v.key === sel) ?? VERSIONS[0];
  const slug = ver?.slug;
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [safe, setSafe] = useState(false);
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const raf = useRef(0);

  const pack = packs[packId] ?? packs[packIds[0]];
  const beats = ver ? findVoice(beatsFiles, ver) : undefined;
  const face = ver ? findVoice(faceFiles, ver) : undefined;
  const vis = face ? faceToVis(face) : slug ? find(visFiles, slug) : undefined;
  const wav = ver ? findVoice(wavs, ver) : undefined;
  const meta = slug ? find(metas, slug) : undefined;
  const duration = beats ? beats.duration + 0.5 : 0;

  const srcDoc = useMemo(() => {
    if (!slug || !beats || !vis) return '';
    const tpl = tpls[ver.tplPath];
    const base = tplUrls[ver.tplPath].replace(/[^/]*$/, ''); // so relative font paths resolve
    const data = { duration: beats.duration, beats: beats.beats, visemes: vis, face: face ? { expressions: face.expressions, poses: face.poses } : null,
      manifest: { poses: pack.poses, expressions: pack.expressions, defaults: pack.defaults ?? {} } };
    // the exact motion engine the studio uses, so Canvas = studio = render
    const motionJs = `<script>window.bodyMotion=${bodyMotion.toString()};window.motionTransforms=${motionTransforms.toString()};window.energyAt=${energyAt.toString()};` +
      `window.MP_HIP=${JSON.stringify(pack.hip ?? [300, 880])};window.MP_FEET=${pack.feet ?? 1346};window.MP_WAIST=${JSON.stringify(pack.waist ?? null)};</script>`;
    return tpl.replace('<head>', `<head><base href="${base}">${motionJs}`).replace('RIG', () => buildRig(pack)).replace('DATAJSON', () => JSON.stringify(data)).replace('ICONSJSON', () => JSON.stringify(ICONS));
  }, [ver, slug, beats, vis, pack]);

  const draw = (time: number) => {
    const w = frame.current?.contentWindow as (Window & { render?: (t: number) => void }) | null;
    w?.render?.(time);
  };

  // playback loop: the audio clock drives the animation, so voice and lip sync stay locked
  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      const a = audio.current;
      const time = a ? a.currentTime : 0;
      draw(time);
      setT(time);
      if (a && (a.ended || time >= duration)) { setPlaying(false); return; }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, duration]);

  useEffect(() => { setReady(false); setPlaying(false); setT(0); audio.current?.pause(); }, [srcDoc]);

  const seek = (time: number) => {
    const v = Math.max(0, Math.min(duration, time));
    if (audio.current) audio.current.currentTime = Math.min(v, audio.current.duration || v);
    setT(v);
    draw(v);
  };
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); return; }
    if (t >= duration - 0.05) seek(0);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  // keyboard: space play/pause, ← → step one frame
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      if (e.code === 'ArrowRight') seek(t + 1 / 30);
      if (e.code === 'ArrowLeft') seek(t - 1 / 30);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  const SCALE = 0.36;
  const activeBeat = beats?.beats.findIndex((b: any) => t >= b.start - 0.05 && t < b.end + 0.3) ?? -1;

  return (
    <div>
      <style>{css}</style>
      <header className="page-h">
        <div className="grow">
          <h1>
            Canvas <span className="it" style={{ color: 'var(--mp-role-primary)', fontSize: 54 }}>live</span>
          </h1>
          <p>
            Plays the Reel in real time: voiceover, lip sync, Mr. Pop and every animation. Review here, render the MP4 only when it's final.
          </p>
        </div>
        <label className="select">
          Reel
          <select value={sel} onChange={(e) => setSel(e.target.value)}>
            {VERSIONS.map((v) => (
              <option key={v.key} value={v.key}>
                {(find(metas, v.slug)?.product || v.slug).slice(0, 34)} · {v.stem === 'reel' ? 'current' : v.stem.replace('reel-', '')}
              </option>
            ))}
          </select>
        </label>
      </header>

      {!slug && <div className="card">No reel templates yet (content/stories/&lt;slug&gt;/build/reel.tpl.html).</div>}
      {ver && ver.voiceDir && !Object.keys(wavs).some((p) => slugOf(p) === ver.slug && p.includes(`/voice/${ver.voiceDir}/`)) && (
        <div className="card" style={{ background: 'var(--mp-accent-yellow, #FFD43B)' }}>
          voice/{ver.voiceDir}/voiceover.wav isn't rendered yet, so this preview plays the older voice/voiceover.wav. The scenes won't line up with the audio until the {ver.voiceDir} voiceover exists.
        </div>
      )}
      {slug && (!beats || !vis) && <div className="card">This reel needs voice/voiceover.beats.json and build/visemes.json — run the voice step first.</div>}

      {slug && beats && vis && (
        <div className="cv">
          <div className="cv-stage" style={{ width: 1080 * SCALE, height: 1920 * SCALE }}>
            <iframe
              ref={frame}
              title="reel"
              srcDoc={srcDoc}
              style={{ transform: `scale(${SCALE})` }}
              onLoad={() => { setReady(true); draw(t); }}
            />
            {safe && (
              <div className="cv-safe">
                <i style={{ top: 0, height: 250 * SCALE, left: 0, right: 0 }} />
                <i style={{ bottom: 0, height: 480 * SCALE, left: 0, right: 0 }} />
                <i style={{ top: 250 * SCALE, bottom: 480 * SCALE, right: 0, width: 230 * SCALE }} />
                <i style={{ top: 250 * SCALE, bottom: 480 * SCALE, left: 0, width: 80 * SCALE }} />
                <b style={{ top: 250 * SCALE + 4, left: 6 }}>text safe zone</b>
              </div>
            )}
            {!ready && <div className="cv-loading">Loading…</div>}
          </div>

          <div className="cv-side">
            <div className="card cv-controls">
              <div className="cv-row">
                <button className="btn" onClick={toggle} disabled={!ready}>
                  {playing ? '❚❚ Pause' : '▶ Play'}
                </button>
                <button className="btn ghost" onClick={() => seek(0)}>⏮</button>
                <span className="mono cv-time">
                  {fmt(t)} / {fmt(duration)} · frame {Math.round(t * 30)}
                </span>
              </div>
              <input
                className="cv-scrub"
                type="range"
                min={0}
                max={duration}
                step={1 / 30}
                value={t}
                onChange={(e) => { audio.current?.pause(); setPlaying(false); seek(Number(e.target.value)); }}
              />
              <div className="cv-ticks">
                {beats.beats.map((b: any, i: number) => (
                  <i key={i} style={{ left: `${(b.start / duration) * 100}%`, width: `${((b.end - b.start) / duration) * 100}%` }} className={i === activeBeat ? 'on' : ''} />
                ))}
              </div>
              <label className="cv-row" style={{ fontSize: 13, fontWeight: 700 }}>
                <input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} /> Show Instagram safe zone
              </label>
              <span className="cv-hint">Space = play/pause · ← → = step one frame</span>
            </div>

            <div className="card cv-beats">
              <h3>Beats</h3>
              {beats.beats.map((b: any, i: number) => (
                <button key={i} className={'cv-beat' + (i === activeBeat ? ' on' : '')} onClick={() => seek(b.start)}>
                  <span className="mono">{fmt(b.start)}</span>
                  <span className="pill">{b.style}</span>
                  <span>{b.text}</span>
                </button>
              ))}
            </div>
            <div className="card cv-how mono">
              Live from: content/stories/{slug}/build/{ver.stem}.tpl.html · voice/{ver.voiceDir && findVoice(wavs, ver) && Object.keys(wavs).some((p) => p.includes(`/voice/${ver.voiceDir}/`)) ? ver.voiceDir + '/' : ''}voiceover.wav · pack {pack.id}
              <br />
              Final MP4: node packages/pipeline/render/capture.mjs … + swift packages/pipeline/render/encode.swift …
            </div>
          </div>
          {wav && <audio ref={audio} src={wav} preload="auto" onEnded={() => setPlaying(false)} />}
        </div>
      )}
    </div>
  );
}

const css = `
.cv{display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:start}
.cv-stage{position:relative;border-radius:22px;overflow:hidden;box-shadow:var(--mp-shadow-panel);background:#fff;flex:none}
.cv-stage iframe{width:1080px;height:1920px;border:0;transform-origin:0 0;display:block;pointer-events:none}
.cv-loading{position:absolute;inset:0;display:grid;place-items:center;font-weight:700;color:var(--mp-role-muted);background:var(--mp-role-page)}
.cv-safe{position:absolute;inset:0;pointer-events:none}
.cv-safe i{position:absolute;background:rgba(240,71,90,.22);outline:1px dashed rgba(240,71,90,.8)}
.cv-safe b{position:absolute;font:800 10px/1 Inter,sans-serif;color:#F0475A;background:#fff;padding:3px 6px;border-radius:6px}
.cv-side{display:grid;gap:14px;min-width:0}
.cv-controls{display:grid;gap:12px}
.cv-row{display:flex;gap:10px;align-items:center}
.cv-time{color:var(--mp-role-muted);margin-left:auto}
.cv-scrub{width:100%;accent-color:var(--mp-role-primary)}
.cv-ticks{position:relative;height:10px;margin-top:-6px}
.cv-ticks i{position:absolute;top:0;height:6px;border-radius:3px;background:var(--mp-role-card-a)}
.cv-ticks i.on{background:var(--mp-role-primary)}
.cv-hint{font-size:12px;color:var(--mp-role-muted)}
.cv-beats{display:grid;gap:4px;max-height:420px;overflow:auto}
.cv-beats h3{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--mp-role-muted);margin-bottom:6px}
.cv-beat{display:grid;grid-template-columns:52px 70px 1fr;gap:10px;align-items:center;text-align:left;padding:8px 10px;border:0;border-radius:12px;background:none;cursor:pointer;font-size:14px}
.cv-beat:hover{background:var(--mp-role-page)}
.cv-beat.on{background:var(--mp-role-card-a)}
.cv-beat .pill{background:var(--mp-role-page);font-size:10px;padding:4px 8px;justify-content:center}
.cv-how{font-size:11px;color:var(--mp-role-muted);line-height:1.6}
@media (max-width:860px){.cv{grid-template-columns:1fr}}
`;
