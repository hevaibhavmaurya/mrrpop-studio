/**
 * Mr. Pop body motion — how he moves like a person while he talks, laughs, reacts or listens.
 *
 * Pure + self-contained on purpose (no imports, no outer variables): reel templates receive this exact function as
 * text (bodyMotion.toString()) so the Canvas preview, the studio and the final render move identically.
 *
 * The body is three joints:
 *   hips   — legs stay planted and bend (dip), weight shifts sideways over the feet (sway); the whole upper body rides here
 *   waist  — the stomach: the chest bends from here (lean = side bend, crunch = forward fold when laughing / sad)
 *   neck   — headTilt / headLift on top of the chest
 * plus shoulders (arms + head lift together: laugh bounce, shocked flinch, breathing) and a gesture: `pose` is the arm
 * pose he should show right now (laughing → hands on the stomach, shocked → hands up, cool → hands on hips …).
 */
export interface MotionInput {
  /** seconds */
  t: number;
  /** voice loudness 0–1 at t (0 when silent) */
  energy?: number;
  talking?: boolean;
  expression?: string;
  /** the pose the script / beat asked for */
  pose?: string;
  /** seconds since the current expression started (one-shot reactions: shocked flinch, laugh throw-back) */
  since?: number;
  /** the expression / pose before this one — the body eases out of them over 0.4 s */
  prevExpression?: string;
  prevPose?: string;
}
export interface Motion {
  /** arm pose to show (may differ from the requested one: reactions take over the hands) */
  pose: string;
  dip: number;
  sway: number;
  lean: number;
  crunch: number;
  breath: number;
  shoulders: number;
  jump: number;
  headTilt: number;
  headLift: number;
}

