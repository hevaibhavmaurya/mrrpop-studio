#!/usr/bin/env node
// Mr. Pop — "Anchor Bot" concept (pack pop-bot). Original design: a news-anchor robot whose face is a glowing screen.
//   node packages/character/packs/pop-bot/build.mjs
// Techy  → screen face, glowing lime eyes/mouth, scanlines.     News  → antenna "signal" bulb, host headset mic, LIVE light.
// Trust  → blazer, white shirt, tie, calm rounded shapes.        Fun   → huge screen expressions ($ eyes, stars, pixel shades).
// Same slots / poses / expressions / visemes as mr-pop-v3, so every studio page, the lip sync and the signature voice work as-is.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const VB = '0 0 600 1380';

const C = {
  ink: '#1B1838',
  shell: '#F4F2FF', shellSh: '#D6D0F4', shellHi: '#FFFFFF',
  screen: '#120F2A', screenHi: '#241F52',
  glow: '#C6F03A', glowDim: 'rgba(198,240,58,.22)', tongue: '#FF6FB5',
  skin: '#FFFFFF', skinSh: '#D6D0F4', // gloves (hands reuse the v3 hand shapes)
  navy: '#20244A', navySh: '#161936', navyHi: '#323A72',
  violet: '#6A42EC', violetSh: '#5130C9', violetHi: '#8A6CF6',
  lime: '#C6F03A', limeSh: '#97C31A',
  denim: '#1E2244', denimSh: '#151832', denimHi: '#2E3466',
  white: '#FFFFFF', sole: '#E8E5F3', shirt: '#FFFFFF', shirtSh: '#E3DFF5',
  yellow: '#FFD43B', blue: '#5DB8FF', red: '#F0475A',
};
const O = 5;
const f = (n) => Math.round(n * 10) / 10;

// ---------- primitives ----------
const path = (d, fill, stroke = C.ink, sw = O * 2 - 4, extra = '') =>
  `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}${extra}/>`;
