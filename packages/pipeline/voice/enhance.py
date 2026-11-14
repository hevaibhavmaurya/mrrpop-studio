"""Studio-mic finishing for Mr. Pop voiceovers: denoise / de-codec, rebuild the missing highs to 48 kHz, then a
smooth studio vocal chain. Runs in its own venv (ClearerVoice-Studio, Apache-2.0, models from alibabasglab on HF):

  packages/pipeline/.venv-enhance/bin/python packages/pipeline/voice/enhance.py <in> <out.wav> [--clean] [--no-sr] [--no-master]

  --clean      MossFormer2_SE_48K first: removes noise, room and codec grit (use on recordings, e.g. a reference)
  (default)    MossFormer2_SR_48K: bandwidth extension 24 kHz → 48 kHz (Chatterbox stops at 12 kHz; a studio mic
               records to ~20 kHz — that missing top end is most of the "cheap mic" sound)
  --like F     match tone + dynamics to reference recording F instead of the studio-mic target (F is only measured)
  --no-match   skip the studio-mic spectrum match (see TARGET)
  --no-master  skip the vocal chain (for references: keep them natural, just clean)

Studio match: average speech spectrum EQ'd onto a flat studio condenser + male LTASS target (see TARGET).
Vocal chain (48 kHz): high-pass 80 Hz · de-esser 5–9 kHz · slow 2:1 compression · -14 LUFS · -1 dBFS peak. Writes 48 kHz 24-bit.
"""
import argparse
import os
import sys
import tempfile
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from scipy.signal import sosfiltfilt, butter

SR = 48000
CACHE = Path(__file__).resolve().parents[1] / ".cache-clearvoice"  # model checkpoints (downloaded once)


def env_db(x, win_s, sr=SR):
    w = max(int(win_s * sr), 1)
    return 10 * np.log10(np.convolve(x**2, np.ones(w) / w, mode="same") + 1e-12)


def smooth_gain(target_db, attack, release, sr=SR, hop=48):
    t = target_db[::hop]
    ga, gr = np.exp(-hop / (attack * sr)), np.exp(-hop / (release * sr))
    out, g = np.empty_like(t), 0.0
    for i, v in enumerate(t):
        c = ga if v < g else gr
        g = c * g + (1 - c) * v
        out[i] = g
    return np.interp(np.arange(len(target_db)), np.arange(len(t)) * hop, out)


# ── studio mic target ────────────────────────────────────────────────────────
# Long-term average speech spectrum of a male voice (Byrne et al. 1994, 1/3-octave, dB) = what a FLAT, high-end
# studio condenser hears from a close, well-placed male talker. On top: the classic large-diaphragm studio
# condenser character (U87-class): +1.5 dB proximity warmth around 120–200 Hz and a broad +2 dB presence/air
# lift around 8–12 kHz. Matching our voice's average spectrum to this removes the "cheap mic" colour
# (thin lows, honky mids, dull top) without touching the performance.
BANDS = [80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000]
LTASS = [43.5, 54.4, 57.7, 56.8, 58.2, 59.8, 60.1, 59.2, 58.2, 55.5, 52.6, 50.4, 48.4, 47.4, 46.6, 45.5, 45.3, 43.4, 42.6, 41.1, 40.6, 39.9, 39.4, 37.4]
MIC = {125: 1.0, 160: 1.5, 200: 1.0, 6300: 0.8, 8000: 1.6, 10000: 2.0, 12500: 2.0, 16000: 1.2}
TARGET = np.array([v + MIC.get(f, 0.0) for f, v in zip(BANDS, LTASS)])


def band_levels(x: np.ndarray, sr=SR) -> np.ndarray:
    S = np.abs(librosa.stft(x.astype(np.float32), n_fft=4096, hop_length=1024)) ** 2
    e = S.sum(0)
    S = S[:, e > e.max() * 10 ** (-35 / 10)]  # speech frames only
    f = librosa.fft_frequencies(sr=sr, n_fft=4096)
    p = S.mean(1)
    return np.array([10 * np.log10(p[(f >= fc / 2**(1/6)) & (f < fc * 2**(1/6))].sum() + 1e-12) for fc in BANDS])


def match(x: np.ndarray, top_hz: float, sr=SR, max_db=12.0, passes=3, target=None) -> tuple[np.ndarray, list]:
    """Zero-phase EQ that moves x's average speech spectrum onto TARGET (normalised at 1 kHz), up to top_hz.
    Iterative (each pass re-measures), total correction capped at ±max_db per band so nothing gets silly."""
    k = BANDS.index(1000)
    T = TARGET if target is None else target
    live = (np.array(BANDS) <= top_hz) & np.isfinite(T)
    T = np.nan_to_num(T)
    total = np.zeros(len(BANDS))
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / sr)
    X = np.fft.rfft(x)
    y = x
    for _ in range(passes):
        cur = band_levels(y, sr)
        diff = (T - T[k]) - (cur - cur[k])
        diff[~live] = 0.0
        diff = np.convolve(np.pad(diff, 1, mode="edge"), [0.25, 0.5, 0.25], mode="valid")
        diff[~live] = 0.0
        total = np.clip(total + diff, -max_db, max_db)
        g_db = np.interp(np.log2(np.maximum(f, 20)), np.log2(BANDS), total, left=total[0], right=0.0)
        y = np.fft.irfft(X * 10 ** (g_db / 20), n)
    return y, [(b, round(float(d), 1)) for b, d in zip(BANDS, total)]


