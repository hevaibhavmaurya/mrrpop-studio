"""Mr. Pop EXPRESSIVE voice — Chatterbox (Resemble AI, MIT) with real intonation: pitch rises and falls with
the words, questions lift, punchlines land. Uses the same tagged scripts as perform.py.

  packages/pipeline/.venv-chatterbox/bin/python packages/pipeline/voice/expressive.py \
      <script.vo.txt> <out.wav>   (defaults = the approved signature in voices.json)

  --ref    an MRR Pop voice id (uses voices/custom/<id>/sample.wav as the timbre reference — our own Kokoro
           voices, so no real person is cloned) or a path to a .wav you have the rights to.
  --more   add to every beat's exaggeration (e.g. 0.15 = more animated, -0.15 = calmer).
  --seed   same seed + same script = same performance. Try a few seeds and keep the best take.
  --takes  generate N takes per beat and keep the best: widest natural pitch movement (the "melody" of the
           line), with glitchy takes rejected (too long/short for the words, long dead air inside the line).

Per-beat styles come from "expressive" in voices/custom/voices.json:
  exaggeration  emotion / pitch range (0.25 flat … 1.0 very animated)
  cfg           pacing adherence; lower = slower, more deliberate delivery (pairs well with high exaggeration)
  temperature   take-to-take variation
Kokoro stress markup like [Chrome](+2) is accepted and stripped (Chatterbox decides emphasis itself — use
CAPS sparingly, "!", "?", "…" and commas to steer it).

Output: 24 kHz mono 16-bit wav, finished to -14 LUFS, plus <out>.beats.json (per-beat timings + take scores)
and <out>.face.json (mouth shapes from the real audio + expression/pose per beat — the studio plays it on Mr. Pop).
Chatterbox adds Resemble's inaudible PerTh watermark to every file.
"""
import argparse
import json
import re
import warnings
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

from finish import finish, lufs, trim
from lipsync import build_track, envelope, pitch_track, voiced_mask

warnings.filterwarnings("ignore")
ROOT = Path(__file__).resolve().parents[3]
REG = ROOT / "voices" / "custom" / "voices.json"
TAG = re.compile(r"^\{(\w+)\}\s*")
MARKUP = re.compile(r"\[([^\]]+)\]\([^)]*\)")


def device() -> str:
    if torch.backends.mps.is_available():
        return "mps"
    return "cuda" if torch.cuda.is_available() else "cpu"


def load_model(dev: str):
    from chatterbox.tts import ChatterboxTTS

    # Checkpoints are saved on CUDA; map them onto whatever this Mac has.
    _load = torch.load
    torch.load = lambda *a, **k: _load(*a, **{**k, "map_location": torch.device(dev)})
    try:
        return ChatterboxTTS.from_pretrained(device=dev)
    finally:
        torch.load = _load


def parse(path: Path) -> list[tuple[str, str]]:
    out = []
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = TAG.match(line)
        out.append((m.group(1) if m else "fun", MARKUP.sub(r"\1", TAG.sub("", line))))
    return out


SIM_WEIGHT = 150  # 0.01 closer to the reference voice ≈ 1.5 semitones of extra pitch range in the take score


def speaker_sim(model, x: np.ndarray, sr: int, ref_emb):
    """Chatterbox's own voice encoder. With ref_emb=None returns the embedding, else cosine similarity to it."""
    import librosa

    y = librosa.resample(np.asarray(x, dtype=np.float32), orig_sr=sr, target_sr=16000)
    e = model.ve.embeds_from_wavs([y], sample_rate=16000, as_spk=True)
    if ref_emb is None:
        return e
    return float(np.dot(e, ref_emb) / (np.linalg.norm(e) * np.linalg.norm(ref_emb)))


