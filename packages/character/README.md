# @mrrpop/character

A character **pack** is a folder in `packs/<id>/` with `"format": "mrrpop-character@1"` in its `manifest.json`:

```
packs/mr-pop/
├── manifest.json        layers (draw order), poses, expressions, viseme map, crops, head pivot, blink
└── parts/
    ├── legs.svg  torso.svg  badge.svg  head-base.svg  moustache.svg  glasses.svg  hair.svg
    ├── arms-back/<pose>.svg   arms-front/<pose>.svg
    ├── eyes/<variant>.svg     brows/<variant>.svg
    └── mouth/<A–H, X, smile, grin, o>.svg
```
Every part is a standalone SVG on the **same viewBox** (600×1380), so parts stack 1:1. Redraw any part with the same
filename and nothing else changes. Add a variant = drop a new file in the folder (it is discovered automatically) and
reference it from an expression or pose in `manifest.json`. A new character = new pack folder, then set `"character"` in
`studio.config.json`.

```tsx
import { Character } from '@mrrpop/character';
<Character pose="pointing" expression="money-eyes" viseme="D" badge={false} crop="bust" width={400} />
```

`mr-pop` is generated from the approved v5 demo rig: `npm run character:parts`
(`scripts/split-rig.mjs packs/mr-pop-v2/rig/rig-v5.svg packs/mr-pop`). It is **interim** — the v5 redesign
(elbows + hands, 3/4 head, more mouths, walk cycle) will replace these parts. `mr-pop-v2/` is the legacy PNG/SVG library
and is not loaded by the studio.

## Body motion (knees, weight shift, laugh, hops)
`src/motion.ts` → `bodyMotion({ t, energy, talking, expression, pose, since })` returns `{ dip, sway, lean, crunch, jump,
headTilt, headLift }`; `<Character motion={…}>` applies it. Legs stay planted and bend (layer `legs`, `"lower": true`), the
upper body rides on the hips (`manifest.hip`, `manifest.feet`). Talking → knee pumps + rocking with voice loudness;
`laughing` → small forward bend + laugh bounce; `star-struck`/`celebrating` → crouch-and-hop; `shocked` → recoil;
`thinking`/`curious` → lean. Reel templates: rigs from `scripts/rig.mjs` / Canvas have `#root › #legs + #upper › #head`,
and Canvas injects `window.bodyMotion` + `window.motionTransforms` (see `reel-v3.tpl.html` in the ChatGPT Business Hub story).
