"""Audio-driven lip sync + face track for Mr. Pop (numpy only — importable from any venv).

Mouth shapes use the Rhubarb set the character rig already draws (A–H, X):
  1. the beat's text → a viseme sequence (letters → mouth shapes, like textToVisemes in talk.ts)
  2. the beat's real audio → voiced regions (10 ms energy frames); silence is always X
  3. the viseme sequence is laid along the voiced time only, so words land where they are actually spoken
  4. loudness shapes openness: quiet frames close the mouth a step (D→C→B), dips between syllables close it (A/B)
Face: every beat style maps to an expression + pose (voices.json "expressive.<style>.face"), with cue words on top
($ / numbers → money-eyes, "?" → curious at the end, "boom"/"wow" → star-struck, "haha"/"funny" → laughing, "no way"/"wait" → shocked,
"secret"/"trick" → cheeky, "failed"/"shut down" → sad,
last beat → wink). Body motion (knees, sway, laugh curl, hops) comes from these in packages/character/src/motion.ts.

  build_track(audio, sr, beats, styles) → {"fps", "visemes", "expressions", "poses", "energy"}
"""
import re

import numpy as np

FRAME = 0.01  # 10 ms analysis frames
MIN_CUE = 0.045  # shortest mouth shape kept (≈1.4 video frames at 30 fps) — avoids flicker
OPEN_ORDER = {"D": "C", "C": "B", "E": "F", "B": "B", "F": "F", "G": "G", "H": "H", "A": "A"}


def text_visemes(text: str) -> list[tuple[str, float]]:
    """Letters → (viseme, weight). Weight is a relative duration in 'character units'."""
    out: list[tuple[str, float]] = []
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text.lower())
    s = s.replace("$", " dollars ").replace("mrr", "m r r")
    i = 0
    while i < len(s):
        c, two = s[i], s[i : i + 2]
        if two in ("th", "sh", "ch"):
            out.append(("H" if two == "th" else "B", 1.0))
            i += 2
            continue
        if two in ("oo", "ou", "ow"):
            out.append(("F", 1.4))
            i += 2
            continue
        if c in "mbp":
            out.append(("A", 0.9))
        elif c in "fv":
            out.append(("G", 1.0))
        elif c == "l":
            out.append(("H", 0.9))
        elif c == "o":
            out.append(("E", 1.3))
        elif c in "uw":
            out.append(("F", 1.2))
        elif c == "a":
            out.append(("D", 1.3))
        elif c in "ei":
            out.append(("C", 1.15))
        elif c == "y":
            out.append(("C", 0.8))
        elif c.isalnum():
            out.append(("B", 0.85))
        i += 1
    return out


def envelope(x: np.ndarray, sr: int) -> np.ndarray:
    hop = int(FRAME * sr)
    n = len(x) // hop
    fr = x[: n * hop].reshape(n, hop)
    return np.sqrt((fr**2).mean(axis=1) + 1e-12)


def voiced_mask(env: np.ndarray) -> np.ndarray:
    db = 20 * np.log10(env / (env.max() + 1e-12) + 1e-12)
    v = db > -30
    # close tiny gaps (< 60 ms) and drop blips (< 40 ms)
    v = _fill(v, True, 6)
    v = _fill(v, False, 4)
    return v


def _fill(v: np.ndarray, value: bool, max_len: int) -> np.ndarray:
    v = v.copy()
    i = 0
    while i < len(v):
        if v[i] != value:
            j = i
            while j < len(v) and v[j] != value:
                j += 1
            if j - i < max_len and i > 0 and j < len(v):
                v[i:j] = value
            i = j
        else:
            i += 1
    return v


def beat_frames(seg: np.ndarray, sr: int, text: str) -> list[str]:
    env = envelope(seg, sr)
    if not len(env):
        return []
    voiced = voiced_mask(env)
    seq = text_visemes(text)
    frames = ["X"] * len(env)
    vidx = np.where(voiced)[0]
    if not len(vidx) or not seq:
        return frames
    weights = np.array([w for _, w in seq])
    edges = np.concatenate([[0], np.cumsum(weights)]) / weights.sum() * len(vidx)
    for k, (vis, _) in enumerate(seq):
        a, b = int(round(edges[k])), max(int(round(edges[k + 1])), int(round(edges[k])) + 1)
        for f in vidx[a : min(b, len(vidx))]:
            frames[f] = vis
    # loudness → openness
    rel = env / (np.percentile(env[voiced], 90) + 1e-12)
    for f in vidx:
        if rel[f] < 0.18:
            frames[f] = "A" if frames[f] in "AB" else "B"
        elif rel[f] < 0.4:
            frames[f] = OPEN_ORDER.get(frames[f], frames[f])
    return frames


def frames_to_cues(frames: list[str], t0: float = 0.0) -> list[dict]:
    cues: list[dict] = []
    for i, v in enumerate(frames):
        t = round(t0 + i * FRAME, 3)
        if cues and cues[-1]["value"] == v:
            cues[-1]["end"] = round(t + FRAME, 3)
        else:
            cues.append({"start": t, "end": round(t + FRAME, 3), "value": v})
    # merge flicker into the previous shape
    out: list[dict] = []
    for c in cues:
        if out and (c["end"] - c["start"]) < MIN_CUE and c["value"] != "X":
            out[-1]["end"] = c["end"]
        elif out and out[-1]["value"] == c["value"]:
            out[-1]["end"] = c["end"]
        else:
            out.append(dict(c))
    return out