const line = (d, color, w, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
const poly = (pts) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L');
const tube = (pts, w, fill) => line(poly(pts), C.ink, w + O * 2) + line(poly(pts), fill, w);
const circ = (cx, cy, r, fill, sw = 4, stroke = C.ink, extra = '') =>
  `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${extra}/>`;
const ell = (cx, cy, rx, ry, fill, sw = 4, stroke = C.ink, extra = '') =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${rx}" ry="${ry}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}${extra}/>`;
const glow = (s) => `<g filter="url(#glow)">${s}</g>`;
const starPts = (x, y, R = 22, r = 9) => {
  const p = [];
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r : R, a = (i / 10) * Math.PI * 2 - Math.PI / 2; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  return poly(p) + ' Z';
};

// ---------- hands: white cartoon gloves ----------
const fin = (x1, y1, x2, y2, w = 12) => tube([[x1, y1], [x2, y2]], w, C.skin);
const knuckles = line('M-12 46 Q-8 50 -4 46 M-2 47 Q2 51 6 47 M8 46 Q12 50 15 45', C.skinSh, 3);
const glovecuff = () => `<rect x="-24" y="-8" width="48" height="16" rx="7" fill="${C.shirtSh}" stroke="${C.ink}" stroke-width="5"/>`;
const HANDS = {
  relaxed: () =>
    fin(-16, 16, -26, 36, 13) + ell(0, 27, 20, 24, C.skin, O * 2 - 3) +
    fin(-12, 40, -13, 60, 11) + fin(-3, 44, -4, 66, 11) + fin(6, 44, 6, 65, 11) + fin(14, 40, 14, 57, 10) + glovecuff(),
  open: () => {
    let s = fin(-14, 20, -40, 34, 13) + circ(0, 26, 22, C.skin, O * 2 - 3);
    [[-26, 50], [-9, 60], [8, 58], [25, 48]].forEach(([a, len]) => {
      const r = (a * Math.PI) / 180;
      s += fin(Math.sin(r) * 12, 26 + Math.cos(r) * 12, Math.sin(r) * len, 26 + Math.cos(r) * len, 12);
    });
    return s + line('M-8 24 Q0 32 9 24', C.skinSh, 3) + glovecuff();
  },
  fist: () => circ(0, 28, 24, C.skin, O * 2 - 3) + knuckles + fin(-17, 20, 2, 33, 12) + glovecuff(),
  point: () => fin(7, 34, 8, 92, 12) + circ(0, 28, 24, C.skin, O * 2 - 3) + knuckles + fin(-17, 20, 2, 33, 12) + glovecuff(),
  thumb: () => circ(0, 28, 24, C.skin, O * 2 - 3) + knuckles + fin(-10, 20, -52, 16, 16) + glovecuff(),
};

// ---------- arms (blazer sleeves + white shirt cuffs) ----------
function arm({ s, e, w, hand = 'relaxed', rot, flip }) {
  const [dx, dy] = [w[0] - e[0], w[1] - e[1]];
  const len = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const cuffStart = [w[0] - (dx / len) * 14, w[1] - (dy / len) * 14];
  let out = line(poly([s, e]), C.ink, 58 + O * 2) + line(poly([e, w]), C.ink, 52 + O * 2);
  out += line(poly([s, e]), C.navy, 58) + line(poly([e, w]), C.navy, 52);
  const nx = -dy / len, ny = dx / len;
  out += line(poly([[s[0] + nx * 14, s[1] + ny * 14], [e[0] + nx * 14, e[1] + ny * 14]]), C.navyHi, 8, ' opacity=".7"');
  out += line(`M${f(e[0] - nx * 18)} ${f(e[1] - ny * 18)} Q${f(e[0])} ${f(e[1])} ${f(e[0] + nx * 10)} ${f(e[1] + ny * 10)}`, C.navySh, 4);
  out += tube([cuffStart, w], 42, C.shirt);
  const r = rot ?? ang - 90;
  out += `<g transform="translate(${f(w[0])} ${f(w[1])}) rotate(${f(r)}) scale(${flip ? -1 : 1} 1) translate(0 6)">${HANDS[hand]()}</g>`;
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
    { s: SL, e: [110, 500], w: [86, 350], hand: 'fist', flip: true },
    { s: SR, e: [490, 500], w: [514, 350], hand: 'fist' },
  ],
  shrug: [
    { s: SL, e: [168, 732], w: [92, 696], hand: 'open', flip: true },
    { s: SR, e: [432, 732], w: [508, 696], hand: 'open' },
  ],
  thumb: [L_IDLE, { s: SR, e: [482, 728], w: [512, 606], hand: 'thumb', rot: 90 }],
  explain: [L_IDLE, { s: SR, e: [440, 736], w: [522, 662], hand: 'open' }],
  wave: [L_IDLE, { s: SR, e: [500, 560], w: [520, 420], hand: 'open' }],
  think: [
    { s: SL, e: [206, 760], w: [344, 744], hand: 'relaxed', flip: true },
    { s: SR, e: [446, 690], w: [396, 476], hand: 'fist', rot: 160 },
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

// ---------- legs (suit trousers + sneakers with the lime Pop dot) ----------
function shoeR() {
  return (
    path('M318 1296 C322 1280 350 1274 374 1278 C398 1282 414 1294 424 1310 C436 1316 438 1336 428 1346 L314 1346 C306 1330 308 1306 318 1296 Z', C.white) +
    path('M318 1296 C328 1290 340 1294 344 1306 L342 1330 L310 1330 C308 1316 312 1304 318 1296 Z', C.violet, null) +
    line('M318 1296 C328 1290 340 1294 344 1306 L342 1330', C.ink, 4) +
    path('M310 1330 L432 1330 C434 1338 432 1344 428 1348 L314 1348 C310 1342 309 1336 310 1330 Z', C.sole) +
    line('M352 1288 L372 1298 M358 1281 L378 1291', C.lime, 5) + circ(392, 1314, 9, C.lime, 4)
  );
}
const legs = () => {
  let s = `<g transform="matrix(-1 0 0 1 600 0)">${shoeR()}</g>` + shoeR();
  s += path('M204 872 L396 872 L394 966 L300 990 L206 966 Z', C.denim);
  s += tube([[252, 920], [246, 1100], [242, 1282]], 84, C.denim);
  s += tube([[348, 920], [354, 1100], [358, 1282]], 84, C.denim);
  s += line('M252 960 L246 1270', C.denimHi, 4, ' opacity=".9"') + line('M348 960 L354 1270', C.denimHi, 4, ' opacity=".9"'); // crease
  s += line('M300 900 L300 984', C.denimSh, 4);
  return s;
};

// ---------- torso: neck joint, blazer, shirt, lime tie, pocket square ----------
const torso = () => {
  let s = '';
  s += `<rect x="268" y="430" width="64" height="100" rx="14" fill="#2A2650" stroke="${C.ink}" stroke-width="6"/>`; // neck joint
  s += line('M270 466 L330 466 M270 490 L330 490', '#3D3870', 6);
  s += path('M186 566 C198 532 240 514 300 514 C360 514 402 532 414 566 L424 924 L176 924 Z', C.navy); // blazer body
  s += path('M246 514 L354 514 L300 700 Z', C.shirt); // shirt V
  s += path('M246 514 L274 512 L286 560 L262 572 Z', C.shirt) + path('M354 514 L326 512 L314 560 L338 572 Z', C.shirt); // collar
  s += path('M286 528 L314 528 L310 556 L290 556 Z', C.lime); // tie knot
  s += path('M290 556 L310 556 L322 664 L300 690 L278 664 Z', C.lime); // tie blade
  s += line('M284 592 L314 576 M282 622 L318 602 M282 652 L320 630', C.limeSh, 5);
  // lapels
  const left = 'M200 548 C216 530 238 520 252 516 L270 572 L250 700 L248 928 L170 928 C164 820 158 664 174 592 C178 572 188 558 200 548 Z';
  s += path(left, C.navy) + `<path d="${left}" fill="${C.navy}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round" transform="matrix(-1 0 0 1 600 0)"/>`;
  const lapel = 'M252 516 L270 572 L252 680 L222 604 L240 584 L228 560 Z';
  s += path(lapel, C.navyHi) + `<path d="${lapel}" fill="${C.navyHi}" stroke="${C.ink}" stroke-width="6" stroke-linejoin="round" transform="matrix(-1 0 0 1 600 0)"/>`;
  s += circ(300, 770, 8, C.navySh, 4) + circ(300, 830, 8, C.navySh, 4); // buttons
  s += path('M206 640 L246 640 L242 668 L210 668 Z', C.navySh, C.ink, 4); // breast pocket
  s += path('M212 642 L222 618 L230 640 L238 622 L244 642 Z', C.lime, C.ink, 4); // pocket square
  s += line('M196 780 L238 780 M362 780 L404 780', C.navySh, 5);
  s += line('M186 620 C182 700 184 800 190 900', C.navyHi, 8, ' opacity=".5"');
  s += line('M414 620 C418 700 416 800 410 900', C.navySh, 8, ' opacity=".7"');
  return s;
};

const badge = () => {
  const cx = 372, cy = 652, pts = [];
  for (let i = 0; i < 16; i++) { const r = i % 2 ? 19 : 27, a = (i / 16) * Math.PI * 2 - Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return path(poly(pts) + ' Z', C.lime, C.ink, 4) +
    `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-style="italic" font-size="22" fill="${C.ink}">P!</text>`;
};

// ---------- head: shell + screen ----------
const SHELL = 'M232 138 L368 138 C412 138 438 164 438 208 L438 380 C438 424 412 452 368 452 L232 452 C188 452 162 424 162 380 L162 208 C162 164 188 138 232 138 Z';
const SCREEN = 'M240 170 L360 170 C390 170 408 188 408 218 L408 376 C408 406 390 424 360 424 L240 424 C210 424 192 406 192 376 L192 218 C192 188 210 170 240 170 Z';
const headBase = () => {
  let s = `<defs>
  <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <radialGradient id="scr" cx="45%" cy="38%" r="75%"><stop offset="0" stop-color="${C.screenHi}"/><stop offset="1" stop-color="${C.screen}"/></radialGradient>
  <clipPath id="shell"><path d="${SHELL}"/></clipPath>
