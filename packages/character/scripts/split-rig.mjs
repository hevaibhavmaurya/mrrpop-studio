#!/usr/bin/env node
// Split a single-file rig (e.g. mr-pop-v2/rig/rig-v5.svg) into a character pack:
//   <out>/parts/<layer>.svg  and  <out>/parts/<layer>/<variant>.svg
// Every part keeps the rig's full viewBox, so parts stack 1:1 and any part can be
// redrawn on its own (same filename, same viewBox) without touching the others.
//
//   node packages/character/scripts/split-rig.mjs <rig.svg> <outDir>
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const [, , rigPath, outDir] = process.argv;
if (!rigPath || !outDir) {
  console.error('usage: split-rig.mjs <rig.svg> <outDir>');
  process.exit(1);
}

let svg = readFileSync(rigPath, 'utf8').replace(/<metadata>[\s\S]*?<\/metadata>/g, '');
const VIEWBOX = svg.match(/viewBox="([^"]+)"/)[1];

/** [start, end) of the element that opens with `<g id="id"` (balanced <g> scan). */
function span(id, from = 0) {
  const open = `<g id="${id}"`;
  const start = svg.indexOf(open, from);
  if (start < 0) throw new Error(`missing #${id}`);
  const re = /<g[\s>]|<\/g>/g;
  re.lastIndex = start;
  let depth = 0;
  for (let m; (m = re.exec(svg)); ) {
    depth += m[0] === '</g>' ? -1 : 1;
    if (depth === 0) return [start, re.lastIndex];
  }
  throw new Error(`unbalanced #${id}`);
}
const inner = ([s, e]) => svg.slice(s, e).replace(/^<g[^>]*>/, '').replace(/<\/g>$/, '');
const between = (a, b) => svg.slice(a, b).trim();
const children = (prefix, groupSpan) => {
  const out = {};
  const re = new RegExp(`<g id="${prefix}-([\\w-]+)"`, 'g');
  re.lastIndex = groupSpan[0];
  for (let m; (m = re.exec(svg)) && m.index < groupSpan[1]; ) out[m[1]] = inner(span(`${prefix}-${m[1]}`, m.index));
  return out;
};
const listGroups = (prefix) => {
  const out = {};
  for (const m of svg.matchAll(new RegExp(`<g id="${prefix}-([\\w-]+)"`, 'g'))) out[m[1]] = inner(span(`${prefix}-${m[1]}`, m.index));
  return out;
};

const svgOpenEnd = svg.indexOf('>', svg.indexOf('<svg')) + 1;
const armsBack = listGroups('armsb');
const armsFront = listGroups('armsf');
const firstArmsB = span('armsb-idle')[0];
const lastArmsB = span('armsb-explain')[1];
const badge = span('badge');
const firstArmsF = span('armsf-idle')[0];
const head = span('head');
const mouth = span('mouth');
const eyes = span('eyes');
const glasses = span('glasses');
const brows = span('brows');
const hair = span('hair');
const extras = span('extras');

const headInnerStart = svg.indexOf('>', head[0]) + 1;
const moustacheStart = mouth[1];
const parts = {
  legs: between(svgOpenEnd, firstArmsB),
  torso: between(lastArmsB, badge[0]) + '\n' + between(badge[1], firstArmsF),
  badge: inner(badge),
  'head-base': between(headInnerStart, mouth[0]),
  moustache: between(moustacheStart, eyes[0]),
  glasses: between(glasses[0], brows[0]),
  hair: inner(hair),
};
const variants = {
  'arms-back': armsBack,
  'arms-front': armsFront,
  mouth: children('mouth', mouth),
  eyes: children('eyes', eyes),
  brows: children('brows', brows),
};
// Derived variant: wink (left eye closed arc, right eye open dot + shine).
{
  const closedLeft = variants.eyes.closed.match(/<path[^>]*\/>/)[0];
  const openRight = variants.eyes.open.match(/<circle cx="352"[^>]*\/>|<circle cx="356"[^>]*\/>/g).join('');
  variants.eyes.wink = closedLeft + openRight;
}
if (svg.slice(extras[0], extras[1]).replace(/<\/?g[^>]*>/g, '').trim()) parts.extras = inner(extras);

const wrap = (body, name) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" data-part="${name}">\n${body.trim()}\n</svg>\n`;

const partsDir = join(outDir, 'parts');
rmSync(partsDir, { recursive: true, force: true });
mkdirSync(partsDir, { recursive: true });
let n = 0;
for (const [name, body] of Object.entries(parts)) {
  writeFileSync(join(partsDir, `${name}.svg`), wrap(body, name));
  n++;
}
for (const [layer, vs] of Object.entries(variants)) {
  mkdirSync(join(partsDir, layer), { recursive: true });
  for (const [v, body] of Object.entries(vs)) {
    writeFileSync(join(partsDir, layer, `${v}.svg`), wrap(body, `${layer}/${v}`));
    n++;
  }
}
console.log(`✅ ${n} parts → ${partsDir}`);
console.log(Object.fromEntries(Object.entries(variants).map(([k, v]) => [k, Object.keys(v)])));
