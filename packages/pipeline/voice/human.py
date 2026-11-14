"""Mr. Pop with a REAL human timbre — Vaibhav's own voice (his recording, his consent), Mr. Pop's delivery.

Chatterbox VC (Resemble AI, MIT) re-voices audio: it keeps the words, timing and most of the melody of the
source and swaps only the timbre for the target speaker's. We use it two ways:

  ref      cut a clean timbre clip from a long recording (picks the stretch most like the speaker overall)
             human.py ref <recording> <voice_dir> [--start S --len 10]
  build    re-voice a voice's reference.wav + emotions/*.wav into the new timbre, so expressive.py can perform
           natively in it with the SAME per-emotion delivery as the source voice
             human.py build <src_voice_dir> <dst_voice_dir>
  convert  re-voice a finished Mr. Pop voiceover (keeps its .beats.json timing, rebuilds .face.json)
             human.py convert <in.wav> <out.wav> --voice <dst_voice_dir>

Engine sample rate is 24 kHz (Chatterbox's native rate, ~12 kHz of audio bandwidth). Files are finished with the
shared finish() chain to -14 LUFS / -1 dBFS and written as 24-bit PCM. Chatterbox watermarks every file (PerTh).
"""
import argparse
import json
import shutil
import sys
import warnings
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch

sys.path.insert(0, str(Path(__file__).parent))
from finish import finish, lufs, trim  # noqa: E402

warnings.filterwarnings("ignore")
ROOT = Path(__file__).resolve().parents[3]
REG = ROOT / "voices" / "custom" / "voices.json"
SR = 24000
REF_NAME = "timbre.wav"  # the clean human clip inside the voice dir


def device() -> str:
    return "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")


def load_vc(dev: str):
    from chatterbox.vc import ChatterboxVC

    _load = torch.load
    torch.load = lambda *a, **k: _load(*a, **{**k, "map_location": torch.device("cpu" if dev == "mps" else dev)})
    try:
        return ChatterboxVC.from_pretrained(dev)
    finally:
        torch.load = _load


def load_ve():
    from chatterbox.models.voice_encoder import VoiceEncoder
    from huggingface_hub import hf_hub_download
    from safetensors.torch import load_file

    ve = VoiceEncoder()
    ve.load_state_dict(load_file(hf_hub_download("ResembleAI/chatterbox", "ve.safetensors")))
    return ve.eval()


def embed(ve, x: np.ndarray, sr: int = SR) -> np.ndarray:
    e = ve.embeds_from_wavs([librosa.resample(x.astype(np.float32), orig_sr=sr, target_sr=16000)], sample_rate=16000, as_spk=True)
    return e / np.linalg.norm(e)


def norm(x: np.ndarray, target=-20.0) -> np.ndarray:
    return x * 10 ** ((target - lufs(x)) / 20)


# ── ref ──────────────────────────────────────────────────────────────────────
def cmd_ref(a) -> None:
    y, _ = librosa.load(a.recording, sr=SR, mono=True)
    y = y.astype(np.float64)
    L = int(a.len * SR)
    if a.start is None:
        ve = load_ve()
        hop, win = int(1.5 * SR), int(3 * SR)
        starts = list(range(0, len(y) - win, hop))
        E = np.array([embed(ve, y[s : s + win]) for s in starts])
        c = E.mean(0)
        c /= np.linalg.norm(c)
        sims = E @ c
        fr = librosa.feature.rms(y=y.astype(np.float32), frame_length=480, hop_length=240)[0]
        best = None
        for j, s in enumerate(starts):
            k = [i for i, t in enumerate(starts) if s <= t <= s + L - win]
            if s + L > len(y) or len(k) < 3:
                continue
            seg_fr = fr[s // 240 : (s + L) // 240]
            speech = float(np.mean(20 * np.log10(seg_fr + 1e-9) > -45))
            score = float(np.mean(sims[k])) + 0.05 * speech  # most typical timbre, mostly talking
            if best is None or score > best[0]:
                best = (score, s)
        a.start = best[1] / SR
        print(f"  picked {a.start:.1f}s → {a.start + a.len:.1f}s (score {best[0]:.3f})")
    s = int(a.start * SR)
    # snap both ends to silences so no word is cut
    iv = librosa.effects.split(y[s : s + L + SR].astype(np.float32), top_db=35)
    a0, b0 = int(iv[0][0]), int(max(e for _, e in iv if e <= L) if any(e <= L for _, e in iv) else L)
    clip = y[s + max(a0 - int(0.05 * SR), 0) : s + b0 + int(0.05 * SR)]
    clip = norm(clip)
    out = Path(a.voice_dir) / REF_NAME
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, clip.astype(np.float32), SR, subtype="PCM_24")
    print(f"✓ {len(clip) / SR:.1f}s timbre clip → {out}")


