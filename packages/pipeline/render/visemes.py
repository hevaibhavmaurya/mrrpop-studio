"""Loudness-driven mouth track (fallback when Rhubarb isn't installed).
  python visemes.py <voice.wav> <out.json> [fps]
Writes one Rhubarb-style viseme per frame: X (silence), A/B (low), C/E/F (mid), D/H (open)."""
import json, sys
import numpy as np, soundfile as sf
wav, out = sys.argv[1], sys.argv[2]
fps = int(sys.argv[3]) if len(sys.argv) > 3 else 30
a, sr = sf.read(wav)
if a.ndim > 1: a = a.mean(1)
hop = sr // fps
rms = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) if len(a[i:i + hop]) else 0 for i in range(0, len(a), hop)])
peak = np.percentile(rms[rms > 0], 95) if (rms > 0).any() else 1
lv = np.convolve(rms / peak, [0.25, 0.5, 0.25], mode='same')
mid, low, op = ['C', 'E', 'B', 'F', 'C'], ['B', 'A', 'B'], ['D', 'C', 'H', 'D']
frames = []
for i, v in enumerate(lv):
    if v < 0.08: frames.append('X')
    elif v < 0.3: frames.append(low[(i // 2) % len(low)])
    elif v < 0.62: frames.append(mid[(i // 2) % len(mid)])
    else: frames.append(op[(i // 2) % len(op)])
json.dump({'fps': fps, 'frames': ''.join(frames)}, open(out, 'w'))
print(f'visemes → {out} ({len(frames)} frames, {sum(f != "X" for f in frames)} talking)')