</defs>`;
  // antenna (behind the shell): stem + signal bulb
  s += tube([[300, 142], [300, 92]], 10, '#3D3870');
  s += circ(300, 72, 34, C.lime, 0, null, ' opacity=".25"');
  s += glow(circ(300, 72, 18, C.lime, 5));
  s += circ(294, 66, 5, C.white, 0, null);
  // shell
  s += path(SHELL, C.shell, C.ink, 7);
  s += `<g clip-path="url(#shell)">` + path('M410 150 C446 220 446 380 400 460 L460 460 L460 130 Z', C.shellSh, null, 0, ' opacity=".8"') + `</g>`;
  s += line('M196 160 Q240 148 290 150', C.shellHi, 8);
  // screen
  s += path(SCREEN, 'url(#scr)', C.ink, 6);
  // warm screen blush (friendly, not cold-robot)
  s += ell(222, 344, 20, 9, C.tongue, 0, null, ' opacity=".35"') + ell(378, 344, 20, 9, C.tongue, 0, null, ' opacity=".35"');
  // LIVE light on the bezel
  s += glow(circ(214, 438, 5, C.red, 0, null));
  s += `<text x="226" y="443" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="13" letter-spacing="1.5" fill="${C.ink}">LIVE</text>`;
  return s;
};
// scanlines + soft vignette on top of the face glow
const screenFx = () => {
  let s = `<defs><clipPath id="scrclip"><path d="${SCREEN}"/></clipPath></defs><g clip-path="url(#scrclip)" opacity=".07">`;
  for (let y = 176; y < 424; y += 7) s += `<rect x="190" y="${y}" width="220" height="2.4" fill="#FFFFFF"/>`;
  return s + `</g>`;
};
// headset: ear pods + mic boom (the host detail), drawn above the shell
const headset = () =>
  `<path d="M176 196 C200 120 400 120 424 196" fill="none" stroke="${C.ink}" stroke-width="14" stroke-linecap="round"/>` +
  `<path d="M176 196 C200 120 400 120 424 196" fill="none" stroke="${C.violet}" stroke-width="7" stroke-linecap="round"/>` +
  ell(164, 300, 22, 44, C.violet, 6) + ell(160, 300, 8, 24, C.violetHi, 0, null) +
  ell(436, 300, 22, 44, C.violet, 6) + ell(440, 300, 8, 24, C.violetHi, 0, null) +
  line('M446 330 C462 392 438 444 382 452', C.ink, 12) + line('M446 330 C462 392 438 444 382 452', C.violetSh, 6) +
  ell(372, 452, 16, 11, C.ink, 0, null) + circ(368, 450, 4, C.lime, 0, null);

// ---------- face on the screen (everything glows lime) ----------
const G = C.glow;
const EL = [252, 286], ER = [348, 286];
const both = (fn) => fn(...EL, 'L') + fn(...ER, 'R');
const pill = (dx = 0, dy = 0, ry = 31) => (x, y) =>
  glow(ell(x + dx, y + dy, 22, ry, G, 0, null)) + ell(x + dx + 7, y + dy - ry * 0.45, 6, 8, C.white, 0, null, ' opacity=".9"');
const arc = (x, y, up) => glow(line(`M${x - 20} ${y + (up ? 8 : -4)} Q${x} ${y + (up ? -16 : 12)} ${x + 20} ${y + (up ? 8 : -4)}`, G, 9));
const EYES = {
  open: both(pill()),
  closed: both((x, y) => arc(x, y + 6, false)),
  happy: both((x, y) => arc(x, y, true)),
  wink: arc(...EL, true) + pill()(...ER),
  up: both(pill(0, -10, 24)),
  side: both(pill(-10, 2)),
  half: both((x, y) => glow(path(`M${x - 20} ${y} L${x + 20} ${y} Q${x + 20} ${y + 24} ${x} ${y + 24} Q${x - 20} ${y + 24} ${x - 20} ${y} Z`, G, null))),
  shock: both((x, y) => glow(circ(x, y, 25, 'none', 7, G) + circ(x, y, 7, G, 0, null))),
  money: both((x, y) => glow(`<text x="${x}" y="${y + 22}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="66" fill="${C.yellow}">$</text>`)),
  star: both((x, y) => glow(path(starPts(x, y, 28, 12), C.yellow, null))),
};
const brow = (l, r) => glow(line(l, G, 9) + line(r, G, 9));
const BROWS = {
  up: brow('M226 234 Q250 220 276 230', 'M324 230 Q350 220 374 234'),
  cheeky: brow('M226 240 Q250 236 276 238', 'M324 226 Q350 206 376 220'),
  high: brow('M226 222 Q250 208 276 218', 'M324 218 Q350 208 374 222'),
  flat: brow('M226 240 L276 238', 'M324 238 L374 240'),
  think: brow('M226 240 L276 238', 'M324 222 Q350 208 374 224'),
  angry: brow('M226 226 L278 244', 'M322 244 L374 226'),
  sad: brow('M226 242 L276 228', 'M324 228 L374 242'),
};
// mouths centred on (300, 376): open shapes = dim lime fill + bright lime outline
const open = (d, extra = '') => glow(path(d, C.glowDim, G, 6) + extra);
const MOUTHS = {
  X: glow(line('M284 372 Q300 382 316 372', G, 7)),
  A: glow(line('M282 376 L318 376', G, 8)),
  B: open('M272 366 Q300 372 328 366 Q324 386 300 388 Q276 386 272 366 Z'),
  C: open('M268 362 Q300 368 332 362 Q328 398 300 400 Q272 398 268 362 Z'),
  D: open('M262 356 Q300 364 338 356 Q334 406 300 410 Q266 406 262 356 Z', path('M282 396 Q300 384 318 396 Q300 406 282 396 Z', C.tongue, null)),
  E: open('M282 376 A18 22 0 1 0 318 376 A18 22 0 1 0 282 376 Z'),
  F: open('M290 376 A10 13 0 1 0 310 376 A10 13 0 1 0 290 376 Z'),
  G: open('M276 362 L324 362 L322 374 L278 374 Z') + glow(line('M280 384 Q300 392 320 384', G, 6)),
  H: open('M268 362 Q300 368 332 362 Q328 396 300 398 Q272 396 268 362 Z', path('M284 374 Q300 362 316 374 Q300 382 284 374 Z', C.tongue, null)),
  smile: glow(line('M268 362 Q300 394 332 362', G, 8)),
  grin: open('M264 358 L336 358 Q332 402 300 404 Q268 402 264 358 Z', line('M268 370 L332 370', G, 4)),
  smirk: glow(line('M280 382 Q306 388 326 364', G, 8)),
  o: open('M286 376 A14 18 0 1 0 314 376 A14 18 0 1 0 286 376 Z'),
  sad: glow(line('M278 390 Q300 368 322 390', G, 8)),
  wobble: glow(line('M274 380 Q282 372 291 380 Q300 388 309 380 Q318 372 326 380', G, 6)),
};
const EXTRAS = {
  none: '',
  question: `<text x="420" y="214" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="84" fill="${C.violet}" stroke="${C.ink}" stroke-width="3" transform="rotate(12 420 214)">?</text>`,
  anger: line('M404 128 Q420 142 436 128 M404 160 Q420 146 436 160 M402 130 Q416 144 402 158 M438 130 Q424 144 438 158', C.red, 7),
  tear: glow(path('M246 318 C242 334 234 346 234 356 C234 368 252 368 252 356 C252 346 248 334 246 318 Z', C.blue, null)),
  sweat: path('M426 176 C420 194 410 206 410 218 C410 234 434 234 434 218 C434 206 430 194 426 176 Z', C.blue, C.ink, 3),
  sparkle: path(starPts(432, 150), C.lime, C.ink, 4) + path(starPts(166, 176, 18, 8), C.yellow, C.ink, 4),
};
// glasses slot: 'regular' = glass glare on the screen; 'shades' = pixel shades (replace, never stack)
const pixelShades = () => {
  let s = '';
  const px = 12, rows = ['1111111111111111111', '1111111101111111111', '0111110000011111100', '0011100000001110000'];
  rows.forEach((r, j) => [...r].forEach((c, i) => { if (c === '1') s += `<rect x="${186 + i * px}" y="${264 + j * px}" width="${px + 0.5}" height="${px + 0.5}" fill="${C.ink}"/>`; }));
  return s + `<rect x="210" y="${264 + px}" width="${px}" height="${px}" fill="${C.white}" opacity=".85"/><rect x="${210 + px}" y="${264 + px * 2}" width="${px}" height="${px}" fill="${C.white}" opacity=".85"/>` +
    `<rect x="330" y="${264 + px}" width="${px}" height="${px}" fill="${C.white}" opacity=".85"/><rect x="${330 + px}" y="${264 + px * 2}" width="${px}" height="${px}" fill="${C.white}" opacity=".85"/>`;
};
const GLASSES = {
  regular: `<defs><clipPath id="glare"><path d="${SCREEN}"/></clipPath></defs><g clip-path="url(#glare)"><path d="M192 250 L262 170 L300 170 L192 292 Z" fill="#FFFFFF" opacity=".06"/><path d="M192 316 L320 170 L334 170 L192 332 Z" fill="#FFFFFF" opacity=".05"/></g>`,
  shades: pixelShades(),
};