# ── shared VC ────────────────────────────────────────────────────────────────
def revoice(vc, path: Path) -> np.ndarray:
    return vc.generate(str(path)).squeeze(0).numpy().astype(np.float64)


def cmd_build(a) -> None:
    src, dst = Path(a.src), Path(a.dst)
    target = dst / REF_NAME
    dev = device()
    vc = load_vc(dev)
    vc.set_target_voice(str(target))
    ve = load_ve()
    t_emb = embed(ve, sf.read(target)[0])
    (dst / "emotions").mkdir(parents=True, exist_ok=True)
    jobs = [(src / "reference.wav", dst / "reference.wav")]
    jobs += [(p, dst / "emotions" / p.name) for p in sorted((src / "emotions").glob("*.wav"))]
    for i, o in jobs:
        x = norm(revoice(vc, i))
        sf.write(o, x.astype(np.float32), SR, subtype="PCM_24")
        sim = float(embed(ve, x) @ t_emb)
        print(f"  {o.relative_to(dst)!s:<22} {len(x) / SR:5.1f}s  similarity to target {sim:.3f}")
    for f in ("reference.vo.txt",):
        if (src / f).exists():
            shutil.copy(src / f, dst / f)
    print(f"✓ built {dst}")


def cmd_convert(a) -> None:
    from lipsync import build_track

    vdir = Path(a.voice)
    dev = device()
    vc = load_vc(dev)
    vc.set_target_voice(str(vdir / REF_NAME))
    x = finish(revoice(vc, Path(a.inp)))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(a.out, x.astype(np.float32), SR, subtype="PCM_24")
    bj = Path(a.inp).with_suffix(".beats.json")
    if bj.exists():
        meta = json.loads(bj.read_text())
        scale = (len(x) / SR) / meta["duration"]  # VC keeps timing to within a few frames; rescale to be exact
        for b in meta["beats"]:
            b["start"], b["end"] = round(b["start"] * scale, 3), round(b["end"] * scale, 3)
        meta.update(duration=round(len(x) / SR, 3), lufs=round(lufs(x), 1), timbre=str((vdir / REF_NAME).relative_to(ROOT)), converted_from=str(a.inp))
        a.out.with_suffix(".beats.json").write_text(json.dumps(meta, indent=2))
        styles = json.loads(REG.read_text())["expressive"]
        a.out.with_suffix(".face.json").write_text(json.dumps(build_track(x, SR, meta["beats"], styles), separators=(",", ":")))
    print(f"✓ {len(x) / SR:.2f}s · {lufs(x):.1f} LUFS · {a.out}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    r = sp.add_parser("ref")
    r.add_argument("recording")
    r.add_argument("voice_dir")
    r.add_argument("--start", type=float, default=None)
    r.add_argument("--len", type=float, default=10.0)
    b = sp.add_parser("build")
    b.add_argument("src")
    b.add_argument("dst")
    c = sp.add_parser("convert")
    c.add_argument("inp", type=Path)
    c.add_argument("out", type=Path)
    c.add_argument("--voice", required=True)
    a = ap.parse_args()
    {"ref": cmd_ref, "build": cmd_build, "convert": cmd_convert}[a.cmd](a)


if __name__ == "__main__":
    main()
