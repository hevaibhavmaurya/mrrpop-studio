#!/usr/bin/env node
// Instagram safe-zone check for an assembled reel page. Renders each beat (just after its words appear) and lists every
// visible piece of text outside the text-safe box. Exit code 1 if anything is outside.
//   node packages/pipeline/render/safezone.mjs <page.html>
// Box: CLAUDE.md (top 250, sides 80) + /ig-reel (nothing below y 1440, right 230 px = action rail) → x 80–850, y 250–1440.
// Backgrounds, decoration and Mr. Pop may use the full frame — only text is checked.
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';

const SAFE = { left: 80, right: 850, top: 250, bottom: 1440 };
const [, , page] = process.argv;
if (!page) { console.error('usage: safezone.mjs <page.html>'); process.exit(2); }
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + resolve(page));
await p.evaluate(() => document.fonts.ready);
const times = await p.evaluate(() => DATA.beats.flatMap((x) => [x.start + 0.6, (x.start + x.end) / 2 + 0.5, x.end + 0.1]));
const issues = new Map();
for (const t of times) {
  const found = await p.evaluate(([t, SAFE]) => {
    window.render(t);
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('#char') || el.closest('#px')) continue;
      const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
      if (!txt) continue;
      let v = el, op = 1;
      while (v && v !== document.body) { const cs = getComputedStyle(v); if (cs.display === 'none' || cs.visibility === 'hidden') { op = 0; break; } op *= Number(cs.opacity); v = v.parentElement; }
      if (op < 0.5) continue;
      const q = el.getBoundingClientRect();
      if (!q.width || q.bottom < 0 || q.top > 1920) continue;
      const bad = [];
      if (q.top < SAFE.top) bad.push('top');
      if (q.bottom > SAFE.bottom) bad.push('bottom');
      if (q.left < SAFE.left) bad.push('left');
      if (q.right > SAFE.right) bad.push('right rail');
      if (bad.length) out.push([`${bad.join('+')}: "${txt.slice(0, 40)}"`, `${Math.round(q.left)},${Math.round(q.top)}→${Math.round(q.right)},${Math.round(q.bottom)}`]);
    }
    return out;
  }, [t, SAFE]);
  for (const [k, box] of found) if (!issues.has(k)) issues.set(k, `${box} @${t.toFixed(1)}s`);
}
await b.close();
for (const [k, v] of issues) console.log('✗', k, ' ', v);
console.log(issues.size ? `${issues.size} text element(s) outside the safe box (x ${SAFE.left}–${SAFE.right}, y ${SAFE.top}–${SAFE.bottom})` : `✓ all text inside the safe box (x ${SAFE.left}–${SAFE.right}, y ${SAFE.top}–${SAFE.bottom})`);
process.exit(issues.size ? 1 : 0);