def master(x: np.ndarray, comp=0.5) -> np.ndarray:
    import pyloudnorm as pyln

    x = sosfiltfilt(butter(2, 80, "highpass", fs=SR, output="sos"), x)
    # de-esser: duck only the 5–9 kHz band when it spikes above its running level
    sib = sosfiltfilt(butter(4, [5000, 9000], "bandpass", fs=SR, output="sos"), x)
    over = np.maximum(env_db(sib, 0.004) - (np.percentile(env_db(sib, 0.004), 90) - 2), 0)
    g = 10 ** (smooth_gain(-over * 0.6, 0.002, 0.06) / 20)
    x = x - sib * (1 - g)
    # slow, gentle compression (smooth, no pumping)
    lvl = env_db(x, 0.01)
    thr = np.percentile(lvl[lvl > lvl.max() - 40], 60)
    x = x * 10 ** (smooth_gain(-np.maximum(lvl - thr, 0) * comp, 0.015, 0.2) / 20)
    meter = pyln.Meter(SR)
    x = x * 10 ** ((-14 - meter.integrated_loudness(x)) / 20)
    # soft peak ceiling at -1 dBFS (4x oversampled check)
    c = 10 ** (-1 / 20)
    pk = np.abs(librosa.resample(x, orig_sr=SR, target_sr=SR * 4)).max()
    if pk > c:
        over = np.maximum(np.abs(x) / c, 1)
        hold = np.maximum.reduce([np.roll(over, s) for s in range(-96, 97, 8)])
        x = x / np.maximum(np.convolve(hold, np.hanning(193) / np.hanning(193).sum(), mode="same"), 1)
        x = x * min(1.0, c / (np.abs(librosa.resample(x, orig_sr=SR, target_sr=SR * 4)).max() + 1e-9))
    return x


def run_model(task, name, path: Path) -> np.ndarray:
    from clearvoice import ClearVoice

    CACHE.mkdir(exist_ok=True)
    cwd = os.getcwd()
    os.chdir(CACHE)  # ClearVoice downloads checkpoints into ./checkpoints
    try:
        cv = ClearVoice(task=task, model_names=[name])
        out = cv(input_path=str(path), online_write=False)
    finally:
        os.chdir(cwd)
    y = np.asarray(out[0] if isinstance(out, (list, tuple)) else out, dtype=np.float64).squeeze()
    return y


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inp", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--clean", action="store_true")
    ap.add_argument("--no-sr", action="store_true")
    ap.add_argument("--no-master", action="store_true")
    ap.add_argument("--no-match", action="store_true")
    ap.add_argument("--like", type=Path, default=None, help="match the tone + dynamics of this reference recording")
    a = ap.parse_args()

    y, _ = librosa.load(a.inp, sr=SR, mono=True)
    with tempfile.TemporaryDirectory() as td:
        cur = Path(td) / "in.wav"
        sf.write(cur, y, SR, subtype="PCM_16")
        if a.clean:
            y = run_model("speech_enhancement", "MossFormer2_SE_48K", cur)
            sf.write(cur, y, SR, subtype="PCM_16")
            print("  cleaned (MossFormer2_SE_48K)", flush=True)
        if not a.no_sr:
            # ClearVoice's >20 s path breaks on Apple MPS, so upscale in ≤18 s pieces cut at the quietest moment.
            pieces, rest = [], y
            while len(rest) > 18 * SR:
                e = env_db(rest[12 * SR : 18 * SR], 0.05)
                cut = 12 * SR + int(np.argmin(e))
                pieces.append(rest[:cut])
                rest = rest[cut:]
            pieces.append(rest)
            outs = []
            for i, p in enumerate(pieces):
                pc = Path(td) / f"p{i}.wav"
                sf.write(pc, p, SR, subtype="PCM_16")
                o = run_model("speech_super_resolution", "MossFormer2_SR_48K", pc)
                outs.append(o[: len(p)] if len(o) >= len(p) else np.pad(o, (0, len(p) - len(o))))
            y = np.concatenate(outs)
            print("  highs rebuilt to 48 kHz (MossFormer2_SR_48K)", flush=True)
    if not a.no_match:
        src_sr = librosa.get_samplerate(str(a.inp))
        top = 20000 if not a.no_sr else src_sr / 2 * 0.95
        target, comp = None, 0.5
        if a.like:
            ry, _ = librosa.load(a.like, sr=SR, mono=True)
            target = band_levels(ry)
            target[target < target.max() - 60] = np.nan  # bands the reference has nothing in
            top = min(top, librosa.get_samplerate(str(a.like)) / 2 * 0.95)
            crest = lambda v: 20 * np.log10(np.abs(v).max() / np.sqrt(np.mean(v**2)))
            comp = float(np.clip(0.5 - (crest(ry) - 14) * 0.06, 0.15, 0.5))  # airier dynamics → lighter compression
            print(f"  like {a.like.name}: crest {crest(ry):.1f} dB → compression {comp:.2f}", flush=True)
        y, eqc = match(y.astype(np.float64), top, target=target)
        print("  studio match EQ (dB): " + " ".join(f"{b}:{d:+}" for b, d in eqc if d), flush=True)
    if not a.no_master:
        y = master(y.astype(np.float64), comp if not a.no_match else 0.5)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(a.out, y.astype(np.float32), SR, subtype="PCM_24")
    print(f"✓ {len(y) / SR:.2f}s · 48 kHz 24-bit · {a.out}")


if __name__ == "__main__":
    sys.exit(main())
