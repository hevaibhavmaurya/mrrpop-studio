import { useState } from 'react';
import data from '@root/content/drafts/drafts.json';

// Upcoming Reels: researched topics + scripts before they become story folders.
// Source of truth: content/drafts/build.py → content/drafts/drafts.json (edit build.py, re-run it, this page reloads).

interface Draft {
  id: string;
  order: number;
  series: string;
  title: string;
  tag: string;
  label: string;
  key_number: string;
  lines: string[];
  cards: string[];
  sources: [string, string][];
  notes: string;
  words: number;
  seconds_mrpop: number;
  hook_score: number | null;
  hook_grade: string | null;
  human_score: number | null;
  human_grade: string | null;
  beat_flags: string[];
  status: string;
}

const drafts = ([...(data as unknown as { drafts: Draft[] }).drafts]).sort((a, b) => a.order - b.order);
const SERIES: Record<string, string> = {
  'revenue-pop': '💸 Revenue Pop',
  'launch-pop': '🚀 Launch Pop',
  'deal-pop': '🤝 Deal Pop',
  'growth-story': '📈 Growth Story',
  'founder-brief': '🧠 Founder Brief',
  'guess-the-mrr': '🤔 Guess the MRR',
};
const grade = (g: string | null) => (g === 'STRONG' || g === 'PASS' ? 'good' : g === 'OK' || g === 'REVIEW' ? 'ok' : 'low');

