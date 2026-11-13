#!/usr/bin/env node
// Layout test for a reel page: every frame, measure
//   • caption ↔ content gap (content = stickers, cards, stamps, chips … that are visible)
//   • content ↔ Mr. Pop gap (his head incl. hair and the arms reaching into the frame)
//   • character inside the 1080 px frame
//   node packages/pipeline/render/layout-test.mjs <page.html> <seconds> [minGapPx=40]
import { chromium } from 'playwright-core';
import { resolve } from 'node:path';
const [, , page, secs, minGapArg] = process.argv;
const MIN = Number(minGapArg || 40);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + resolve(page));
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);
const r = await p.evaluate(({ secs, MIN }) => {
  const SEL = '.sticker,.ev,.card,.win,.stamp,.tile,.msg,.rubber,#scenes .chipui';
  const vis = (e) => { let n = e; while (n && n !== document.body) { const cs = getComputedStyle(n); if (cs.display === 'none' || +cs.opacity < 0.6) return false; n = n.parentElement; } return true; };
  const ov = (a, c) => Math.min(a.right, c.right) - Math.max(a.left, c.left) > 0;
  const issues = [], worst = { capGap: 1e9, charGap: 1e9 };
  for (let k = 0; k < secs * 30; k += 2) {
    const t = k / 30;
    window.render(t);
    const els = [...document.querySelectorAll(SEL)].filter((e) => !e.closest('.sticker,.card,.win,.msg') || e.matches('.sticker,.card,.win,.msg')).filter(vis);
    const words = [...document.querySelectorAll('#hl .w')].map((w) => w.getBoundingClientRect());
    const cap = words.length ? { left: Math.min(...words.map((w) => w.left)), right: Math.max(...words.map((w) => w.right)), bottom: Math.max(...words.map((w) => w.bottom)) } : null;
    const head = document.getElementById('head').getBoundingClientRect();
    const root = (document.getElementById('root') || document.getElementById('rig')).getBoundingClientRect();
    if (root.left < 0 || root.right > 1080) issues.push(`${t.toFixed(2)}s character off-frame ${Math.round(root.left)}–${Math.round(root.right)}`);
    for (const e of els) {
      const c = e.getBoundingClientRect();
      if (c.bottom < 240 || c.top > 1500) continue;
      const name = e.id || e.className.split(' ')[0];
      if (cap && ov(cap, c) && c.top >= cap.bottom - 200) { const g = c.top - cap.bottom; worst.capGap = Math.min(worst.capGap, g); if (g < MIN) issues.push(`${t.toFixed(2)}s caption ↔ ${name}: ${Math.round(g)} px`); }
      if (ov(head, c) && c.bottom <= head.bottom) { const g = head.top - c.bottom; worst.charGap = Math.min(worst.charGap, g); if (g < MIN) issues.push(`${t.toFixed(2)}s ${name} ↔ Mr. Pop's head: ${Math.round(g)} px`); }
    }
  }
  return { worst: { capGap: Math.round(worst.capGap), charGap: Math.round(worst.charGap) }, issues: [...new Set(issues.map((x) => x.replace(/^[\d.]+s /, '')))].slice(0, 20), count: issues.length };
}, { secs: Number(secs), MIN });
console.log(JSON.stringify(r, null, 1));
await b.close();
process.exit(r.count ? 1 : 0);
