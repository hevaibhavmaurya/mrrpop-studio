import registry from '@root/voices/custom/voices.json';
import { Character } from '@mrrpop/character';
import { Icon } from '@mrrpop/theme';
import { TalkingTake, type FaceTrack } from '../components/TalkingTake';

const samples = import.meta.glob<string>('../../../voices/custom/*/sample.wav', { eager: true, query: '?url', import: 'default' });
const sampleFor = (id: string) => Object.entries(samples).find(([p]) => p.includes(`/custom/${id}/`))?.[1];

// Every voiceover render in every story: content/stories/<slug>/voice/**/*.wav (+ .beats.json from perform/expressive).
type TakeMeta = { voice?: string; engine?: string; ref?: string; seed?: number; duration?: number; lufs?: number };
const takeWavs = import.meta.glob<string>('../../../content/stories/*/voice/**/*.wav', { eager: true, query: '?url', import: 'default' });
const takeMeta = import.meta.glob<TakeMeta>('../../../content/stories/*/voice/**/*.beats.json', { eager: true, import: 'default' });
const takeFace = import.meta.glob<FaceTrack>('../../../content/stories/*/voice/**/*.face.json', { eager: true, import: 'default' });
const voiceName = (id?: string) => registry.voices.find((v) => v.id === id)?.name ?? id;

const GROUPS = [
  { key: 'signature', title: 'Signature · Mr. Pop', sub: 'the one voice · lip sync + expressions from the audio', icon: 'star', fill: 'var(--mp-accent-yellow)' },
  { key: '', title: 'Other voiceovers', sub: 'older renders — re-render with the signature voice', icon: 'play', fill: 'var(--mp-accent-yellow)' },
];

function storyTakes() {
  const stories: Record<string, Record<string, { name: string; url: string; meta?: TakeMeta; face?: FaceTrack }[]>> = {};
  for (const [path, url] of Object.entries(takeWavs)) {
    const m = path.match(/stories\/([^/]+)\/voice\/(?:([^/]+)\/)?([^/]+)\.wav$/);
    if (!m) continue;
    const [, slug, group = '', name] = m;
    const meta = takeMeta[path.replace(/\.wav$/, '.beats.json')];
    const face = takeFace[path.replace(/\.wav$/, '.face.json')];
    ((stories[slug] ??= {})[group] ??= []).push({ name, url, meta, face });
  }
  return Object.entries(stories).sort(([a], [b]) => b.localeCompare(a));
}

