#!/usr/bin/env node
// Fill a reel template: RIG ← rig.svg, DATAJSON ← beats + mouth track + character manifest, ICONSJSON ← packages/ui/icons.
//   node packages/pipeline/render/assemble.mjs <storyDir> <packDir> [stem]
// stem = template name in build/ (default "reel" → build/reel.tpl.html → build/reel.html).
// "reel-v3" uses voice/v3/ when it exists, else voice/.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { transformSync } from 'esbuild';
const [, , story, pack, stem = 'reel'] = process.argv;
const b = join(story, 'build');
const ver = stem.startsWith('reel-') ? stem.slice(5) : '';
const vdir = ver && existsSync(join(story, 'voice', ver, 'voiceover.beats.json')) ? join(story, 'voice', ver) : join(story, 'voice');
const beats = JSON.parse(readFileSync(join(vdir, 'voiceover.beats.json'), 'utf8'));
const m = JSON.parse(readFileSync(join(pack, 'manifest.json'), 'utf8'));
// mouth track: prefer the voice engine's face.json (cues from the real audio + text), else the loudness fallback
const facePath = join(vdir, 'voiceover.face.json');
const face = existsSync(facePath) ? JSON.parse(readFileSync(facePath, 'utf8')) : null;
const cuesToFrames = (cues, fps, dur) => { const n = Math.ceil(dur * fps), f = Array(n).fill('X'); for (const c of cues) for (let i = Math.floor(c.start * fps); i < Math.min(n, Math.ceil(c.end * fps)); i++) f[i] = c.value; return f.join(''); };
const visemes = face ? { fps: 30, frames: cuesToFrames(face.visemes, 30, face.duration), energy: face.energy, source: 'face.json' } : JSON.parse(readFileSync(join(b, 'visemes.json'), 'utf8'));
const data = { duration: beats.duration, beats: beats.beats, visemes,
  manifest: { poses: m.poses, expressions: m.expressions, defaults: m.defaults || {} } };
const iconDir = 'packages/ui/icons';
const icons = Object.fromEntries(readdirSync(iconDir).filter((f) => f.endsWith('.svg')).map((f) => [f.slice(0, -4), readFileSync(join(iconDir, f), 'utf8').trim()]));
// body motion engine (packages/character/src/motion.ts) — the same code the studio + Canvas run
const motion = transformSync(readFileSync('packages/character/src/motion.ts', 'utf8'), { loader: 'ts', format: 'esm' }).code.replace(/^export /gm, '');
const motionJs = `<script>${motion};window.bodyMotion=bodyMotion;window.motionTransforms=motionTransforms;window.energyAt=energyAt;` +
  `window.MP_HIP=${JSON.stringify(m.hip || [300, 880])};window.MP_FEET=${m.feet || 1346};window.MP_WAIST=${JSON.stringify(m.waist || null)};</script>`;
const html = readFileSync(join(b, `${stem}.tpl.html`), 'utf8').replace('<head>', () => `<head>${motionJs}`).replace('RIG', () => readFileSync(join(b, 'rig.svg'), 'utf8')).replace('DATAJSON', () => JSON.stringify(data)).replace('ICONSJSON', () => JSON.stringify(icons));
writeFileSync(join(b, `${stem}.html`), html);
console.log(`${stem}.html`, Math.round(html.length / 1024) + 'KB', 'voice', vdir, 'duration', beats.duration);
