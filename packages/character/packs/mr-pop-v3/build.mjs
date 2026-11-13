#!/usr/bin/env node
// Mr. Pop v3 — generator for every SVG part of the pack (based on reference/concept-sheet.webp).
//   node packages/character/packs/mr-pop-v3/build.mjs
// Edit colours, joints, hands or faces here, re-run, and the studio hot-reloads.
// Hand-tweaked parts: copy the generated file and remove it from this script's output list.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const VB = '0 0 600 1380';

// ---------- palette (character-owned; the UI theme never recolours the host) ----------
const C = {
  ink: '#1B1838',
  skin: '#D99A66', skinSh: '#BC7C4E', skinHi: '#EDB688', blush: '#EE8A72',
  hair: '#1F1726', hairMid: '#33264A', hairHi: '#7A58F0',
  beard: '#241B28', beardHi: '#3A2D44',
  navy: '#20244A', navySh: '#161936', navyHi: '#323A72',
  violet: '#6A42EC', violetSh: '#5130C9', violetHi: '#8A6CF6',
  lime: '#C6F03A', limeSh: '#97C31A',
  denim: '#262B56', denimSh: '#1A1E42', denimHi: '#363D72',
  white: '#FFFFFF', sole: '#E8E5F3',
  mouth: '#4A1726', tongue: '#F07A86', iris: '#2B1A14',
  yellow: '#FFD43B', blue: '#5DB8FF', red: '#F0475A', shades: '#14122A',
};
const O = 5; // outline half-width
const f = (n) => Math.round(n * 10) / 10;

// ---------- primitives ----------
const path = (d, fill, stroke = C.ink, sw = O * 2 - 4, extra = '') =>
  `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`;
