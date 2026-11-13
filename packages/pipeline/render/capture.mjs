#!/usr/bin/env node
// Render window.render(t) frame by frame with the installed Google Chrome (no browser download).
//   node packages/pipeline/render/capture.mjs <page.html> <framesDir> <seconds> [fps] [--only t1,t2]
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const [, , page, dir, secs, fpsArg, flag, only] = process.argv;
const fps = Number(fpsArg || 30);
const ts = flag === '--only' ? only.split(',').map(Number) : [...Array(Math.ceil(fps * Number(secs))).keys()].map((i) => i / fps);
if (flag !== '--only') rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + resolve(page));
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(500);
const t0 = Date.now();
for (let k = 0; k < ts.length; k++) {
  await p.evaluate((t) => window.render(t), ts[k]);
  const name = flag === '--only' ? `check_${ts[k].toFixed(2)}.png` : `f${String(k).padStart(5, '0')}.jpg`;
  await p.screenshot({ path: `${dir}/${name}`, ...(flag === '--only' ? { type: 'png' } : { type: 'jpeg', quality: 92 }) });
  if (k % 150 === 0) console.log(`frame ${k}/${ts.length} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await b.close();
console.log(`✓ ${ts.length} frames → ${dir}`);
