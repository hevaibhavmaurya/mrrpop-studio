"""Make Mr. Pop sound more human WITHOUT changing who he is.

Mr. Pop's timbre reference (voices/custom/mr-pop/reference.wav) was rendered by Kokoro, so it is flat
(~±26 Hz pitch movement). Chatterbox copies the reference's delivery as well as its timbre, so every
Reel inherits that flatness. This script "bootstraps" a livelier reference from Mr. Pop himself:

  1. Chatterbox performs a set of emotional lines (excited, curious, laughing, annoyed, warm, shocked)
     in Mr. Pop's own voice, several takes each, at high exaggeration.
  2. Each take is scored on pitch movement (semitone range) and on SPEAKER SIMILARITY to the original
     reference (Chatterbox's own voice encoder). Takes that drift away from Mr. Pop's timbre are rejected.
  3. The best take per line is stitched into a new ~20 s reference.

No outside voice is used: the only audio input is Mr. Pop's existing (Kokoro, Apache-2.0) reference.

  packages/pipeline/.venv-chatterbox/bin/python packages/pipeline/voice/liven.py <out_dir> [--rounds 2]
Writes <out_dir>/reference.wav + reference.vo.txt + liven.json (scores). Run --rounds 2 to bootstrap twice.
"""
import argparse
import json
import sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch

sys.path.insert(0, str(Path(__file__).parent))
from expressive import ROOT, device, load_model  # noqa: E402
from finish import trim  # noqa: E402
from lipsync import pitch_track  # noqa: E402

LINES = [  # (emotion, exaggeration, cfg, text)
    ("excited", 0.95, 0.30, "Wait, what? One person built this in a weekend, and it already pays a salary!"),
    ("curious", 0.70, 0.40, "Okay, so how did they actually find their first paying users?"),
    ("laugh", 0.95, 0.30, "Ha! Nine bucks a month, and people are lining up for it. I love that."),
    ("annoyed", 0.85, 0.35, "Seriously? Nobody told me about this? Come on!"),
    ("warm", 0.50, 0.50, "Here's the thing. That number comes straight from their payment dashboard."),
    ("shocked", 1.00, 0.30, "No way. Twelve thousand dollars? In one month?"),
    ("playful", 0.80, 0.35, "So, would you build it, or buy it? Tell me in the comments."),
]


def emb(model, x, sr):
    y = librosa.resample(x.astype(np.float32), orig_sr=sr, target_sr=16000)
    return model.ve.embeds_from_wavs([y], sample_rate=16000, as_spk=True)


def cos(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def movement(x, sr):
    f0 = pitch_track(x, sr)
    v = f0[f0 > 0]
    if len(v) < 8:
        return 0.0, 0.0
    st = 12 * np.log2(v / np.median(v))
    return float(np.percentile(st, 90) - np.percentile(st, 10)), float(np.std(v))


def one_round(model, ref: Path, anchor, out: Path, takes: int, seed: int, min_sim: float):
    sr = model.sr
    parts, report = [np.zeros(int(0.2 * sr))], []
    for i, (emo, ex, cfg, text) in enumerate(LINES):
        best = None
        for k in range(takes):
            torch.manual_seed(seed + i * 31 + k)
            w = model.generate(text, audio_prompt_path=str(ref), exaggeration=ex, cfg_weight=cfg, temperature=0.9)
            x = trim(w.squeeze(0).detach().cpu().numpy().astype(np.float64), sr=sr)
            rng, sd = movement(x, sr)
            sim = cos(emb(model, x, sr), anchor)
            dur = len(x) / sr
            sane = 0.55 < dur / max(len(text) / 14.5, 0.3) < 1.7
            sc = rng + 40 * (sim - min_sim) - (0 if sane else 50)
            if sim >= min_sim and sane and (best is None or sc > best[0]):
                best = (sc, x, {"emotion": emo, "take": k, "range_st": round(rng, 1), "pitch_sd_hz": round(sd), "similarity": round(sim, 3)})
        if best is None:
            print(f"  {emo:<8} no take kept the Mr. Pop timbre — skipped", flush=True)
            continue
        parts += [best[1], np.zeros(int(0.35 * sr))]
        report.append({**best[2], "text": text})
        print(f"  {emo:<8} take {best[2]['take'] + 1}  range {best[2]['range_st']} st  sd {best[2]['pitch_sd_hz']} Hz  sim {best[2]['similarity']}", flush=True)
    x = np.concatenate(parts)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.89
    out.mkdir(parents=True, exist_ok=True)
    sf.write(out / "reference.wav", x.astype(np.float32), sr, subtype="PCM_16")
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", type=Path)
    ap.add_argument("--rounds", type=int, default=1)
    ap.add_argument("--takes", type=int, default=4)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--min-sim", type=float, default=0.85)
    ap.add_argument("--start", type=Path, default=None, help="continue bootstrapping from this reference")
    a = ap.parse_args()
    model = load_model(device())
    base = ROOT / "voices/custom/mr-pop/reference.wav"
    x0, sr0 = sf.read(base)
    anchor = emb(model, x0 if x0.ndim == 1 else x0.mean(1), sr0)
    ref, log = (a.start or base), []
    for r in range(a.rounds):
        print(f"round {r + 1} · ref {ref}", flush=True)
        d = a.out if r == a.rounds - 1 else a.out / f"round{r + 1}"
        log.append(one_round(model, ref, anchor, d, a.takes, a.seed + r * 1000, a.min_sim))
        ref = d / "reference.wav"
    (a.out / "reference.vo.txt").write_text("\n".join(f"{{{l['emotion']}}} {l['text']}" for l in log[-1]) + "\n")
    (a.out / "liven.json").write_text(json.dumps({"source": "voices/custom/mr-pop/reference.wav (Kokoro blend, no real person)", "rounds": log}, indent=2))
    print("✓", a.out / "reference.wav")


if __name__ == "__main__":
    main()