export function bodyMotion(i: MotionInput): Motion {
  // Everything here is smooth on purpose: no |sin| cusps, nothing faster than ~4.5 Hz (a 30 fps render samples a
  // 12 Hz wiggle unevenly → visible zig-zag), and reactions ease in AND out (blend from the previous expression).
  const S = Math.sin, C = Math.cos, PI = Math.PI;
  const ease = (v: number) => v * v * (3 - 2 * v);
  const wave = (t: number, hz: number) => 0.5 - 0.5 * C(t * hz * 2 * PI); // smooth 0→1→0

  function core(t: number, e: number, talk: boolean, x: string, pose: string, since: number): Motion {
    const k = (d: number) => Math.max(0, Math.min(1, since / d));
    // standing: breathing (chest + shoulders rise together), slow weight shift, never frozen
    const br = S(t * 1.7);
    const m: Motion = {
      pose, dip: 2 + br * 1.5, sway: S(t * 0.7) * 1.4, lean: S(t * 0.9) * 0.8, crunch: 0,
      breath: br, shoulders: br * 1.5, jump: 0, headTilt: S(t * 1.4) * 1.6, headLift: br * 0.8,
    };
    // speaking: voice loudness (pass a smoothed value — energyAt) drives slow, phrase-sized movement
    if (talk || e > 0.05) {
      m.dip += e * 6 * wave(t, 1.6);
      m.sway += S(t * 0.9) * 1.4 * (0.4 + e);
      m.lean += S(t * 1.7) * 1.8 * e;
      m.shoulders += e * 3.5 * (0.5 + 0.5 * S(t * 3.4));
      m.headTilt += (S(t * 3.6) * 2.2 + S(t * 1.9) * 1.6) * (0.4 + e * 0.8);
      m.headLift += (0.5 + 0.5 * S(t * 4.2)) * 3 * e;
    }
    if (x === 'laughing') {
      // a real laugh: head back for a moment, then folding at the stomach with hands on the belly,
      // shoulders bouncing "ha-ha-ha" (~4.5 Hz), knees giving a little
      pose = pose === 'pointing' || pose === 'pointing-side' ? 'laugh-point' : 'belly-laugh';
      const back = 1 - ease(k(0.4));
      const h = wave(t, 4.5);
      const fold = ease(k(0.55));
      m.crunch = fold * (0.6 + 0.4 * h);
      m.shoulders = 4 + h * 7 * fold + back * 5;
      m.dip = 8 + fold * (7 + h * 5);
      m.lean = S(t * 2.6) * 3;
      m.headLift = back * 6 - fold * (4 + h * 3);
      m.headTilt = S(t * 2.6) * 5 - back * 4;
    } else if (x === 'star-struck' || pose === 'celebrating') {
      // celebrate: crouch → hop, ~2 hops a second, chest open
      const ph = (t * 2.0) % 1;
      if (ph < 0.35) m.dip = 4 + 14 * S((ph / 0.35) * PI);
      else m.jump = 22 * S(((ph - 0.35) / 0.65) * PI);
      m.shoulders += 4;
      m.headTilt += S(t * 2.4) * 3;
    } else if (x === 'shocked') {
      // flinch: hands snap up, shoulders jump, knees drop — then it settles
      const r = k(0.5);
      if (since < 1.2) pose = 'recoil';
      m.shoulders = 4 + (r < 1 ? 9 * S(r * PI) : 0);
      m.dip += r < 1 ? 14 * S(r * PI) : 4;
      m.lean += -2.5 * (1 - ease(r));
      m.headLift += r < 1 ? 3 * S(r * PI) : 0;
    } else if (x === 'thinking' || x === 'curious') {
      m.lean += 2.4; m.sway += 1.2; m.headTilt += 5;
    } else if (x === 'sad' || x === 'crying') {
      m.crunch = 0.35; m.shoulders = -4 + br; m.dip += 5; m.headLift -= 7; m.headTilt -= 3;
    } else if (x === 'nervous') {
      if (pose === 'idle' || pose === 'explaining') pose = 'clap';
      m.sway += S(t * 5) * 0.7; m.shoulders += 4 + S(t * 4) * 1.2; m.dip += 4;
    } else if (x === 'cool' || x === 'cheeky' || x === 'skeptical') {
      // confident: weight on one leg, hands on hips, chin slightly up
      if (pose === 'idle' || pose === 'explaining') pose = 'hands-on-hips';
      m.sway += 2.4; m.lean -= 1.2; m.headLift += 2; m.headTilt += 3;
    } else if (x === 'money-eyes' || x === 'grin') {
      m.shoulders += 2;
    }
    // ── expression pack 2: a body reaction for every new feeling. A gesture is only chosen when the script left the
    //    pose neutral (idle / explaining), so a scripted pose always wins.
    const auto = (p: string) => { if (pose === 'idle' || pose === 'explaining') pose = p; };
    if (x === 'giggle') {
      const h = wave(t, 4);
      m.shoulders += 2 + h * 3; m.dip += 2 + h * 2; m.headTilt += S(t * 2.2) * 3;
    } else if (x === 'excited' || x === 'hyped') {
      auto(x === 'excited' ? 'fist-pump' : 'present');
      const h = wave(t, 2.2);
      m.dip += 3 + h * 6; m.shoulders += 3 + h * 2; m.headLift += 2;
    } else if (x === 'amazed' || x === 'gasp' || x === 'mind-blown') {
      // jolt back, then settle
      const r = k(0.5);
      if (x === 'mind-blown') auto('hands-on-cheeks'); else if (x === 'gasp' && since < 1) pose = pose === 'idle' ? 'recoil' : pose;
      m.shoulders = 4 + (r < 1 ? 8 * S(r * PI) : 0);
      m.dip += r < 1 ? 10 * S(r * PI) : 3;
      m.lean += -2 * (1 - ease(r));
      m.headLift += 2;
    } else if (x === 'idea') {
      auto('pointing');
      const r = k(0.35);
      m.jump = r < 1 ? 14 * S(r * PI) : 0; m.headLift += 3;
    } else if (x === 'confused') {
      auto('head-scratch');
      m.headTilt += 8 + S(t * 1.2) * 2; m.sway += 1;
    } else if (x === 'dizzy') {
      m.sway += S(t * 1.6) * 3; m.headTilt += S(t * 2.4) * 6; m.lean += S(t * 1.3) * 2;
    } else if (x === 'pondering' || x === 'focused' || x === 'suspicious' || x === 'side-eye') {
      if (x === 'pondering') auto('thinking');
      if (x === 'suspicious') auto('arms-crossed');
      m.lean += 2; m.headTilt += x === 'pondering' ? 4 : x === 'side-eye' ? -3 : 0;
    } else if (x === 'disappointed' || x === 'teary' || x === 'worried') {
      m.crunch = 0.2; m.shoulders = -2 + br; m.headLift -= 4;
      if (x === 'worried') m.shoulders += 2 + S(t * 3) * 1;
      if (x === 'disappointed') auto('shrug');
    } else if (x === 'embarrassed' || x === 'cringe') {
      // shrink: shoulders up, a little fold, head down and away
      if (x === 'cringe') auto('facepalm');
      m.shoulders += 6; m.crunch = 0.25; m.headLift -= 4; m.headTilt -= 4;
    } else if (x === 'angry' || x === 'frustrated') {
      auto(x === 'angry' ? 'hands-on-hips' : 'arms-crossed');
      m.crunch = 0.12; m.shoulders += 5; m.lean += S(t * 4) * 0.6; m.headLift -= 1;
    } else if (x === 'annoyed') {
      // irritated, not amused: arms crossed, weight dumped on one hip, head tilted away, a slow sigh (shoulders up → drop)
      auto('arms-crossed');
      const sigh = wave(t, 0.35);
      m.sway += 3; m.lean -= 1.5; m.headTilt -= 5 + S(t * 0.8) * 1.5; m.headLift -= 1;
      m.shoulders += 3 * sigh - 1; m.dip += 2;
    } else if (x === 'eye-roll') {
      auto('arms-crossed');
      m.headTilt -= 6 * ease(k(0.4)); m.headLift += 2;
    } else if (x === 'smug' || x === 'confident' || x === 'proud') {
      auto(x === 'confident' ? 'arms-crossed' : 'hands-on-hips');
      m.shoulders += 2; m.headLift += 3; m.sway += 1.5;
    } else if (x === 'determined') {
      auto('fist-pump');
      m.lean += 1; m.shoulders += 2;
    } else if (x === 'bored') {
      auto('arms-crossed');
      m.crunch = 0.15; m.dip += 4; m.headTilt += 6; m.headLift -= 3;
    } else if (x === 'love') {
      auto('hands-on-cheeks');
      m.sway += S(t * 1.2) * 3; m.headTilt += S(t * 1.2) * 5;
    } else if (x === 'whistling') {
      m.sway += S(t * 1.4) * 2.5; m.headTilt += S(t * 1.4) * 4;
    } else if (x === 'goofy') {
      m.dip += 4 * wave(t, 2.6); m.headTilt += S(t * 2.6) * 6;
    } else if (x === 'money-hungry') {
      auto('money-rub');
      m.shoulders += 2;
    } else if (x === 'relieved') {
      // big exhale: shoulders drop, knees soften, then settle
      const r = k(0.8);
      m.shoulders += r < 1 ? -5 * S(r * PI) : 0; m.dip += 4 * (1 - ease(r));
    } else if (x === 'impressed') {
      m.lean -= 1.5; m.headLift -= 2;
    } else if (x === 'content') {
      m.sway += S(t * 0.8) * 1.2;
    }
    if (pose === 'pointing') m.lean -= 1.5;
    if (pose === 'pointing-side') m.lean += 2;
    if (pose === 'shrug') { m.shoulders += 7; m.headTilt += 5; }
    m.pose = pose;
    return m;
  }

  const t = i.t, e = Math.max(0, Math.min(1, i.energy ?? 0)), talk = !!i.talking;
  const since = Math.max(0, i.since ?? 99);
  const cur = core(t, e, talk, i.expression ?? 'smile', i.pose ?? 'idle', since);
  // ease out of the previous expression / pose over 0.4 s (laugh fold, sad slump, pointing lean … never snap)
  const px = i.prevExpression ?? i.expression ?? 'smile', pp = i.prevPose ?? i.pose ?? 'idle';
  if ((px !== (i.expression ?? 'smile') || pp !== (i.pose ?? 'idle')) && since < 0.4) {
    const prev = core(t, e, talk, px, pp, 99);
    const w = ease(since / 0.4);
    for (const key of ['dip', 'sway', 'lean', 'crunch', 'breath', 'shoulders', 'jump', 'headTilt', 'headLift'] as const)
      cur[key] = prev[key] + (cur[key] - prev[key]) * w;
  }
  return cur;
}

