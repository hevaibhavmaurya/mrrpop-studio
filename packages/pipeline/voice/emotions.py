"""Per-emotion references for one voice, cut from that voice's own reference.wav.

Chatterbox reads only the first ~6 s of a reference for delivery (and ~10 s for timbre). So for each emotion
line inside reference.wav we write emotions/<name>.wav = that line FIRST, then the rest of the reference.
Same voice in every file (it is the same audio, reordered) — only the delivery the model copies changes.

  packages/pipeline/.venv-chatterbox/bin/python packages/pipeline/voice/emotions.py voices/custom/mr-pop-2
Needs <voice>/reference.vo.txt with one {emotion} line per spoken line, in order.
"""
import re
import sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

d = Path(sys.argv[1])
y, sr = sf.read(d / "reference.wav")
y = y if y.ndim == 1 else y.mean(1)
names = [m.group(1) for m in (re.match(r"^\{(\w+)\}", l.strip()) for l in (d / "reference.vo.txt").read_text().splitlines()) if m]

iv = librosa.effects.split(y.astype(np.float32), top_db=40, frame_length=1024, hop_length=256)
segs = [[int(iv[0][0]), int(iv[0][1])]]
for a, b in iv[1:]:  # merge pauses inside a line (< 0.3 s); lines are 0.35 s apart
    if (a - segs[-1][1]) / sr < 0.3:
        segs[-1][1] = int(b)
    else:
        segs.append([int(a), int(b)])
if len(segs) == len(names) + 1:  # a short lead word ("Wait, what?") split off the first line
    segs = [[segs[0][0], segs[1][1]]] + segs[2:]
if len(segs) != len(names):
    sys.exit(f"found {len(segs)} spoken lines, reference.vo.txt has {len(names)} — adjust and re-run")

pad = int(0.05 * sr)
gap = np.zeros(int(0.35 * sr))
clips = [y[max(a - pad, 0): b + pad] for a, b in segs]
(d / "emotions").mkdir(exist_ok=True)
for i, name in enumerate(names):
    order = clips[i:] + clips[:i]
    out = np.concatenate([np.zeros(int(0.15 * sr))] + [p for c in order for p in (c, gap)])
    sf.write(d / "emotions" / f"{name}.wav", out.astype(np.float32), sr, subtype="PCM_16")
    print(f"  {name:<8} {(segs[i][1] - segs[i][0]) / sr:4.1f}s first, {len(out) / sr:4.1f}s total")