MONEY = re.compile(r"\$|\d|dollar|thousand|hundred|million|bucks|mrr|revenue|paid", re.I)
WOW = re.compile(r"\b(boom|wow|whoa|insane|huge)\b", re.I)
SHOCK = re.compile(r"\b(no way|what\?|can't believe|unbelievable|seriously|wait)\b", re.I)
SLY = re.compile(r"\b(secret|trick|hack|here's how|guess what|plot twist)\b", re.I)
SAD = re.compile(r"\b(shut down|failed|lost|churn(ed)?|broke|sadly)\b", re.I)
LAUGH = re.compile(r"\b(ha(ha)+|ha ha|lol|hilarious|funny|joke|kidding)\b", re.I)


def face_cues(beats: list[dict], styles: dict, total: float) -> tuple[list[dict], list[dict]]:
    exprs, poses = [], []
    for i, b in enumerate(beats):
        face = styles.get(b["style"], {}).get("face", {})
        s, e, text = b["start"], b["end"], b["text"]
        nxt = beats[i + 1]["start"] if i + 1 < len(beats) else total
        expr = face.get("expression", "smile")
        poses.append({"start": s, "end": round(nxt, 3), "value": face.get("pose", "explaining")})
        parts = [(s, e, expr)]
        if b["style"] == "hook" and MONEY.search(text):
            mid = s + (e - s) * 0.45
            parts = [(s, mid, "shocked"), (mid, e, "money-eyes")]
        elif MONEY.search(text) and b["style"] == "trust":
            parts = [(s, e, "serious")]
        if WOW.search(text):
            parts = [(s, e, "star-struck")]
        if SHOCK.search(text) and b["style"] != "trust":
            parts = [(s, min(e, s + 1.4), "shocked")] + ([(s + 1.4, e, parts[-1][2])] if e - s > 1.6 else [])
        if SLY.search(text):
            parts = [(s, e, "cheeky")]
        if SAD.search(text):
            parts = [(s, e, "sad")]
        if LAUGH.search(text):
            parts = [(s, e, "laughing")]  # body motion bends + bounces on laughing
        if text.rstrip().endswith("?") and e - s > 0.5:
            last = parts[-1]
            parts[-1] = (last[0], e - 0.6, last[2])
            parts.append((e - 0.6, e, "curious"))
        if i == len(beats) - 1:
            parts.append((e, total, "wink"))
        # hold the expression through the pause that follows
        a, b2, v = parts[-1]
        parts[-1] = (a, max(b2, nxt if i + 1 < len(beats) else b2), v)
        exprs += [{"start": round(a, 3), "end": round(b2, 3), "value": v} for a, b2, v in parts if b2 > a]
    return exprs, poses


def build_track(audio: np.ndarray, sr: int, beats: list[dict], styles: dict, fps: int = 30) -> dict:
    total = len(audio) / sr
    frames = ["X"] * int(np.ceil(total / FRAME))
    for b in beats:
        a, z = int(b["start"] * sr), int(b["end"] * sr)
        bf = beat_frames(audio[a:z], sr, b["text"])
        o = int(round(b["start"] / FRAME))
        frames[o : o + len(bf)] = bf
    frames = frames[: int(np.ceil(total / FRAME))]
    hop = sr // fps
    env = envelope(audio, sr)
    env_fps = np.interp(np.arange(0, total, 1 / fps), np.arange(len(env)) * FRAME, env)
    env_fps = np.clip(env_fps / (np.percentile(env_fps, 95) + 1e-12), 0, 1)
    exprs, poses = face_cues(beats, styles, total)
    _ = hop
    return {
        "fps": fps,
        "duration": round(total, 3),
        "visemes": frames_to_cues(frames),
        "expressions": exprs,
        "poses": poses,
        "energy": [round(float(v), 2) for v in env_fps],
    }


def pitch_track(x: np.ndarray, sr: int, fmin=70.0, fmax=420.0) -> np.ndarray:
    """Autocorrelation F0 per 10 ms frame (Hz, 0 = unvoiced). Used to score takes for expressiveness."""
    win, hop = int(0.04 * sr), int(FRAME * sr)
    lo, hi = int(sr / fmax), int(sr / fmin)
    env = envelope(x, sr)
    gate = env.max() * 0.08
    f0 = np.zeros(max((len(x) - win) // hop, 0))
    for i in range(len(f0)):
        fr = x[i * hop : i * hop + win]
        if i < len(env) and env[i] < gate:
            continue
        fr = fr - fr.mean()
        ac = np.correlate(fr, fr, "full")[win - 1 :]
        if ac[0] <= 0:
            continue
        seg = ac[lo:hi]
        k = int(np.argmax(seg))
        if seg[k] / ac[0] > 0.45:
            f0[i] = sr / (lo + k)
    return f0


if __name__ == "__main__":
    # Rebuild <voice>.face.json from <voice>.wav + <voice>.beats.json (no re-recording) — after changing cue rules:
    #   python3 packages/pipeline/voice/lipsync.py content/stories/<slug>/voice/signature/mr-pop.wav
    import json
    import sys
    from pathlib import Path

    import soundfile as sf

    styles = json.loads((Path(__file__).resolve().parents[3] / "voices/custom/voices.json").read_text())["expressive"]
    for arg in sys.argv[1:]:
        wav = Path(arg)
        audio, sr = sf.read(wav, dtype="float64")
        beats = json.loads(wav.with_suffix(".beats.json").read_text())["beats"]
        track = build_track(audio if audio.ndim == 1 else audio.mean(axis=1), sr, beats, styles)
        wav.with_suffix(".face.json").write_text(json.dumps(track, separators=(",", ":")))
        print("✓", wav.with_suffix(".face.json"), "·", sorted({c["value"] for c in track["expressions"]}))
