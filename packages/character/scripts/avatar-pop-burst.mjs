#!/usr/bin/env node
// The signature profile picture "Pop Burst" (same art as studio → Brand → Avatar Studio) as a standalone 1080×1080 SVG,
// built from a character pack's parts — for reel end cards ("Follow" card) and anywhere the avatar must match Instagram.
//   node packages/character/scripts/avatar-pop-burst.mjs <packDir> <out.svg>
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [, , packDir, out] = process.argv;
const m = JSON.parse(readFileSync(join(packDir, 'manifest.json'), 'utf8'));
const inner = (rel) => readFileSync(join(packDir, rel), 'utf8').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const INK = '#1B1838';

// Mr. Pop — expression "cheeky", head tilt −5°, crop "avatar", at translate(20 105) width 1040 (AvatarStudio host())
const slots = { ...(m.defaults || {}), ...m.poses.idle, ...m.expressions.cheeky };
let body = '', head = '';
for (const l of m.layers) {
  const file = l.file ?? `${l.dir}/${slots[l.slot ?? l.id]}.svg`;
  let g;
  try { g = `<g data-layer="${l.id}">${inner(file)}</g>`; } catch { continue; }
  if (l.head) head += g; else body += g;
}
const [px, py] = m.headPivot;
const [cx, cy, cw, ch] = m.crops.avatar;
let host = `<svg x="20" y="105" width="1040" height="1040" viewBox="${cx} ${cy} ${cw} ${ch}" overflow="visible">${body}<g transform="rotate(-5 ${px} ${py})">${head}</g></svg>`;
host = host.replace(/\sid="([^"]+)"/g, ' id="av-$1"').replace(/url\(#([^)]+)\)/g, 'url(#av-$1)');

const rays = [...Array(20)].map((_, i) => {
  const a0 = (i / 20) * Math.PI * 2, a1 = ((i + 1) / 20) * Math.PI * 2, r = 900;
  return `<path d="M540 560 L${540 + Math.cos(a0) * r} ${560 + Math.sin(a0) * r} L${540 + Math.cos(a1) * r} ${560 + Math.sin(a1) * r} Z" fill="${i % 2 ? '#6A42EC' : '#8466F5'}"/>`;
}).join('');
const badge = (x, y, s) => {
  const pts = [...Array(16)].map((_, i) => { const r = i % 2 ? s * 0.36 : s * 0.5, a = (i / 16) * Math.PI * 2 - Math.PI / 2; return `${x + Math.cos(a) * r},${y + Math.sin(a) * r}`; }).join(' ');
  return `<polygon points="${pts}" fill="${INK}" transform="translate(8 8)"/><polygon points="${pts}" fill="#C6F03A" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>` +
    `<text x="${x}" y="${y + s * 0.15}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="${s * 0.42}" fill="${INK}">P!</text>`;
};
const sparkle = readFileSync('packages/ui/icons/sparkle.svg', 'utf8').replace('<svg ', '<svg width="120" height="120" ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">` +
  `<rect width="1080" height="1080" fill="#C6F03A"/>${rays}<circle cx="540" cy="560" r="330" fill="#C6F03A" stroke="${INK}" stroke-width="12"/>` +
  host + badge(860, 250, 190) + `<g transform="translate(150 170) rotate(-12 60 60)">${sparkle}</g></svg>\n`;
writeFileSync(out, svg);
console.log('avatar →', out, Math.round(svg.length / 1024) + 'KB');
