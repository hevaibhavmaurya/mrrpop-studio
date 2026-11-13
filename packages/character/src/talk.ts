import { useEffect, useRef, useState } from 'react';

export interface VisemeCue {
  start: number;
  end: number;
  value: string;
}

/**
 * Rough text → viseme cues for previews only (no audio).
 * Real videos use Rhubarb Lip Sync on the voiceover (packages/pipeline).
 */
export function textToVisemes(text: string, opts: { charsPerSecond?: number } = {}): VisemeCue[] {
  const cps = opts.charsPerSecond ?? 14;
  const step = 1 / cps;
  const cues: VisemeCue[] = [];
  let t = 0.1;
  const push = (value: string, dur: number) => {
    const last = cues[cues.length - 1];
    if (last && last.value === value) last.end += dur;
    else cues.push({ start: t, end: t + dur, value });
    t += dur;
  };
  const s = text.toLowerCase();
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const two = s.slice(i, i + 2);
    if (/[.!?]/.test(c)) push('X', step * 5);
    else if (/[,;:—-]/.test(c)) push('X', step * 2.5);
    else if (c === ' ') push('A', step * 0.4);
    else if (two === 'th' || c === 'l') push('H', step), two === 'th' && i++;
    else if (/[mbp]/.test(c)) push('A', step);
    else if (/[fv]/.test(c)) push('G', step);
    else if (/[ou]/.test(c)) push(c === 'o' ? 'E' : 'F', step * 1.3);
    else if (c === 'w') push('F', step);
    else if (c === 'a') push('D', step * 1.3);
    else if (/[ei]/.test(c)) push('C', step * 1.2);
    else if (/[a-z0-9$]/.test(c)) push('B', step);
  }
  push('X', 0.3);
  return cues;
}

export function visemeAt(cues: VisemeCue[], t: number): string {
  for (const c of cues) if (t >= c.start && t < c.end) return c.value;
  return 'X';
}

/** Plays cues in real time; returns the current viseme, elapsed time and a blink flag. */
export function useTalk(cues: VisemeCue[], playing: boolean, blinkEvery = 3.4) {
  const [state, setState] = useState({ t: 0, viseme: 'X', blink: false });
  const start = useRef(0);
  useEffect(() => {
    let raf = 0;
    start.current = performance.now();
    const total = cues.length ? cues[cues.length - 1].end : 0;
    const tick = (now: number) => {
      const t = (now - start.current) / 1000;
      const blink = t % blinkEvery > blinkEvery - 0.13;
      const viseme = playing && t < total ? visemeAt(cues, t) : 'X';
      setState((s) => (s.viseme === viseme && s.blink === blink ? s : { t, viseme, blink }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cues, playing, blinkEvery]);
  return state;
}
