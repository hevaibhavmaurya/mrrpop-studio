"""Cleaner reference for a VoiceStudio voice: QUALITY bootstrap (not delivery).

The Mr. Pop reference came out of another TTS, so it carries a synthetic "fizz": ~10x the spectral flatness
(hiss/buzz inside voiced sounds), ~2x the pitch micro-jitter (warble) and a lower harmonics-to-noise ratio than
a real recording (measured against V1). A clone copies that. This script renders several takes of plain lines
with the voice, keeps the CLEANEST takes that still sound like the same character (Chatterbox voice-encoder
similarity), stitches ~15 s and re-clones it as "<name> HD". Only the voice's own audio is used.

  packages/pipeline/.venv-chatterbox/bin/python packages/pipeline/voice/hd_ref.py --voice "Mr. Pop" --out voices/custom/mr-pop-2/voicestudio-hd-ref.wav
"""
import argparse
import base64
import io
import json
import sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from finish import trim  # noqa: E402
from voicestudio import MCP, audio_from  # noqa: E402

LINES = [
    "Wait, what? One person built this in a weekend, and it already pays a salary!",
    "Okay, so how did they actually find their first paying users?",
    "Here's the thing. That number comes straight from their payment dashboard.",
    "Nine bucks a month, and people are lining up for it. I love that.",
    "So, would you build it, or buy it? Tell me in the comments.",
]
SR = 24000


def quality(x):
    """lower = cleaner: spectral flatness in voiced/loud frames (fizz) + pitch micro-jitter (warble)."""
    S = np.abs(librosa.stft(x.astype(np.float32), n_fft=1024, hop_length=256)) + 1e-10
    rms = librosa.feature.rms(S=S, frame_length=1024)[0]
    loud = rms > np.percentile(rms, 60)
    flat = float(np.median(librosa.feature.spectral_flatness(S=S)[0][loud]))
    f0, vf, _ = librosa.pyin(x.astype(np.float32), fmin=70, fmax=400, sr=SR, frame_length=1024, hop_length=256)
    v = f0[vf & ~np.isnan(f0)]
    jit = float(np.median(np.abs(np.diff(v)) / v[1:]) * 100) if len(v) > 3 else 9.0
    return flat, jit


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default="Mr. Pop")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--takes", type=int, default=3)
    ap.add_argument("--steps", type=int, default=32)
    ap.add_argument("--min-sim", type=float, default=0.93)
    a = ap.parse_args()

    sys.path.insert(0, str(Path(__file__).parent))
    from expressive import device, load_model  # Chatterbox voice encoder = "same character?" check

    ve = load_model(device()).ve
    emb = lambda x: ve.embeds_from_wavs([librosa.resample(x.astype(np.float32), orig_sr=SR, target_sr=16000)], sample_rate=16000, as_spk=True)
    cos = lambda p, q: float(np.dot(p, q) / np.linalg.norm(p) / np.linalg.norm(q))

    vs = MCP()
    prof = next(p for p in json.loads(vs.tool("list_voices", {})[0]["text"]) if a.voice in (p["id"], p["name"]))
    ref_wav = Path(__file__).resolve().parents[3] / "voices/custom/mr-pop-2/reference.wav"
    r, rsr = sf.read(ref_wav)
    anchor = emb(librosa.resample(r.astype(np.float32), orig_sr=rsr, target_sr=SR) if rsr != SR else r)

    keep, texts, log = [], [], []
    for text in LINES:
        best = None
        for k in range(a.takes):
            x, sr = sf.read(io.BytesIO(audio_from(vs.tool("generate_speech", {"text": text, "profile_id": prof["id"], "steps": a.steps}))))
            x = x if x.ndim == 1 else x.mean(1)
            if sr != SR:
                x = librosa.resample(x.astype(np.float32), orig_sr=sr, target_sr=SR).astype(np.float64)
            x = trim(x, sr=SR)
            flat, jit = quality(x)
            sim = cos(emb(x), anchor)
            score = flat * 1000 + jit  # both "lower is cleaner"
            print(f"  take {k + 1}  fizz {flat:.4f}  warble {jit:.2f}%  same-voice {sim * 100:.1f}%  {text[:40]}", flush=True)
            if sim >= a.min_sim and (best is None or score < best[0]):
                best = (score, x, {"text": text, "fizz": round(flat, 4), "warble": round(jit, 2), "sim": round(sim, 3)})
        if best:
            keep += [best[1], np.zeros(int(0.3 * SR))]
            texts.append(text)
            log.append(best[2])
    clip = np.concatenate(keep)[: int(20 * SR)]
    clip = clip / (np.max(np.abs(clip)) + 1e-9) * 0.89
    sf.write(a.out, clip.astype(np.float32), SR, subtype="PCM_16")
    a.out.with_suffix(".json").write_text(json.dumps({"from": prof["name"], "takes": log}, indent=2))
    buf = io.BytesIO()
    sf.write(buf, clip.astype(np.float32), SR, format="WAV", subtype="PCM_16")
    name = f"{prof['name']} HD"
    old = [p for p in json.loads(vs.tool("list_voices", {})[0]["text"]) if p["name"] == name]
    if old:
        print("profile exists, not re-cloning:", old[0]["id"])
        return
    res = vs.tool("clone_voice", {"name": name, "ref_audio_base64": base64.b64encode(buf.getvalue()).decode(), "ref_text": " ".join(texts), "language": "English"})
    print(f"✓ {len(clip) / SR:.1f}s reference → {res[0]['text']}")


if __name__ == "__main__":
    main()
