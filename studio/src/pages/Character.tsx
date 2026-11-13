import { useEffect, useMemo, useRef, useState } from 'react';
import { bodyMotion, Character, packIds, packs, textToVisemes, useTalk } from '@mrrpop/character';
import { cssVar, useTheme } from '@mrrpop/theme';

const SAMPLE = 'One developer. One extension. Twelve thousand four hundred dollars a month! How?';

export function CharacterPage({ packId, onPack }: { packId: string; onPack: (id: string) => void }) {
  const t = useTheme();
  const pack = packs[packId] ?? packs[packIds[0]];
  const poses = Object.keys(pack.poses);
  const expressions = Object.keys(pack.expressions);
  const visemes = Object.keys(pack.visemes.map);
  const scenes = Object.keys(t.colors.scene ?? {});

  const [pose, setPose] = useState('explaining');
  const [expression, setExpression] = useState('smile');
  const [badge, setBadge] = useState(true);
  const [scene, setScene] = useState(scenes[0] ?? 'periwinkle');
  const [text, setText] = useState(SAMPLE);
  const [take, setTake] = useState(0);
  const [hold, setHold] = useState<string | null>(null);

  const cues = useMemo(() => (take ? textToVisemes(text) : []), [take]); // eslint-disable-line react-hooks/exhaustive-deps
  const talk = useTalk(cues, take > 0, pack.blink?.every);
  const talking = talk.viseme !== 'X';
  // continuous clock for body motion (useTalk only re-renders on mouth changes)
  const [now, setNow] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => (setNow(performance.now() / 1000), (raf = requestAnimationFrame(tick)));
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const exprAt = useRef({ x: expression, t: 0, prev: expression });
  if (exprAt.current.x !== expression) exprAt.current = { x: expression, t: performance.now() / 1000, prev: exprAt.current.x };
  const motion = bodyMotion({
    t: now,
    energy: talking ? 0.6 + 0.2 * Math.sin(now * 2.1) : 0,
    prevExpression: exprAt.current.prev,
    talking,
    expression,
    pose,
    since: Math.max(0, now - exprAt.current.t),
  });

  return (
    <div>
      <style>{charCss}</style>
      <header className="page-h">
        <div className="grow">
          <h1>
            {pack.name} <span className="it" style={{ color: 'var(--mp-role-secondary)', fontSize: 54 }}>rig</span>
          </h1>
          <p>
            Pack <span className="mono">packages/character/packs/{pack.id}/</span> — {pack.layers.length} layers,{' '}
            {Object.keys(pack.parts).length} SVG parts. Every part is its own file; redraw one and only that changes.
          </p>
        </div>
        <label className="select">
          Pack
          <select value={pack.id} onChange={(e) => onPack(e.target.value)}>
            {packIds.map((id) => (
              <option key={id} value={id}>
                {packs[id].name} ({id})
              </option>
            ))}
          </select>
        </label>
      </header>

      {pack.status === 'interim' && (
        <div className="note">
          <b>Interim drawing.</b> {pack.notes}
        </div>
      )}

      {/* Playground */}
      <section className="section">
        <h2>
          Playground <small>make him talk — preview lip sync from text; real videos use Rhubarb on the voiceover</small>
        </h2>
        <div className="play">
          <div className="stage dots" style={{ background: cssVar(`scene.${scene}`) }}>
            <div className="bub-live" style={{ opacity: talking ? 1 : 0 }}>
              {talk.viseme}
            </div>
            <div>
              <Character
                pack={pack.id}
                pose={pose}
                expression={expression}
                viseme={hold ?? talk.viseme}
                blink={talk.blink}
                badge={badge}
                motion={motion}
                height={520}
                style={{ filter: `drop-shadow(${t.shadow.character})` }}
              />
            </div>
          </div>
          <div className="controls card">
            <label>
              Say something
              <textarea className="input" rows={3} value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={() => setTake((n) => n + 1)}>
                ▶ Talk
              </button>
              <button className="btn ghost" onClick={() => setTake(0)}>
                Stop
              </button>
            </div>
            <label>
              Pose
              <div className="chips">
                {poses.map((p) => (
                  <button key={p} className={'chip' + (p === pose ? ' on' : '')} onClick={() => setPose(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Expression
              <div className="chips">
                {expressions.map((x) => (
                  <button key={x} className={'chip' + (x === expression ? ' on' : '')} onClick={() => setExpression(x)}>
                    {x}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Scene card
              <div className="chips">
                {scenes.map((s) => (
                  <button
                    key={s}
                    className={'dot' + (s === scene ? ' on' : '')}
                    style={{ background: cssVar(`scene.${s}`) }}
                    title={s}
                    onClick={() => setScene(s)}
                  />
                ))}
              </div>
            </label>
            <label className="row">
              <input type="checkbox" checked={badge} onChange={(e) => setBadge(e.target.checked)} /> $ pin (off for Sponsored)
            </label>
          </div>
        </div>
      </section>

      {/* Poses */}
      <section className="section">
        <h2>
          Poses <small>{poses.length} · click to use in the playground</small>
        </h2>
        <div className="tiles poses">
          {poses.map((p) => (
            <button key={p} className={'tile' + (p === pose ? ' on' : '')} onClick={() => setPose(p)}>
              <Character pack={pack.id} pose={p} expression="smile" badge={badge} height={260} />
              <b>{p}</b>
              <span>{pack.poses[p].use_for}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Expressions */}
      <section className="section">
        <h2>
          Expressions <small>{expressions.length} · eyes + brows + mouth combos from manifest.json</small>
        </h2>
        <div className="tiles exprs">
          {expressions.map((x) => {
            const e = pack.expressions[x];
            return (
              <button key={x} className={'tile' + (x === expression ? ' on' : '')} onClick={() => setExpression(x)}>
                <Character pack={pack.id} expression={x} crop="head" height={130} />
                <b>{x}</b>
                <span>{e.use_for}</span>
                <span className="mono" style={{ opacity: 0.5 }}>
                  {e.eyes} · {e.brows} · {e.mouth}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Visemes */}
      <section className="section">
        <h2>
          Mouth shapes <small>Rhubarb visemes · hover to hold on the playground</small>
        </h2>
        <div className="tiles vis">
          {visemes.map((v) => (
            <div key={v} className="tile" onMouseEnter={() => setHold(v)} onMouseLeave={() => setHold(null)}>
              <Character pack={pack.id} expression={expression} viseme={v} crop="head" height={110} />
              <b>{v}</b>
              <span>{pack.visemes.labels[v]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Parts */}
      <section className="section">
        <h2>
          Layers <small>draw order, back → front</small>
        </h2>
        <div className="card">
          <table className="layers">
            <tbody>
              {pack.layers.map((l, i) => (
                <tr key={l.id}>
                  <td className="mono">{i + 1}</td>
                  <td>
                    <b>{l.id}</b>
                    {l.head && <span className="tag">head</span>}
                    {l.optional && <span className="tag">optional</span>}
                  </td>
                  <td className="mono">{l.file ?? `${l.dir}/*.svg`}</td>
                  <td>
                    {l.dir &&
                      (pack.variants[l.slot ?? l.id] ?? []).map((v) => (
                        <span key={v} className="tag soft">
                          {v}
                        </span>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const charCss = `
.note{padding:14px 18px;border-radius:16px;background:var(--mp-role-highlight);font-size:14px;line-height:1.45;border:2px solid color-mix(in srgb,var(--mp-role-ink) 12%,transparent)}
.play{display:grid;grid-template-columns:minmax(320px,1fr) 1fr;gap:16px}
.stage{position:relative;border-radius:32px;box-shadow:var(--mp-shadow-panel);display:flex;align-items:flex-end;justify-content:center;min-height:580px;overflow:hidden;padding-top:30px}
.bub-live{position:absolute;left:24px;top:24px;padding:8px 16px;background:var(--mp-role-surface);border:4px solid var(--mp-role-ink);border-radius:18px;font:900 italic 28px/1 var(--mp-font-sans);box-shadow:4px 4px 0 var(--mp-role-ink);color:var(--mp-role-primary);transition:opacity .2s}
.controls{display:flex;flex-direction:column;gap:16px}
.controls label{display:flex;flex-direction:column;gap:8px;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--mp-role-muted)}
.controls label.row{flex-direction:row;align-items:center;text-transform:none;letter-spacing:0;font-size:14px;color:var(--mp-role-ink)}
.controls textarea{resize:vertical;text-transform:none;letter-spacing:0;font-size:15px;line-height:1.4}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{padding:6px 12px;border-radius:999px;border:2px solid color-mix(in srgb,var(--mp-role-ink) 14%,transparent);background:var(--mp-role-surface);font-size:13px;font-weight:700;cursor:pointer;text-transform:none;letter-spacing:0;color:var(--mp-role-ink)}
.chip.on{background:var(--mp-role-primary);border-color:var(--mp-role-primary);color:#fff}
.dot{width:34px;height:34px;border-radius:50%;border:3px solid transparent;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.dot.on{border-color:var(--mp-role-ink)}
.tiles{display:grid;gap:12px}
.tiles.poses{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}
.tiles.exprs{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
.tiles.vis{grid-template-columns:repeat(auto-fill,minmax(110px,1fr))}
.tile{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 10px;background:var(--mp-role-surface);border-radius:20px;border:3px solid transparent;box-shadow:var(--mp-shadow-card);cursor:pointer;text-align:center;transition:transform .2s var(--mp-ease-back)}
.tile:hover{transform:translateY(-3px)}
.tile.on{border-color:var(--mp-role-primary)}
.tile b{font-size:14px;margin-top:6px}
.tile span{font-size:11.5px;color:var(--mp-role-muted);line-height:1.3}
.layers{width:100%;border-collapse:collapse;font-size:14px}
.layers td{padding:8px 6px;border-bottom:1px solid color-mix(in srgb,var(--mp-role-ink) 8%,transparent);vertical-align:top}
.tag{display:inline-block;margin:0 0 3px 6px;padding:2px 8px;border-radius:999px;background:var(--mp-role-card-a);font-size:11px;font-weight:700}
.tag.soft{margin:0 4px 4px 0;background:var(--mp-role-page)}
@media (max-width:860px){.play{grid-template-columns:1fr}.stage{min-height:460px}}
`;