function StoryTakes({ packId }: { packId?: string }) {
  const stories = storyTakes();
  if (!stories.length) return null;
  return (
    <section className="takes">
      <h2 className="takes-h">
        Story voiceovers <small>every render in content/stories/&lt;slug&gt;/voice/ · same words, compare by ear</small>
      </h2>
      {stories.map(([slug, groups]) => (
        <div key={slug} className="card story">
          <div className="story-h">
            <b>{slug.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' ')}</b>
            <span className="mono">{slug}</span>
          </div>
          {GROUPS.filter((g) => groups[g.key]?.length).map((g) => (
            <div key={g.key} className="tgroup">
              <div className="tgroup-h">
                <Icon name={g.icon} size={26} fill={g.fill} />
                <b>{g.title}</b>
                <span>{g.sub}</span>
              </div>
              <div className={'tlist' + (g.key === 'signature' ? ' sig' : '')}>
                {groups[g.key]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((t) => {
                    const id = t.meta?.voice ?? t.meta?.ref?.match(/custom\/([^/]+)\//)?.[1] ?? (g.key ? t.name : undefined);
                    return (
                      <div key={t.name} className="take">
                        <div className="take-h">
                          <b>{voiceName(id) ?? t.name}</b>
                          {t.meta?.duration !== undefined && <span className="tchip">{t.meta.duration.toFixed(1)} s</span>}
                          {t.meta?.lufs !== undefined && <span className="tchip">{t.meta.lufs} LUFS</span>}
                        </div>
                        {t.face ? <TalkingTake src={t.url} track={t.face} pack={packId} /> : <audio controls preload="none" src={t.url} />}
                        <span className="mono take-f">
                          {g.key ? `${g.key}/` : ''}
                          {t.name}.wav{t.meta?.seed !== undefined ? ` · seed ${t.meta.seed}` : ''}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

const CARD = ['var(--mp-role-card-a)', 'var(--mp-role-card-b)', 'var(--mp-role-card-c)'];
const FACE = ['grin', 'money-eyes', 'smile', 'serious', 'curious', 'wink'];

export function VoicesPage({ packId }: { packId?: string }) {
  return (
    <div>
      <style>{css}</style>
      <header className="page-h">
        <div className="grow">
          <h1>
            Voices <span className="it" style={{ color: 'var(--mp-role-primary)', fontSize: 54 }}>of Mr. Pop</span>
          </h1>
          <p>
            One signature voice: male, bright on the big moments, steady on the numbers. Performed by Chatterbox (MIT) from an original
            Kokoro timbre (Apache-2.0, no real person cloned). Registry: <span className="mono">voices/custom/voices.json</span>.
          </p>
        </div>
      </header>
      <div className="card line">
        <b>Sample line</b> “{registry.sample}”
      </div>
      <div className="voices">
        {registry.voices.map((v, i) => (
          <div key={v.id} className="voice card">
            <div className="v-top" style={{ background: CARD[i % 3] }}>
              <Character pack={packId} expression={FACE[i % FACE.length]} crop="head" height={96} />
              <div>
                <div className="v-name">
                  {v.name} {v.id === registry.default && <span className="pill def">default</span>}
                </div>
                <div className="v-role">{v.role}</div>
              </div>
            </div>
            <div className="v-body">
              <div className="v-vibe">{v.vibe}</div>
              {sampleFor(v.id) ? <audio controls preload="none" src={sampleFor(v.id)} /> : <em>no sample yet — run the build</em>}
              <div className="mono v-meta">
                {'blend' in v && v.blend
                  ? Object.entries(v.blend)
                      .map(([k, w]) => `${k} ${Math.round(Number(w) * 100)}%`)
                      .join(' + ') + ` · speed ${v.speed} · `
                  : 'chatterbox reference (liven.py) · '}
                id <b>{v.id}</b>
              </div>
            </div>
          </div>
        ))}
      </div>
      <StoryTakes packId={packId} />
      <div className="card how">
        <b>Signature Mr. Pop voiceover (use this for Reels)</b>
        <pre className="mono">{`packages/pipeline/.venv-chatterbox/bin/python packages/pipeline/voice/expressive.py voice/voiceover.vo.txt voice/signature/mr-pop.wav --takes 3`}</pre>
        <span>
          Chatterbox performs the <b>{registry.signature.voice}</b> voice with real intonation. Tags{' '}
          <span className="mono">{'{hook} {curious} {fun} {trust} {wow} {cta}'}</span> set the emotion and Mr. Pop's face. Each line is
          generated <span className="mono">--takes</span> times and the most expressive clean take is kept. Writes{' '}
          <span className="mono">.face.json</span> (lip sync + expressions) that plays above. <span className="mono">--more 0.15</span> = more
          animated.
        </span>
        <b style={{ marginTop: 8 }}>Rebuild Mr. Pop's timbre (only if you change his blend)</b>
        <pre className="mono">{`packages/pipeline/.venv/bin/python packages/pipeline/voice/kokoro_blend.py build mr-pop
packages/pipeline/.venv/bin/python packages/pipeline/voice/perform.py voices/custom/mr-pop/reference.vo.txt voices/custom/mr-pop/reference.wav --voice mr-pop`}</pre>
      </div>
    </div>
  );
}

const css = `
.line{font:600 21px/1.45 var(--mp-font-sans);letter-spacing:-.2px}
.line b{display:block;font:800 12px/1 var(--mp-font-sans);letter-spacing:2px;text-transform:uppercase;color:var(--mp-role-muted);margin-bottom:8px}
.voices{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin-top:16px}
.voice{padding:0;overflow:hidden}
.v-top{display:flex;gap:14px;align-items:center;padding:14px 18px 0}
.v-top svg{flex:none}
.v-name{font:900 28px/1.1 var(--mp-font-sans);letter-spacing:-.6px;display:flex;gap:8px;align-items:center}
.v-role{font-size:15px;color:var(--mp-role-muted);margin-top:4px;padding-bottom:12px}
.def{background:var(--mp-role-highlight);font-size:10px;padding:4px 8px}
.v-body{padding:14px 18px 18px;display:grid;gap:10px}
.v-vibe{font-weight:700;font-size:18px;line-height:1.35}
.v-body audio{width:100%}
.v-meta{color:var(--mp-role-muted);font-size:12.5px;line-height:1.5}
.takes{margin-top:36px}
.takes-h{font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:var(--mp-role-muted);margin-bottom:14px;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
.takes-h small{font-weight:600;letter-spacing:0;text-transform:none;font-size:14px;color:var(--mp-role-faint)}
.story{display:grid;gap:22px;margin-bottom:16px}
.story-h{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.story-h b{font:900 28px/1.1 var(--mp-font-sans);letter-spacing:-.8px;text-transform:capitalize}
.story-h .mono{color:var(--mp-role-faint)}
.tgroup{display:grid;gap:12px}
.tgroup-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.tgroup-h b{font:800 20px/1 var(--mp-font-sans);letter-spacing:-.4px}
.tgroup-h span{font-size:15px;color:var(--mp-role-muted)}
.tlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.take{display:grid;gap:10px;padding:14px 16px;border-radius:18px;background:var(--mp-role-page);border:2px solid color-mix(in srgb,var(--mp-role-ink) 8%,transparent)}
.take-h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.take-h b{font:800 18px/1.1 var(--mp-font-sans);margin-right:auto}
.tchip{font:800 12px/1 var(--mp-font-sans);padding:5px 9px;border-radius:999px;background:var(--mp-role-surface);border:2px solid var(--mp-role-ink)}
.take audio{width:100%}
.tlist.sig{grid-template-columns:minmax(0,560px)}
.talk{display:grid;gap:12px}
.talk-stage{position:relative;display:flex;justify-content:center;align-items:flex-end;height:480px;border-radius:22px;overflow:hidden;border:3px solid var(--mp-role-ink)}
.talk-tags{position:absolute;top:12px;left:12px;display:flex;gap:6px;flex-wrap:wrap;z-index:1}
.talk-chip{display:inline-flex;align-items:center;gap:5px;font:800 12px/1 var(--mp-font-sans);padding:6px 10px;border-radius:999px;background:var(--mp-role-surface);border:2px solid var(--mp-role-ink);box-shadow:2px 2px 0 var(--mp-role-ink)}
.take-f{color:var(--mp-role-muted)}
.how{margin-top:16px;display:grid;gap:10px;font-size:16px;line-height:1.5}
.how pre{font-size:13px}
.how pre{white-space:pre-wrap;background:var(--mp-role-page);padding:10px 12px;border-radius:12px}
`;