/** Voice loudness at t, smoothed over ±0.18 s (Hann window) — raw per-frame energy flickers and makes him jitter. */
export function energyAt(energy: number[] | undefined, fps: number, t: number): number {
  if (!energy || !energy.length) return 0;
  const c = t * fps, r = Math.max(1, Math.round(0.18 * fps));
  let sum = 0, wsum = 0;
  for (let j = -r; j <= r; j++) {
    const idx = Math.round(c) + j;
    if (idx < 0 || idx >= energy.length) continue;
    const w = 0.5 + 0.5 * Math.cos((Math.PI * j) / (r + 1));
    sum += energy[idx] * w;
    wsum += w;
  }
  return wsum ? sum / wsum : 0;
}

/**
 * SVG transforms for a rig with groups  root › legs  +  upper › (torso/badge, arms, head).
 * hip = belt [x, y]; waist = stomach [x, y]; feet = y of the soles.
 */
export function motionTransforms(m: Motion, hip: [number, number], feet: number, waist?: [number, number]) {
  const L = Math.max(1, feet - hip[1]);
  const hx = Math.tan((m.sway * Math.PI) / 180) * L;
  const sy = 1 - m.dip / L;
  const sx = 1 + (m.dip / L) * 0.5; // bent knees push out a little
  const [px] = hip;
  const [wx, wy] = waist ?? [hip[0], hip[1] - 40];
  // forward fold seen from the front = the chest shortens toward the stomach; breathing = tiny chest swell
  const fold = 1 - m.crunch * 0.11 + m.breath * 0.006;
  return {
    root: `translate(0 ${-m.jump})`,
    legs: `translate(${px} ${feet}) skewX(${-m.sway}) scale(${sx} ${sy}) translate(${-px} ${-feet})`,
    upper: `translate(${hx} ${m.dip}) rotate(${m.lean} ${wx} ${wy}) translate(${wx} ${wy}) scale(1 ${fold}) translate(${-wx} ${-wy})`,
    arms: `translate(0 ${-m.shoulders})`,
    /** head: add to headTilt / headLift — shoulders carry the head too */
    headY: -m.shoulders * 0.6 - m.headLift,
  };
}
