"""Shared voice finishing for every engine (numpy + soundfile only, so any venv can import it).

finish(x): de-mud + presence EQ, gentle compression, -14 LUFS, -1 dBFS peak.   lufs(x): BS.1770 integrated loudness.
"""
import numpy as np

SR = 24000


def trim(x: np.ndarray, floor_db: float = -45, pad: float = 0.04, sr: int = SR) -> np.ndarray:
    win = int(0.01 * sr)
    env = np.sqrt(np.convolve(x**2, np.ones(win) / win, mode="same") + 1e-12)
    on = np.where(20 * np.log10(env) > floor_db)[0]
    if not len(on):
        return x
    a, b = max(on[0] - int(pad * sr), 0), min(on[-1] + int(pad * sr), len(x))
    return x[a:b]


# ── finishing (numpy only) ───────────────────────────────────────────────────
def biquad_resp(f: np.ndarray, kind: str, fc: float, gain_db: float = 0.0, q: float = 0.707, sr: int = SR) -> np.ndarray:
    """|H(f)| of an RBJ-cookbook biquad, evaluated on a frequency grid (used as a zero-phase FFT EQ)."""
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * fc / sr
    cw, sw = np.cos(w0), np.sin(w0)
    al = sw / (2 * q)
    if kind == "peak":
        b = [1 + al * A, -2 * cw, 1 - al * A]
        a = [1 + al / A, -2 * cw, 1 - al / A]
    elif kind == "highshelf":
        s = 2 * np.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * cw + s), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - s)]
        a = [(A + 1) - (A - 1) * cw + s, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - s]
    elif kind == "highpass":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + al, -2 * cw, 1 - al]
    else:
        raise ValueError(kind)
    z = np.exp(-1j * 2 * np.pi * f / sr)
    return np.abs((b[0] + b[1] * z + b[2] * z**2) / (a[0] + a[1] * z + a[2] * z**2))


def eq(x: np.ndarray, bands: list[tuple]) -> np.ndarray:
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    for band in bands:
        g *= biquad_resp(f, *band)
    return np.fft.irfft(X * g, n)


def compress(x: np.ndarray, thr_db=-22.0, ratio=2.6, attack=0.006, release=0.12) -> np.ndarray:
    """Feed-forward RMS compressor — evens out loud hooks vs. quiet asides so every word lands."""
    win = int(0.005 * SR)
    lvl = 10 * np.log10(np.convolve(x**2, np.ones(win) / win, mode="same") + 1e-12)
    over = np.maximum(lvl - thr_db, 0)
    target = -over * (1 - 1 / ratio)
    # smooth gain (attack when reducing, release when recovering), decimated for speed
    hop = 48
    t = target[::hop]
    ga, gr = np.exp(-hop / (attack * SR)), np.exp(-hop / (release * SR))
    out = np.empty_like(t)
    g = 0.0
    for i, v in enumerate(t):
        c = ga if v < g else gr
        g = c * g + (1 - c) * v
        out[i] = g
    gain = np.interp(np.arange(len(x)), np.arange(len(t)) * hop, out)
    return x * 10 ** (gain / 20)


def lufs(x: np.ndarray) -> float:
    """Integrated loudness (ITU-R BS.1770 K-weighting + gating)."""
    f = np.fft.rfftfreq(len(x), 1 / SR)
    k = biquad_resp(f, "highshelf", 1681.97, 4.0, 0.7071) * biquad_resp(f, "highpass", 38.14, q=0.5003)
    y = np.fft.irfft(np.fft.rfft(x) * k, len(x))
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = np.array([np.mean(y[i : i + blk] ** 2) for i in range(0, max(len(y) - blk, 1), hop)])
    l = -0.691 + 10 * np.log10(ms + 1e-12)
    ms = ms[l > -70]
    rel = -0.691 + 10 * np.log10(np.mean(ms) + 1e-12) - 10
    ms = ms[-0.691 + 10 * np.log10(ms + 1e-12) > rel]
    return -0.691 + 10 * np.log10(np.mean(ms) + 1e-12)


def limit(x: np.ndarray, ceiling_db=-1.0) -> np.ndarray:
    c = 10 ** (ceiling_db / 20)
    peak = np.abs(x)
    win = int(0.004 * SR)
    need = np.maximum(peak / c, 1.0)
    need = np.maximum.reduce([np.roll(need, s) for s in range(-win, win + 1, 8)])  # crude lookahead hold
    sm = np.convolve(need, np.hanning(2 * win) / np.hanning(2 * win).sum(), mode="same")
    return np.clip(x / np.maximum(sm, need), -c, c)


def finish(x: np.ndarray, target=-14.0) -> np.ndarray:
    x = eq(
        x,
        [
            ("highpass", 75, 0, 0.707),  # rumble
            ("peak", 320, -2.0, 1.0),  # boxiness / mud
            ("peak", 3200, 3.0, 0.9),  # presence: words cut through music on a phone speaker
            ("highshelf", 9000, 2.0, 0.707),  # air / sparkle
        ],
    )
    x = compress(x)
    x *= 10 ** ((target - lufs(x)) / 20)
    return limit(x)
