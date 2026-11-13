import { useEffect, useRef, useState } from 'react';
import { bodyMotion, Character, energyAt, visemeAt, type VisemeCue } from '@mrrpop/character';
import { Icon } from '@mrrpop/theme';

/** <out>.face.json written by packages/pipeline/voice/expressive.py (lipsync.py). */
export interface FaceTrack {
  fps: number;
  duration: number;
  visemes: VisemeCue[];
  expressions: VisemeCue[];
  poses: VisemeCue[];
  energy: number[];
}

const cueAt = (cues: VisemeCue[], t: number) => {
  for (const c of cues) if (t >= c.start && t < c.end) return c;
  return t >= (cues.at(-1)?.end ?? 0) ? cues.at(-1) : undefined;
};
const at = (cues: VisemeCue[], t: number, fallback: string) => cueAt(cues, t)?.value ?? fallback;

/**
 * Plays a voiceover with Mr. Pop performing it: mouth from the audio's viseme track, expression + pose per beat,
 * whole-body motion from bodyMotion() (knees, weight shift, laugh curl, hops) driven by loudness + expression. Everything is read from audio.currentTime, so scrubbing stays in sync.
 */
export function TalkingTake({ src, track, scene = 'var(--mp-role-card-a)', pack }: { src: string; track: FaceTrack; scene?: string; pack?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [wall, setWall] = useState(0); // keeps him breathing / shifting weight while paused

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (audio.current) setT(audio.current.currentTime);
      setWall(performance.now() / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const viseme = playing || t > 0 ? visemeAt(track.visemes, t) : 'X';
  const expression = t > 0 ? at(track.expressions, t, 'smile') : 'smile';
  const pose = t > 0 ? at(track.poses, t, 'idle') : 'idle';
  const e = track.energy[Math.min(Math.floor(t * track.fps), track.energy.length - 1)] ?? 0;
  const talking = viseme !== 'X';
  const exprCue = cueAt(track.expressions, t);
  const prevCue = exprCue ? track.expressions[track.expressions.indexOf(exprCue) - 1] : undefined;
  const motion = bodyMotion({
    t: playing ? t : wall,
    energy: playing ? energyAt(track.energy, track.fps, t) : 0,
    prevExpression: prevCue?.value,
    prevPose: (() => { const pc = cueAt(track.poses, t); const j = pc ? track.poses.indexOf(pc) : -1; return j > 0 && exprCue && track.poses[j].start >= exprCue.start - 0.05 ? track.poses[j - 1].value : undefined; })(),
    talking: playing && talking,
    expression,
    pose,
    since: exprCue ? t - exprCue.start : 99,
  });
  const blink = t % 3.4 > 3.27 && !['wink', 'star-struck', 'money-eyes'].includes(expression);

  return (
    <div className="talk">
      <div className="talk-stage dots" style={{ background: `var(--mp-dot-grid), ${scene}` }}>
        <div className="talk-tags">
          <span className="talk-chip">
            <Icon name="face" size={16} fill="var(--mp-accent-lime)" /> {expression}
          </span>
          <span className="talk-chip">{motion.pose}</span>
          <span className="talk-chip mono">{viseme}</span>
        </div>
        <div>
          <Character
            pack={pack}
            pose={pose}
            expression={expression}
            viseme={viseme}
            blink={blink}
            motion={motion}
            height={460}
            style={{ filter: 'drop-shadow(0 18px 18px rgba(27,24,56,.2))' }}
          />
        </div>
      </div>
      <audio
        ref={audio}
        controls
        preload="auto"
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