def score(x: np.ndarray, sr: int, text: str) -> tuple[float, dict]:
    """Expressiveness (pitch range in semitones, 10th→90th percentile) minus glitch penalties."""
    dur = len(x) / sr
    expect = max(len(re.sub(r"[^A-Za-z0-9$]", "", text)) / 14.5, 0.3)
    f0 = pitch_track(x, sr)
    v = f0[f0 > 0]
    if len(v) < 8:
        return -99.0, {"dur": round(dur, 2)}
    st = 12 * np.log2(v / np.median(v))
    rng = float(np.percentile(st, 90) - np.percentile(st, 10))
    ratio = dur / expect
    m = voiced_mask(envelope(x, sr))
    gap, run = 0, 0
    for on in m:
        run = 0 if on else run + 1
        gap = max(gap, run)
    pen = max(0.0, ratio - 1.6) * 6 + max(0.0, 0.55 - ratio) * 6 + max(0.0, gap * 0.01 - 0.7) * 5
    return rng - pen, {"pitch_range_st": round(rng, 1), "median_hz": round(float(np.median(v))), "len_ratio": round(ratio, 2)}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--ref", default=None)
    ap.add_argument("--takes", type=int, default=None)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--more", type=float, default=None)
    a = ap.parse_args()

    reg = json.loads(REG.read_text())
    styles = reg["expressive"]
    sig = reg.get("signature", {})  # the approved, locked Mr. Pop voice — defaults for every render
    a.ref = a.ref or sig.get("ref", "mr-pop")
    a.takes = a.takes if a.takes is not None else sig.get("takes", 3)
    a.seed = a.seed if a.seed is not None else sig.get("seed", 7)
    a.more = a.more if a.more is not None else sig.get("more", 0.0)
    ref = Path(a.ref) if a.ref.endswith(".wav") else REG.parent / a.ref / "reference.wav"
    if not ref.exists():
        ref = ref.with_name("sample.wav")
    if not ref.exists():
        raise SystemExit(f"reference not found: {ref}")
    if sig.get("ref_sha256_16") and ref.name == "reference.wav":
        import hashlib

        if hashlib.sha256(ref.read_bytes()).hexdigest()[:16] != sig["ref_sha256_16"]:
            print("⚠ reference.wav differs from the approved signature — Mr. Pop will sound different.", flush=True)
    print(f"Mr. Pop signature · ref {ref.parent.name} · seed {a.seed} · takes {a.takes} · more {a.more:+.2f}", flush=True)

    dev = device()
    model = load_model(dev)
    sr = model.sr
    rx, rsr = sf.read(ref)
    ref_emb = speaker_sim(model, rx if rx.ndim == 1 else rx.mean(1), rsr, None)
    lead = styles.get("_lead_in", 0.3)
    parts, beats, t = [np.zeros(int(lead * sr))], [], lead

    for i, (sid, text) in enumerate(parse(a.script)):
        st = styles[sid]
        # Per-emotion reference: same voice, but this emotion's line comes first, so Chatterbox copies its delivery.
        eref = ref.parent / "emotions" / f"{st['emotion']}.wav" if st.get("emotion") and ref.name == "reference.wav" else None
        prompt = eref if eref is not None and eref.exists() else ref
        best = None
        for k in range(max(a.takes, 1)):
            torch.manual_seed(a.seed + i * 101 + k)
            wav = model.generate(
                text,
                audio_prompt_path=str(prompt),
                exaggeration=float(np.clip(st["exaggeration"] + a.more, 0.25, 1.2)),
                cfg_weight=st["cfg"],
                temperature=st.get("temperature", 0.8),
            )
            cand = trim(wav.squeeze(0).detach().cpu().numpy().astype(np.float64), sr=sr)
            sc, info = score(cand, sr, text)
            # Stay on the reference voice: takes that drift from its timbre sound like "a different / older Mr. Pop".
            sim = speaker_sim(model, cand, sr, ref_emb)
            info["similarity"] = round(sim, 3)
            sc += SIM_WEIGHT * (sim - 0.95)
            if best is None or sc > best[0]:
                best = (sc, info, cand, k)
        sc, info, x, k = best
        x *= 10 ** (st.get("gain_db", 0) / 20)
        dur = len(x) / sr
        info["prompt"] = prompt.stem if prompt != ref else "reference"
        beats.append({"style": sid, "text": text, "start": round(t, 3), "end": round(t + dur, 3), "take": k, "score": round(sc, 2), **info})
        parts += [x, np.zeros(int(st.get("pause", 0.25) * sr))]
        t += dur + st.get("pause", 0.25)
        print(f"  {sid:<8} {dur:5.2f}s  take {k + 1}/{a.takes}  pitch range {info.get('pitch_range_st', '?')} st  {text}", flush=True)

    audio = finish(np.concatenate(parts))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(a.out, audio.astype(np.float32), sr, subtype="PCM_16")
    meta = {
        "engine": "chatterbox",
        "ref": str(ref.relative_to(ROOT)) if ref.is_relative_to(ROOT) else str(ref),
        "seed": a.seed,
        "more": a.more,
        "duration": round(len(audio) / sr, 3),
        "lufs": round(lufs(audio), 1),
        "beats": beats,
    }
    a.out.with_suffix(".beats.json").write_text(json.dumps(meta, indent=2))
    track = build_track(audio, sr, beats, styles)
    a.out.with_suffix(".face.json").write_text(json.dumps(track, separators=(",", ":")))
    print(f"✓ {meta['duration']}s · {meta['lufs']} LUFS · {a.out}")


if __name__ == "__main__":
    main()
