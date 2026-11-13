#!/usr/bin/env node
// Bundle a pack into ONE animatable SVG: every slot variant is a <g id="<slot>-<variant>"> (hidden except defaults),
// head layers sit in <g id="head"> so they can nod around headPivot. Used by HTML/Remotion reel templates.
//   node packages/character/scripts/rig.mjs <packDir> <out.svg> [--no-badge]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const [, , packDir, out, ...flags] = process.argv;
const m = JSON.parse(readFileSync(join(packDir, 'manifest.json'), 'utf8'));
const inner = (rel) => readFileSync(join(packDir, rel), 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const def = { ...(m.defaults || {}), ...Object.fromEntries(Object.entries(Object.values(m.expressions)[0]).filter(([k]) => k !== 'use_for')), arms: Object.values(m.poses)[0].arms };
let lower = '', arms = '', body = '', head = '';
for (const l of m.layers) {
  if (l.id === 'badge' && flags.includes('--no-badge')) continue;
  let g;
  if (l.file) g = `<g data-layer="${l.id}">${inner(l.file)}</g>`;
  else {
    const slot = l.slot || l.id;
    const vs = readdirSync(join(packDir, l.dir)).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4));
    g = `<g data-layer="${l.id}">` + vs.map((v) => `<g id="${slot}-${v}" style="display:${v === def[slot] ? 'inline' : 'none'}">${inner(`${l.dir}/${v}.svg`)}</g>`).join('') + `</g>`;
  }
  if (l.head) head += g; else if (l.lower ?? l.id === 'legs') lower += g; else if ((l.slot || l.id) === 'arms') arms += g; else body += g;
}
// eyes parts may each define the same clip ids; make every id unique
let n = 0; const seen = new Map();
// root (hops) › legs (knees) + upper (body + head) — templates move them with bodyMotion() (packages/character/src/motion.ts)
let svg = `<g id="root"><g id="legs">${lower}</g><g id="upper">` + body + `<g id="armsrig">${arms}</g>` + `<g id="head" style="transform-box:view-box;transform-origin:${m.headPivot[0]}px ${m.headPivot[1]}px">${head}</g></g></g>`;
svg = svg.replace(/<(clipPath) id="([^"]+)"/g, (s, tag, id) => { const nid = `${id}-c${n++}`; seen.set(nid, id); return `<${tag} id="${nid}"`; });
// rewrite url(#id) to the nearest preceding definition of that id
let lastDef = {};
svg = svg.replace(/id="([^"]+-c\d+)"|url\(#([^)]+)\)/g, (s, defId, ref) => {
  if (defId) { lastDef[seen.get(defId)] = defId; return s; }
  return lastDef[ref] ? `url(#${lastDef[ref]})` : s;
});
const [x, y, w, h] = m.viewBox;
writeFileSync(out, `<svg id="rig" xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" style="overflow:visible">${svg}</svg>\n`);
console.log('rig →', out, Math.round(svg.length / 1024) + 'KB', 'defaults', def);
