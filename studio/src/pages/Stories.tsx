import { useState } from 'react';

// Everything is read straight from content/stories/<slug>/ — drop a story folder in and it appears.
const metas = import.meta.glob<Record<string, any>>('@root/content/stories/*/source-files/meta.json', { eager: true, import: 'default' });
const docs = import.meta.glob<string>('@root/content/stories/*/source-files/*.md', { eager: true, query: '?raw', import: 'default' });
const texts = import.meta.glob<string>('@root/content/stories/*/exports/*.txt', { eager: true, query: '?raw', import: 'default' });
const files = import.meta.glob<string>('@root/content/stories/*/exports/*.{mp4,jpg,jpeg,png,zip}', { eager: true, query: '?url', import: 'default' });

const slugOf = (p: string) => p.match(/content\/stories\/([^/]+)\//)?.[1] ?? '';
const slugs = [...new Set([...Object.keys(metas), ...Object.keys(files)].map(slugOf))].filter(Boolean).sort().reverse();

interface Story {
  slug: string;
  meta: Record<string, any>;
  docs: Record<string, string>;
  caption?: string;
  files: Record<string, string>;
}
const stories: Story[] = slugs.map((slug) => {
  const pick = <T,>(m: Record<string, T>) => Object.fromEntries(Object.entries(m).filter(([p]) => slugOf(p) === slug).map(([p, v]) => [p.split('/').pop()!, v]));
  const t = pick(texts);
  return { slug, meta: Object.values(pick(metas))[0] ?? {}, docs: pick(docs), caption: t['caption.txt'], files: pick(files) };
}).sort((a, b) => Number(!!b.meta.product) - Number(!!a.meta.product)); // real stories before demos/templates

const SERIES: Record<string, string> = { 'launch-pop': '🚀 Launch Pop', 'revenue-pop': '💸 Revenue Pop', 'deal-pop': '🤝 Deal Pop', 'growth-story': '📈 Growth Story' };

export function StoriesPage() {
  const [sel, setSel] = useState(stories[0]?.slug);
  const [tab, setTab] = useState<'caption' | 'script' | 'sources'>('caption');
  const [copied, setCopied] = useState(false);
  const s = stories.find((x) => x.slug === sel);

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
            Stories <span className="it" style={{ color: 'var(--mp-role-primary)', fontSize: 54 }}>&amp; exports</span>
          </h1>
          <p>
            Every folder in <span className="mono">content/stories/</span>: the Reel, cover, caption, script and sources. Files live in{' '}
            <span className="mono">&lt;slug&gt;/exports/</span>.
          </p>
        </div>
      </header>

      {!stories.length && <div className="card">No stories yet.</div>}

      <div className="st-list">
        {stories.map((x) => (
          <button key={x.slug} className={'st-item card' + (x.slug === sel ? ' on' : '')} onClick={() => setSel(x.slug)}>
            {x.files['cover.jpg'] ? <img src={x.files['cover.jpg']} alt="" /> : <div className="st-ph">🎬</div>}
            <div>
              <div className="st-series">{SERIES[x.meta.series] ?? x.meta.series ?? 'Story'}</div>
              <b>{x.meta.product || x.slug}</b>
              <div className="st-meta">
                <span className={'pill st-status ' + (x.meta.status || 'draft')}>{x.meta.status || 'draft'}</span>
                <span className="mono">{x.slug.slice(0, 10)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {s && (
        <div className="st-detail">
          <div className="st-player card">
            {s.files['reel.mp4'] ? (
              <video key={s.slug} src={s.files['reel.mp4']} poster={s.files['cover.jpg']} controls playsInline preload="metadata" />
            ) : (
              <div className="st-ph tall">No reel.mp4 yet</div>
            )}
            <div className="st-dl">
              {Object.entries(s.files).map(([name, url]) => (
                <a key={name} className="btn ghost" href={url} download={`${s.slug}-${name}`}>
                  ⬇ {name}
                </a>
              ))}
            </div>
            <div className="mono st-path">content/stories/{s.slug}/exports/</div>
          </div>

          <div className="st-info card">
            <div className="st-head">
              <div className="st-series">{SERIES[s.meta.series] ?? s.meta.series}</div>
              <h2>{s.meta.product || s.slug}</h2>
              {s.meta.key_number && (
                <div className="st-key">
                  <b>{s.meta.key_number}</b>
                  {s.meta.evidence && <span className="pill ev">{s.meta.evidence}</span>}
                  {s.meta.sponsored && <span className="pill sp">Sponsored</span>}
                </div>
              )}
            </div>
            <div className="st-tabs">
              {(['caption', 'script', 'sources'] as const).map((t) => (
                <button key={t} className={'chip' + (tab === t ? ' on' : '')} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
              {tab === 'caption' && s.caption && (
                <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => copy(s.caption!)}>
                  {copied ? 'Copied ✓' : 'Copy caption'}
                </button>
              )}
            </div>
            <pre className="st-doc">
              {tab === 'caption'
                ? (s.caption ?? s.docs['caption.md'] ?? 'No caption yet.')
                : tab === 'script'
                  ? (s.docs['script.md'] ?? 'No script yet.')
                  : (s.docs['sources.md'] ?? 'No sources yet.')}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

const css = `
.st-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.st-item{display:flex;gap:14px;align-items:center;text-align:left;border:3px solid transparent;cursor:pointer;padding:12px}
.st-item.on{border-color:var(--mp-role-primary)}
.st-item img,.st-item .st-ph{width:64px;height:114px;border-radius:12px;object-fit:cover;flex:none;background:var(--mp-role-page)}
.st-ph{display:grid;place-items:center;font-size:28px;color:var(--mp-role-muted)}
.st-ph.tall{width:100%;height:auto;aspect-ratio:9/16;font-size:16px}
.st-item b{display:block;font-size:16px;line-height:1.25;margin:4px 0 8px}
.st-series{font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--mp-role-muted)}
.st-meta{display:flex;gap:8px;align-items:center}
.st-status{background:var(--mp-role-highlight);font-size:10px;padding:4px 8px}
.st-detail{display:grid;grid-template-columns:minmax(260px,360px) 1fr;gap:16px;margin-top:20px;align-items:start}
.st-player video{width:100%;aspect-ratio:9/16;border-radius:16px;background:#000;display:block}
.st-dl{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.st-dl .btn{font-size:13px;padding:7px 12px;text-decoration:none}
.st-path{margin-top:10px;color:var(--mp-role-muted)}
.st-head h2{font-size:26px;letter-spacing:-.6px;margin:4px 0 8px}
.st-key{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:15px}
.st-key .ev{background:var(--mp-role-card-a);font-size:10px}
.st-key .sp{background:var(--mp-role-card-c);font-size:10px}
.st-tabs{display:flex;gap:6px;align-items:center;margin:18px 0 10px}
.st-tabs .chip{padding:6px 12px;border-radius:999px;border:2px solid color-mix(in srgb,var(--mp-role-ink) 14%,transparent);background:var(--mp-role-surface);font-size:13px;font-weight:700;cursor:pointer;text-transform:capitalize}
.st-tabs .chip.on{background:var(--mp-role-primary);border-color:var(--mp-role-primary);color:#fff}
.st-doc{white-space:pre-wrap;word-break:break-word;font:14px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--mp-role-page);padding:16px;border-radius:14px;max-height:620px;overflow:auto}
@media (max-width:860px){.st-detail{grid-template-columns:1fr}}
`;