// ---------- write ----------
const parts = { legs: legs(), torso: torso(), badge: badge(), 'head-base': headBase(), 'screen-fx': screenFx(), headset: headset() };
const variants = {
  arms: Object.fromEntries(Object.entries(ARMS).map(([k, list]) => [k, list.map(arm).join('\n')])),
  eyes: EYES, brows: BROWS, mouth: MOUTHS, extras: EXTRAS, glasses: GLASSES,
};
// Big-head mascot proportions: every head part is drawn at 1:1 above, then scaled up around the chin (300, 452).
const HEAD = new Set(['head-base', 'screen-fx', 'headset', 'eyes', 'brows', 'mouth', 'extras', 'glasses']);
const HEAD_SCALE = 1.22;
const wrap = (body, name) => {
  const head = HEAD.has(name.split('/')[0]);
  const inner = head ? `<g transform="translate(300 452) scale(${HEAD_SCALE}) translate(-300 -452)">${body}</g>` : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}" data-part="${name}">\n${inner}\n</svg>\n`;
};
const dir = join(HERE, 'parts');
rmSync(dir, { recursive: true, force: true });
let n = 0;
for (const [k, v] of Object.entries(parts)) { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, `${k}.svg`), wrap(v, k)); n++; }
for (const [layer, vs] of Object.entries(variants))
  for (const [k, v] of Object.entries(vs)) { mkdirSync(join(dir, layer), { recursive: true }); writeFileSync(join(dir, layer, `${k}.svg`), wrap(v, `${layer}/${k}`)); n++; }
console.log(`✅ pop-bot: ${n} parts`);