const line = (d, color, w, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const poly = (pts) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L');
/** outlined capsule chain: ink pass then fill pass */
const tube = (pts, w, fill) => line(poly(pts), C.ink, w + O * 2) + line(poly(pts), fill, w);
const circ = (cx, cy, r, fill, sw = 4, stroke = C.ink) =>
  `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const ell = (cx, cy, rx, ry, fill, sw = 4, stroke = C.ink, extra = '') =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${rx}" ry="${ry}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${extra}/>`;

// ---------- hands (local frame: wrist at 0,0; +y away from wrist; thumb on -x) ----------
const fin = (x1, y1, x2, y2, w = 12) => tube([[x1, y1], [x2, y2]], w, C.skin);
const knuckles = line('M-12 46 Q-8 50 -4 46 M-2 47 Q2 51 6 47 M8 46 Q12 50 15 45', C.skinSh, 3);
const HANDS = {
  relaxed: () =>
    fin(-16, 16, -26, 36, 13) +
    ell(0, 27, 20, 24, C.skin, O * 2 - 3) +
    fin(-12, 40, -13, 60, 11) + fin(-3, 44, -4, 66, 11) + fin(6, 44, 6, 65, 11) + fin(14, 40, 14, 57, 10),
  open: () => {
    let s = fin(-14, 20, -40, 34, 13);
    s += circ(0, 26, 22, C.skin, O * 2 - 3);
    [[-26, 50], [-9, 60], [8, 58], [25, 48]].forEach(([a, len]) => {
      const r = (a * Math.PI) / 180;
      s += fin(Math.sin(r) * 12, 26 + Math.cos(r) * 12, Math.sin(r) * len, 26 + Math.cos(r) * len, 12);
    });
    return s + line('M-8 24 Q0 32 9 24', C.skinSh, 3);
  },
  fist: () => circ(0, 28, 24, C.skin, O * 2 - 3) + knuckles + fin(-17, 20, 2, 33, 12),
  point: () => fin(7, 34, 8, 92, 12) + circ(0, 28, 24, C.skin, O * 2 - 3) + knuckles + fin(-17, 20, 2, 33, 12),
  thumb: () => circ(0, 28, 24, C.skin, O * 2 - 3) + knuckles + fin(-10, 20, -52, 16, 16),
};

// ---------- arms ----------
function arm({ s, e, w, hand = 'relaxed', rot, flip, sleeve = C.navy }) {
  const [dx, dy] = [w[0] - e[0], w[1] - e[1]];
  const len = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const cuffStart = [w[0] - (dx / len) * 12, w[1] - (dy / len) * 12];
  // upper arm slightly thicker than forearm; elbow is the shared joint
  let out = line(poly([s, e]), C.ink, 58 + O * 2) + line(poly([e, w]), C.ink, 52 + O * 2);
  out += line(poly([s, e]), sleeve, 58) + line(poly([e, w]), sleeve, 52);
  // sleeve highlight + elbow crease
  const nx = -dy / len, ny = dx / len;
  out += line(poly([[s[0] + nx * 14, s[1] + ny * 14], [e[0] + nx * 14, e[1] + ny * 14]]), C.navyHi, 8, ' opacity=".7"');
  out += line(`M${f(e[0] - nx * 18)} ${f(e[1] - ny * 18)} Q${f(e[0])} ${f(e[1])} ${f(e[0] + nx * 10)} ${f(e[1] + ny * 10)}`, C.navySh, 4);
  // hoodie cuff peeking out of the jacket sleeve
  out += tube([cuffStart, w], 44, C.violet);
  const r = rot ?? ang - 90;
  out += `<g transform="translate(${f(w[0])} ${f(w[1])}) rotate(${f(r)}) scale(${flip ? -1 : 1} 1) translate(0 4)">${HANDS[hand]()}</g>`;
  return out;
}
const SL = [198, 572], SR = [402, 572];
const L_IDLE = { s: SL, e: [178, 734], w: [182, 880], hand: 'relaxed', flip: true };
const R_IDLE = { s: SR, e: [422, 734], w: [418, 880], hand: 'relaxed' };
const ARMS = {
  idle: [L_IDLE, R_IDLE],
  point: [{ s: SL, e: [150, 722], w: [222, 828], hand: 'fist', flip: true }, { s: SR, e: [478, 492], w: [508, 352], hand: 'point' }],
  'point-side': [L_IDLE, { s: SR, e: [486, 616], w: [580, 584], hand: 'point' }],
  celebrate: [
    { s: SL, e: [128, 468], w: [156, 330], hand: 'fist', flip: true },
    { s: SR, e: [472, 468], w: [444, 330], hand: 'fist' },
  ],
  shrug: [
    { s: SL, e: [168, 732], w: [92, 696], hand: 'open', flip: true },
    { s: SR, e: [432, 732], w: [508, 696], hand: 'open' },
  ],
  thumb: [L_IDLE, { s: SR, e: [482, 728], w: [512, 606], hand: 'thumb', rot: 90 }],
  explain: [L_IDLE, { s: SR, e: [440, 736], w: [522, 662], hand: 'open' }],
  wave: [L_IDLE, { s: SR, e: [488, 560], w: [500, 414], hand: 'open' }],
  think: [
    { s: SL, e: [206, 760], w: [344, 744], hand: 'relaxed', flip: true },
    { s: SR, e: [436, 700], w: [336, 494], hand: 'fist', rot: 160 },
  ],  // reaction gestures (picked automatically from the expression — see bodyMotion().pose)
  belly: [
    { s: SL, e: [166, 716], w: [252, 806], hand: 'relaxed', flip: true, rot: -64 },
    { s: SR, e: [434, 716], w: [348, 806], hand: 'relaxed', rot: 64 },
  ],
  'laugh-point': [
    { s: SL, e: [166, 716], w: [252, 806], hand: 'relaxed', flip: true, rot: -64 },
    { s: SR, e: [486, 616], w: [580, 584], hand: 'point' },
  ],
  recoil: [
    { s: SL, e: [160, 708], w: [226, 604], hand: 'open', flip: true, rot: 168 },
    { s: SR, e: [440, 708], w: [374, 604], hand: 'open', rot: 192 },
  ],
  clap: [
    { s: SL, e: [170, 724], w: [278, 652], hand: 'open', flip: true, rot: 214 },
    { s: SR, e: [430, 724], w: [322, 652], hand: 'open', rot: 146 },
  ],
  hips: [
    { s: SL, e: [118, 706], w: [192, 846], hand: 'fist', flip: true },
    { s: SR, e: [482, 706], w: [408, 846], hand: 'fist' },
  ],
};

// ---------- legs + shoes ----------
function shoeR() {
  // right shoe, toe pointing right; left shoe is this mirrored
  return (
    path('M318 1296 C322 1280 350 1274 374 1278 C398 1282 414 1294 424 1310 C436 1316 438 1336 428 1346 L314 1346 C306 1330 308 1306 318 1296 Z', C.white) +
    path('M318 1296 C328 1290 340 1294 344 1306 L342 1330 L310 1330 C308 1316 312 1304 318 1296 Z', C.violet, null) +
    line('M318 1296 C328 1290 340 1294 344 1306 L342 1330', C.ink, 4) +
    path('M310 1330 L432 1330 C434 1338 432 1344 428 1348 L314 1348 C310 1342 309 1336 310 1330 Z', C.sole) +
    line('M352 1288 L372 1298 M358 1281 L378 1291', C.lime, 5) +
    circ(392, 1314, 9, C.lime, 4) +
    line('M388 1314 L392 1310 L396 1318', C.ink, 3)
  );
}
const legs = () => {
  let s = '';
  s += `<g transform="matrix(-1 0 0 1 600 0)">${shoeR()}</g>` + shoeR();
  s += path('M204 872 L396 872 L394 966 L300 990 L206 966 Z', C.denim);
  s += tube([[252, 920], [246, 1100], [242, 1282]], 84, C.denim);
  s += tube([[348, 920], [354, 1100], [358, 1282]], 84, C.denim);
  s += line('M262 960 L256 1270', C.denimHi, 8, ' opacity=".6"') + line('M338 960 L346 1270', C.denimSh, 8, ' opacity=".6"');
  s += line('M300 900 L300 984', C.denimSh, 4);
  s += line('M206 1240 L290 1244 M310 1244 L394 1240', C.denimSh, 4, ' opacity=".7"');
  return s;
};

// ---------- torso (hood, neck, hoodie, open jacket) ----------
const torso = () => {
  let s = '';
  // hood lying flat behind the shoulders — a low soft collar, no dome above the shoulder line
  s += path('M228 544 C232 508 262 484 300 484 C338 484 368 508 372 544 L374 572 L226 572 Z', C.violetSh); // hood behind
  s += line('M246 520 Q300 494 354 520', C.violet, 5, ' opacity=".8"'); // hood fold
  // neck: slim, slightly tapered into the collar; soft shadow under the chin only
  s += path('M268 400 L267 500 Q300 514 333 500 L332 400 Z', C.skin, C.ink, 6); // neck
  s += path('M268 416 Q300 458 332 416 L332 440 Q300 472 268 440 Z', C.skinSh, null, 0, ' opacity=".8"');
  s += path('M186 566 C198 532 240 514 300 514 C360 514 402 532 414 566 L424 924 L176 924 Z', C.violet); // hoodie
  s += path('M238 512 Q300 610 362 512 Q362 552 300 600 Q238 552 238 512 Z', C.violetSh); // neckline
  s += line('M246 520 Q300 596 354 520', C.violetHi, 6, ' opacity=".7"');
  s += line('M282 580 C280 616 284 646 280 690', C.ink, 12) + line('M282 580 C280 616 284 646 280 690', C.lime, 7);
  s += line('M318 580 C320 616 316 646 320 690', C.ink, 12) + line('M318 580 C320 616 316 646 320 690', C.lime, 7);
  s += `<rect x="273" y="686" width="14" height="22" rx="5" fill="${C.white}" stroke="${C.ink}" stroke-width="4"/><rect x="313" y="686" width="14" height="22" rx="5" fill="${C.white}" stroke="${C.ink}" stroke-width="4"/>`;
  s += path('M226 830 L374 830 L370 900 L230 900 Z', C.violetSh, null) + line('M226 830 L374 830', C.ink, 4); // pocket
  // jacket panels
  const left = 'M200 548 C216 530 238 520 252 516 L268 566 L248 928 L170 928 C164 820 158 664 174 592 C178 572 188 558 200 548 Z';
  s += path(left, C.navy) + `<path d="${left}" fill="${C.navy}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round" transform="matrix(-1 0 0 1 600 0)"/>`;
  s += path('M252 516 L268 566 L250 660 L222 604 L240 584 L228 560 Z', C.navyHi); // lapel L
  s += `<path d="M252 516 L268 566 L250 660 L222 604 L240 584 L228 560 Z" fill="${C.navyHi}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round" transform="matrix(-1 0 0 1 600 0)"/>`;
  s += line('M196 760 L238 760 M362 760 L404 760', C.navySh, 5); // pocket flaps
  s += line('M186 620 C182 700 184 800 190 900', C.navyHi, 8, ' opacity=".5"');
  s += line('M414 620 C418 700 416 800 410 900', C.navySh, 8, ' opacity=".7"');
  return s;
};

// ---------- signature Pop badge (replaces the old $ pin) ----------
const badge = () => {
  const cx = 368, cy = 652, pts = [];
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? 19 : 27, a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return (
    path(poly(pts) + ' Z', C.lime, C.ink, 4) +
    `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="22" fill="${C.ink}">P!</text>`
  );
};

// ---------- head ----------
// ~20-year-old: fuller cheeks, shorter lower face, soft jaw corners, small rounded chin (not a long oval)
const FACE = 'M198 236 C198 176 242 148 300 148 C358 148 402 176 402 236 L402 300 C402 338 396 362 382 382 C362 408 330 426 300 428 C270 426 238 408 218 382 C204 362 198 338 198 300 Z';
const headBase = () => {
  let s = `<defs><clipPath id="face"><path d="${FACE}"/></clipPath></defs>`;
  // ears
  s += ell(194, 304, 16, 25, C.skin, 6) + line('M190 293 Q199 304 192 317', C.skinSh, 4);
  s += ell(406, 304, 16, 25, C.skin, 6) + line('M410 293 Q401 304 408 317', C.skinSh, 4);
  // one white earbud (identity detail)
  s += `<path d="M418 300 C432 296 440 308 434 320 L430 346" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>` + ell(420, 304, 11, 9, C.white, 4);
  // face
  s += path(FACE, C.skin, C.ink, 6);
  s += `<g clip-path="url(#face)">`;
  s += path('M374 164 C418 232 416 340 366 440 L430 440 L430 150 Z', C.skinSh, null, 0, ' opacity=".45"'); // side shade
  s += path('M196 210 C240 196 360 196 404 210 L404 236 C360 222 240 222 196 236 Z', C.skinSh, null, 0, ' opacity=".45"'); // hair shadow
  // light stubble along the jaw + chin (a tone, not a full beard)
  s += path('M198 320 C204 352 224 376 250 390 C270 382 330 382 350 390 C376 376 396 352 402 320 L412 320 L412 440 L188 440 Z', C.beard, null, 0, ' opacity=".2"');
  s += `</g>`;
  s += path('M288 412 C293 407 307 407 312 412 C311 419 306 424 300 425 C294 424 289 419 288 412 Z', C.beard, null, 0, ' opacity=".45"'); // tiny chin patch
  s += line('M300 306 C294 324 292 336 299 341 C304 343 310 341 312 337', C.skinSh, 5); // nose
  s += ell(226, 340, 20, 10, C.blush, 0, null, ' opacity=".5"') + ell(374, 340, 20, 10, C.blush, 0, null, ' opacity=".5"');
  return s;
};
const moustache = () => // faint young-guy moustache shadow
  path('M272 372 C284 364 294 364 300 368 C306 364 316 364 328 372 C316 370 306 372 300 375 C294 372 284 370 272 372 Z', C.beard, null, 0, ' opacity=".4"');
const glasses = () =>
  circ(252, 286, 40, C.white, 0, null).replace('/>', ' opacity=".14"/>') +
  circ(348, 286, 40, C.white, 0, null).replace('/>', ' opacity=".14"/>') +
  `<g fill="none" stroke="${C.ink}" stroke-width="8"><circle cx="252" cy="286" r="40"/><circle cx="348" cy="286" r="40"/>` +
  `<path d="M292 282 Q300 274 308 282"/><path d="M212 280 L196 274"/><path d="M388 280 L404 274"/></g>` +
  line('M228 266 Q236 256 248 254', C.white, 5, ' opacity=".9"') + line('M324 266 Q332 256 344 254', C.white, 5, ' opacity=".9"');

// Hair = a base mass + overlapping curved "locks" (clumps), anime-style.
// lock(base, tip, width, bend): a curved teardrop from the scalp out to a pointed, slightly curled tip.
function lockPath([bx, by], [tx, ty], w, bend) {
  const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len, h = w / 2;
  const mx = bx + dx * 0.5 + nx * bend, my = by + dy * 0.5 + ny * bend;
  const a = [bx + nx * h, by + ny * h], b = [bx - nx * h, by - ny * h];
  return `M${f(a[0])} ${f(a[1])} Q${f(mx + nx * h)} ${f(my + ny * h)} ${f(tx)} ${f(ty)} Q${f(mx - nx * h * 0.6)} ${f(my - ny * h * 0.6)} ${f(b[0])} ${f(b[1])} Z`;
}
/** inner strand line running down the middle of a lock */
function lockStrand([bx, by], [tx, ty], bend, t0 = 0.15, t1 = 0.8) {
  const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  const P = (t) => [bx + dx * t + nx * bend * 4 * t * (1 - t), by + dy * t + ny * bend * 4 * t * (1 - t)];
  const [p0, p1, p2] = [P(t0), P((t0 + t1) / 2), P(t1)];
  return `M${f(p0[0])} ${f(p0[1])} Q${f(2 * p1[0] - (p0[0] + p2[0]) / 2)} ${f(2 * p1[1] - (p0[1] + p2[1]) / 2)} ${f(p2[0])} ${f(p2[1])}`;
}
const HAIR_BASE =
  'M190 276 C176 232 174 176 198 138 C220 104 262 90 304 90 C350 90 394 106 416 140 C438 176 434 232 414 276 L404 276 C400 244 392 228 380 222 L222 222 C208 230 202 250 198 276 Z';
// [base, tip, width, bend] — back row forms the upswept quiff silhouette, sides frame the face
const LOCKS_BACK = [
  [[206, 200], [170, 156], 56, -22],
  [[220, 156], [208, 100], 62, -22],
  [[252, 128], [290, 72], 66, 24],
  [[298, 116], [348, 70], 66, 22],
  [[342, 120], [400, 92], 62, 22],
  [[378, 142], [438, 132], 56, 20],
  [[400, 182], [444, 192], 46, 16],
];
// front row — swept fringe falling onto the forehead (to his left / viewer's right)
const LOCKS_FRONT = [
  [[226, 170], [204, 236], 44, -12],
  [[262, 160], [258, 232], 50, 12],
  [[304, 154], [322, 238], 52, 14],
  [[346, 158], [376, 232], 48, 12],
  [[386, 172], [410, 240], 38, 8],
];
const hair = () => {
  let s = '';
  // faded sides at the temples
  s += path('M186 232 C182 252 184 274 190 292 L201 290 C199 270 200 250 205 236 Z', C.hairMid, null);
  s += path('M414 232 C418 252 416 274 410 292 L399 290 C401 270 400 250 395 236 Z', C.hairMid, null);
  // merged silhouette: outline pass for every shape, then fill pass on top → no tangled inner outlines
  const merged = (shapes, clip = '') =>
    `<g${clip ? ` clip-path="url(#${clip})"` : ''}>` +
    shapes.map((d) => `<path d="${d}" fill="${C.ink}" stroke="${C.ink}" stroke-width="12" stroke-linejoin="round"/>`).join('') +
    `</g>` +
    shapes.map((d) => `<path d="${d}" fill="${C.hair}"/>`).join('');
  s += `<defs><clipPath id="fringe-edge"><rect x="0" y="196" width="600" height="120"/></clipPath></defs>`;
  const back = [HAIR_BASE, ...LOCKS_BACK.map(([b, t, w, bend]) => lockPath(b, t, w, bend))];
  s += merged(back);
  // clump separation: one strand line down each back lock
  for (const [b, t, , bend] of LOCKS_BACK) s += line(lockStrand(b, t, bend, 0.05, 0.75), C.hairMid, 5);
  // anime shine: three tapered violet strokes following the crown
  const shine = (d, w) => line(d, C.hairHi, w) + line(d, C.violetHi, w * 0.4, ' opacity=".8"');
  s += shine('M222 136 Q246 112 278 104', 10) + shine('M300 100 Q332 98 358 110', 9) + shine('M376 124 Q390 136 396 150', 7);
  // fringe: its own merged group over the forehead
  s += merged(LOCKS_FRONT.map(([b, t, w, bend]) => lockPath(b, t, w, bend)), 'fringe-edge');
  for (const [b, t, , bend] of LOCKS_FRONT) s += line(lockStrand(b, t, bend, 0.15, 0.7), C.hairMid, 4);
  s += line('M298 170 Q306 184 310 198', C.hairHi, 5, ' opacity=".85"'); // small shine on the main forehead lock
  return s;
};

// eyes
const EYE_L = [252, 288], EYE_R = [348, 288];
const both = (fn) => fn(...EYE_L, 'L') + fn(...EYE_R, 'R');
const openEye = (dx = 0, dy = 0, iris = 12) => (x, y) =>
  ell(x, y, 17, 19, C.white, 4) + circ(x + dx + 1, y + dy + 2, iris, C.iris, 0, null) + circ(x + dx + 1, y + dy + 2, iris * 0.45, '#120B08', 0, null) +
  circ(x + dx + 6, y + dy - 3, 4.5, C.white, 0, null) + circ(x + dx - 3, y + dy + 8, 2.2, C.white, 0, null) +
  line(`M${x - 19} ${y - 4} Q${x} ${y - 25} ${x + 19} ${y - 4}`, C.ink, 6);
const arc = (x, y, up) => line(`M${x - 16} ${y + (up ? 6 : 0)} Q${x} ${y + (up ? -14 : 10)} ${x + 16} ${y + (up ? 6 : 0)}`, C.ink, 7);
const star = (x, y) => {
  const p = [];
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 9 : 22, a = (i / 10) * Math.PI * 2 - Math.PI / 2; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  return path(poly(p) + ' Z', C.yellow, C.ink, 4);
};
const EYES = {
  open: both(openEye()),
  closed: both((x, y) => arc(x, y, false) + line(`M${x - 14} ${y + 6} L${x - 18} ${y + 12} M${x + 14} ${y + 6} L${x + 18} ${y + 12}`, C.ink, 3)),
  happy: both((x, y) => arc(x, y, true)),
  wink: arc(...EYE_L, true) + openEye()(...EYE_R),
  up: both(openEye(3, -6)),
  side: both(openEye(-6, 2)),
  half: both((x, y) => ell(x, y + 5, 16, 11, C.white, 4) + circ(x + 1, y + 7, 9, C.iris, 0, null) + circ(x + 4, y + 4, 3, C.white, 0, null) + line(`M${x - 18} ${y - 1} L${x + 18} ${y - 1}`, C.ink, 7)),
  shock: both((x, y) => ell(x, y, 19, 22, C.white, 4) + circ(x, y + 1, 5, C.iris, 0, null)),
  money: both((x, y) => circ(x, y, 34, C.yellow, 0, null).replace('/>', ' opacity=".55"/>') + circ(x, y, 21, C.yellow, 4) +
    `<text x="${x}" y="${y + 10}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="30" fill="${C.ink}">$</text>`),
  star: both(star),
};

// brows (drawn above hair)
const brow = (l, r) => line(l, C.hair, 11) + line(r, C.hair, 11);
const BROWS = {
  up: brow('M222 234 Q248 214 280 226', 'M320 226 Q352 214 378 234'),
  cheeky: brow('M222 238 Q250 232 280 236', 'M320 222 Q350 200 380 218'),
  high: brow('M222 222 Q250 204 280 216', 'M320 216 Q350 204 378 222'),
  flat: brow('M222 238 L280 236', 'M320 236 L378 238'),
  think: brow('M222 238 L280 236', 'M320 220 Q350 204 378 222'),
  angry: brow('M222 224 L282 242', 'M318 242 L378 224'),
  sad: brow('M222 240 L280 226', 'M320 226 L378 240'),
};

// mouths — Rhubarb A–H + X, plus expression mouths (centred on 300, 396)
const M = C.mouth;
const MOUTHS = {
  X: line('M282 397 Q300 404 318 397', C.ink, 6),
  A: line('M282 398 L318 398', C.ink, 7),
  B: path('M268 388 Q300 395 332 388 Q328 410 300 412 Q272 410 268 388 Z', M, C.ink, 5) + path('M274 391 Q300 397 326 391 L324 398 Q300 402 276 398 Z', C.white, null),
  C: path('M266 386 Q300 393 334 386 Q330 424 300 426 Q270 424 266 386 Z', M, C.ink, 5) + path('M272 389 Q300 396 328 389 L326 398 Q300 403 274 398 Z', C.white, null) + path('M284 416 Q300 406 316 416 Q300 424 284 416 Z', C.tongue, null),
  D: path('M260 382 Q300 391 340 382 Q336 440 300 444 Q264 440 260 382 Z', M, C.ink, 5) + path('M268 385 Q300 394 332 385 L329 396 Q300 403 271 396 Z', C.white, null) + path('M280 430 Q300 414 320 430 Q300 442 280 430 Z', C.tongue, null),
  E: ell(300, 404, 18, 20, M, 5) + path('M289 414 Q300 408 311 414 Q300 420 289 414 Z', C.tongue, null),
  F: ell(300, 402, 10, 12, M, 5),
  G: path('M272 390 L328 390 L326 404 L274 404 Z', C.white, C.ink, 5) + line('M278 404 Q300 413 322 404', C.ink, 5),
  H: path('M266 386 Q300 393 334 386 Q330 422 300 424 Q270 422 266 386 Z', M, C.ink, 5) + path('M284 398 Q300 386 316 398 Q300 406 284 398 Z', C.tongue, null),
  smile: line('M272 392 Q300 414 328 392', C.ink, 6),
  grin: path('M264 386 Q300 394 336 386 Q332 426 300 428 Q268 426 264 386 Z', M, C.ink, 5) + path('M270 389 Q300 396 330 389 L328 400 Q300 405 272 400 Z', C.white, null) + path('M284 420 Q300 410 316 420 Q300 427 284 420 Z', C.tongue, null),
  smirk: line('M280 400 Q304 406 324 388', C.ink, 6),
  o: ell(300, 404, 14, 18, M, 5),
  sad: line('M280 408 Q300 394 320 408', C.ink, 6),
  wobble: line('M276 402 Q284 396 292 402 Q300 408 308 402 Q316 396 324 402', C.ink, 5),
};

// extras (props around the head)
const EXTRAS = {
  none: '',
  question: `<text x="452" y="196" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="84" fill="${C.violet}" stroke="${C.ink}" stroke-width="3" transform="rotate(12 452 196)">?</text>`,
  anger: line('M424 118 Q440 132 456 118 M424 150 Q440 136 456 150 M422 120 Q436 134 422 148 M458 120 Q444 134 458 148', C.red, 7),
  tear: path('M226 318 C222 334 214 346 214 356 C214 368 232 368 232 356 C232 346 228 334 226 318 Z', C.blue, C.ink, 3) + line('M224 330 L222 372', C.blue, 6, ' opacity=".6"'),
  sweat: path('M430 168 C424 186 414 198 414 210 C414 226 438 226 438 210 C438 198 434 186 430 168 Z', C.blue, C.ink, 3),
  sparkle: star(460, 150).replace(C.yellow, C.lime) + star(150, 190).replace(C.yellow, C.yellow),
};

// glasses slot — 'regular' or 'shades' (sunglasses REPLACE the glasses; they never stack)
const sunglasses = () =>
  `<g stroke="${C.ink}" stroke-width="8"><circle cx="252" cy="286" r="40" fill="${C.shades}"/><circle cx="348" cy="286" r="40" fill="${C.shades}"/>` +
  `<path d="M292 282 Q300 274 308 282" fill="none"/><path d="M212 280 L196 274" fill="none"/><path d="M388 280 L404 274" fill="none"/></g>` +
  line('M228 270 Q238 258 252 256', C.white, 6, ' opacity=".55"') + line('M324 270 Q334 258 348 256', C.white, 6, ' opacity=".55"') +
  line('M262 306 L274 296 M358 306 L370 296', C.white, 4, ' opacity=".35"');
const GLASSES = { regular: glasses(), shades: sunglasses() };

// ---------- write ----------
const parts = {
  legs: legs(), torso: torso(), badge: badge(), 'head-base': headBase(), moustache: moustache(), hair: hair(),
};
const MOUTH_FIT = (m) => `<g transform="translate(300 390) scale(0.86) translate(-300 -396)">${m}</g>`;
const variants = {
  arms: Object.fromEntries(Object.entries(ARMS).map(([k, list]) => [k, list.map(arm).join('\n')])),
  eyes: EYES, brows: BROWS, mouth: Object.fromEntries(Object.entries(MOUTHS).map(([k, m]) => [k, MOUTH_FIT(m)])), extras: EXTRAS, glasses: GLASSES,
};
const wrap = (body, name) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" data-part="${name}">\n${body}\n</svg>\n`;
const dir = join(HERE, 'parts');
rmSync(dir, { recursive: true, force: true });
let n = 0;
for (const [k, v] of Object.entries(parts)) { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, `${k}.svg`), wrap(v, k)); n++; }
for (const [layer, vs] of Object.entries(variants))
  for (const [k, v] of Object.entries(vs)) { mkdirSync(join(dir, layer), { recursive: true }); writeFileSync(join(dir, layer, `${k}.svg`), wrap(v, `${layer}/${k}`)); n++; }
console.log(`✅ mr-pop-v3: ${n} parts`);