export function DraftsPage() {
  const [sel, setSel] = useState(drafts[0]?.id);
  const [copied, setCopied] = useState(false);
  const d = drafts.find((x) => x.id === sel);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  return (
    <div>
      <style>{css}</style>
      <header className="page-h">
        <div className="grow">
          <h1>
            Drafts <span className="it" style={{ color: 'var(--mp-role-primary)', fontSize: 54 }}>&amp; upcoming</span>
          </h1>
          <p>
            Researched topics and scripts waiting to be produced. Every number has a label and a source. Edit{' '}
            <span className="mono">content/drafts/build.py</span> and re run it to update this page.
          </p>
        </div>
        <div className="dr-count card">
          <b>{drafts.length}</b> drafts
          <span className="mono">updated {(data as { updated: string }).updated}</span>
        </div>
      </header>

      <div className="dr-wrap">
        <div className="dr-list">
          {drafts.map((x) => (
            <button key={x.id} className={'dr-item card' + (x.id === sel ? ' on' : '')} onClick={() => setSel(x.id)}>
              <span className="dr-n">{String(x.order).padStart(2, '0')}</span>
              <span className="dr-body">
                <span className="dr-series">{SERIES[x.series] ?? x.series}</span>
                <b>{x.title}</b>
                <span className="dr-tag">{x.tag}</span>
              </span>
              <span className="dr-sec mono">{Math.round(x.seconds_mrpop)}s</span>
            </button>
          ))}
        </div>

        {d && (
          <div className="dr-detail card">
            <div className="dr-series">{SERIES[d.series] ?? d.series}</div>
            <h2>{d.title}</h2>
            <div className="dr-key">
              <b>{d.key_number}</b>
              <span className="pill dr-ev">{d.label}</span>
              <span className={'pill dr-status ' + d.status}>{d.status}</span>
            </div>

            <div className="dr-stats">
              <div className={'dr-stat ' + grade(d.hook_grade)}>
                <span>Hook</span>
                <b>{d.hook_score ?? 'n/a'}</b>
                <em>{d.hook_grade}</em>
              </div>
              <div className={'dr-stat ' + grade(d.human_grade)}>
                <span>Human</span>
                <b>{d.human_score ?? 'n/a'}</b>
                <em>{d.human_grade}</em>
              </div>
              <div className={'dr-stat ' + (d.seconds_mrpop <= 30 ? 'good' : 'low')}>
                <span>Length</span>
                <b>~{d.seconds_mrpop}s</b>
                <em>{d.words} words</em>
              </div>
            </div>

            <div className="dr-h">
              Script
              <button className="btn" onClick={() => copy(d.lines.join('\n'))}>
                {copied ? 'Copied ✓' : 'Copy script'}
              </button>
            </div>
            <table className="dr-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mr. Pop says</th>
                  <th>On screen</th>
                </tr>
              </thead>
              <tbody>
                {d.lines.map((l, i) => (
                  <tr key={i} className={i === 0 ? 'hook' : ''}>
                    <td className="mono">{i === 0 ? 'HOOK' : i + 1}</td>
                    <td>{l}</td>
                    <td className="dr-card">{d.cards[i] ?? ''}</td>
                  </tr>
                ))}
                {d.cards.slice(d.lines.length).map((c, i) => (
                  <tr key={'c' + i}>
                    <td className="mono">+</td>
                    <td className="dr-muted">(no voice)</td>
                    <td className="dr-card">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="dr-h">Sources</div>
            <ul className="dr-src">
              {d.sources.map(([name, url]) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer">
                    {name}
                  </a>
                </li>
              ))}
            </ul>

            {d.notes && (
              <>
                <div className="dr-h">Notes</div>
                <p className="dr-notes">{d.notes}</p>
              </>
            )}
            {d.beat_flags.length > 0 && (
              <>
                <div className="dr-h">Beat sheet flags</div>
                <ul className="dr-flags">
                  {d.beat_flags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </>
            )}
            <div className="mono dr-path">content/drafts/{d.id}/script.txt</div>
          </div>
        )}
      </div>
    </div>
  );
}

const css = `
.dr-count{display:flex;flex-direction:column;align-items:flex-end;gap:2px;padding:12px 18px;font-size:14px}
.dr-count b{font-size:34px;letter-spacing:-1px;line-height:1}
.dr-count .mono{color:var(--mp-role-muted);font-size:12px}
.dr-wrap{display:grid;grid-template-columns:minmax(260px,340px) 1fr;gap:16px;align-items:start}
.dr-list{display:flex;flex-direction:column;gap:8px}
.dr-item{display:flex;align-items:center;gap:12px;text-align:left;border:3px solid transparent;cursor:pointer;padding:10px 14px}
.dr-item.on{border-color:var(--mp-role-primary)}
.dr-n{font:900 22px/1 Inter;color:var(--mp-role-muted);width:30px;flex:none}
.dr-body{display:flex;flex-direction:column;min-width:0;flex:1}
.dr-body b{font-size:15px;line-height:1.25;margin:2px 0}
.dr-tag{font-size:12px;color:var(--mp-role-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dr-sec{font-size:12px;color:var(--mp-role-muted)}
.dr-series{font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--mp-role-muted)}
.dr-detail h2{font-size:28px;letter-spacing:-.6px;margin:4px 0 8px}
.dr-key{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:15px}
.dr-ev{background:var(--mp-role-card-a);font-size:10px}
.dr-status{background:var(--mp-role-highlight);font-size:10px}
.dr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0 6px}
.dr-stat{border-radius:14px;padding:10px 14px;background:var(--mp-role-page);display:flex;flex-direction:column}
.dr-stat span{font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--mp-role-muted)}
.dr-stat b{font-size:26px;letter-spacing:-.8px}
.dr-stat em{font-style:normal;font-size:12px;color:var(--mp-role-muted)}
.dr-stat.good b{color:#1F8A48}.dr-stat.ok b{color:#B7791F}.dr-stat.low b{color:#D64545}
.dr-h{display:flex;align-items:center;justify-content:space-between;font-weight:800;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin:20px 0 8px;color:var(--mp-role-muted)}
.dr-h .btn{font-size:13px;padding:6px 12px;text-transform:none;letter-spacing:0}
.dr-table{width:100%;border-collapse:collapse;font-size:15px}
.dr-table th{text-align:left;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--mp-role-muted);padding:6px 8px;border-bottom:2px solid color-mix(in srgb,var(--mp-role-ink) 12%,transparent)}
.dr-table td{padding:9px 8px;vertical-align:top;border-bottom:1px solid color-mix(in srgb,var(--mp-role-ink) 8%,transparent);line-height:1.45}
.dr-table td.mono{font-size:11px;color:var(--mp-role-muted);width:44px}
.dr-table tr.hook td{background:color-mix(in srgb,var(--mp-role-primary) 10%,transparent);font-weight:700}
.dr-card{font-weight:800;font-size:13px;letter-spacing:.3px;width:34%}
.dr-muted{color:var(--mp-role-muted);font-style:italic}
.dr-src{margin:0;padding-left:18px;line-height:1.7;font-size:14px}
.dr-src a{color:var(--mp-role-primary)}
.dr-notes{margin:0;font-size:14px;line-height:1.5}
.dr-flags{margin:0;padding-left:18px;font-size:13px;color:var(--mp-role-muted);line-height:1.6}
.dr-path{margin-top:16px;color:var(--mp-role-muted);font-size:12px}
@media (max-width:900px){.dr-wrap{grid-template-columns:1fr}.dr-stats{grid-template-columns:1fr 1fr 1fr}}
`;
