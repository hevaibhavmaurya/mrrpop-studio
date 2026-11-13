#!/usr/bin/env node
// Compose a pack into a static HTML character sheet (poses + expressions + mouths) for review.
//   node packages/character/scripts/sheet.mjs <packDir> <out.html>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [, , packDir, out] = process.argv;
const m = JSON.parse(readFileSync(join(packDir, 'manifest.json'), 'utf8'));
const inner = (rel) => { const p = join(packDir, rel); return existsSync(p) ? readFileSync(p, 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') : ''; };
let uid = 0;
function compose(pose, expr, crop = 'full', over = {}) {
  const strip = ({ use_for, ...r }) => r;
  const s = { ...(m.defaults || {}), ...strip(m.poses[pose]), ...strip(m.expressions[expr]), ...over };
  const id = 'u' + uid++;
  let body = '', head = '';
  for (const l of m.layers) {
    const g = `<g>${l.file ? inner(l.file) : inner(`${l.dir}/${s[l.slot || l.id]}.svg`)}</g>`;
    if (l.head) head += g; else body += g;
  }
  const html = (body + head).replace(/\sid="([^"]+)"/g, ` id="$1-${id}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${id})`);
  const [x, y, w, h] = m.crops[crop];
  return `<svg viewBox="${x} ${y} ${w} ${h}" style="overflow:hidden">${html}</svg>`;
}
const tile = (svg, label, cls) => `<figure class="${cls}">${svg}<figcaption>${label}</figcaption></figure>`;
const poses = Object.keys(m.poses).map((p) => tile(compose(p, 'grin'), p, 'pose')).join('');
const exprs = Object.keys(m.expressions).map((e) => tile(compose('idle', e, 'head'), e, 'head')).join('');
const mouths = Object.keys(m.visemes.map).map((v) => tile(compose('idle', 'smile', 'head', { mouth: v }), v, 'mouth')).join('');
writeFileSync(out, `<!doctype html><meta charset=utf-8><title>${m.name} sheet</title><style>
body{margin:0;padding:24px;background:#FAF9FF;font:600 14px Inter,system-ui,sans-serif;color:#1B1838}
h2{margin:28px 0 10px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#6E6A8E}
.row{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;background:#fff;border-radius:18px;box-shadow:0 10px 30px -18px rgba(27,24,56,.4);padding:10px;text-align:center}
.pose svg{height:560px}.head svg{height:240px}.mouth svg{height:150px}.hero svg{height:1100px}</style>
<h1>${m.name} — ${m.id}</h1><div class=row>${tile(compose('pointing', 'grin'), 'hero', 'hero')}</div>
<h2>Poses</h2><div class=row>${poses}</div><h2>Expressions</h2><div class=row>${exprs}</div><h2>Mouths</h2><div class=row>${mouths}</div>`);
console.log('sheet →', out);
