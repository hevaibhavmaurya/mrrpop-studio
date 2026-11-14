"""Open a gap after beat 0 for the VHS rewind and drop a synthesized tape-rewind SFX into it (original sound, numpy only).
Keeps the raw voice as voiceover.raw.* and rewrites voiceover.wav / .beats.json / .face.json with shifted timings.
  packages/pipeline/.venv-chatterbox/bin/python -I build/rewind_gap.py <story>/voice [gap_seconds]
"""
import json, shutil, sys
from pathlib import Path
import numpy as np
import soundfile as sf

vd = Path(sys.argv[1]); GAP = float(sys.argv[2]) if len(sys.argv) > 2 else 0.9
raw = {k: vd / f"voiceover.raw.{k}" for k in ("wav", "beats.json", "face.json")}
for k, p in raw.items():
    if not p.exists():
        shutil.copy(vd / f"voiceover.{k}", p)
x, sr = sf.read(raw["wav"]); beats = json.loads(raw["beats.json"].read_text()); face = json.loads(raw["face.json"].read_text())
b0, b1 = beats["beats"][0]["end"], beats["beats"][1]["start"]
cut = b0 + 0.05                          # insert silence just after the hook line
add = max(0.0, GAP - (b1 - b0))
n = int(round(add * sr))
y = np.concatenate([x[: int(cut * sr)], np.zeros(n), x[int(cut * sr):]])

# tape rewind: fast warbling squeal sweeping up + hiss, short clunks at both ends
L = b1 + add - b0; t = np.arange(int(L * sr)) / sr
f = 900 + 2600 * (t / L) ** 1.3 + 300 * np.sin(2 * np.pi * 23 * t)
squeal = np.sin(2 * np.pi * np.cumsum(f) / sr) * 0.5 + np.sin(4 * np.pi * np.cumsum(f) / sr) * 0.2
rng = np.random.default_rng(7); hiss = rng.standard_normal(len(t)); hiss = np.convolve(hiss, np.ones(6) / 6, "same") * 0.35
env = np.minimum(1, t / 0.05) * np.minimum(1, (L - t) / 0.08) * (0.7 + 0.3 * np.sin(2 * np.pi * 11 * t))
sfx = (squeal + hiss) * env
for c in (0.0, L - 0.06):
    k = (t >= c) & (t < c + 0.06); tt = t[k] - c
    sfx[k] += np.sin(2 * np.pi * 110 * tt) * np.exp(-tt * 60) * 1.4
sfx *= 10 ** (-17 / 20) / (np.sqrt(np.mean(sfx ** 2)) + 1e-9)   # about -17 dBFS RMS, under the voice level
s0 = int(b0 * sr); y[s0 : s0 + len(sfx)] += sfx[: len(y) - s0]
y = np.clip(y, -0.99, 0.99)
sf.write(vd / "voiceover.wav", y, sr, subtype="PCM_16")

sh = lambda v: v + add if v >= cut else v
for b in beats["beats"]:
    b["start"], b["end"] = sh(b["start"]), sh(b["end"])
beats["duration"] = face["duration"] = round(len(y) / sr, 3)
beats["rewind"] = {"start": b0, "end": beats["beats"][1]["start"], "sfx": "synthesized tape rewind (rewind_gap.py)"}
for key in ("visemes", "expressions", "poses"):
    for c in face.get(key, []):
        c["start"], c["end"] = sh(c["start"]), sh(c["end"])
fps = face.get("fps", 30); i = int(cut * fps)
face["energy"] = face["energy"][:i] + [0.0] * int(round(add * fps)) + face["energy"][i:]
(vd / "voiceover.beats.json").write_text(json.dumps(beats, indent=1)); (vd / "voiceover.face.json").write_text(json.dumps(face))
print(f"gap +{add:.2f}s · rewind {b0:.2f} to {beats['beats'][1]['start']:.2f} · duration {beats['duration']}s")
