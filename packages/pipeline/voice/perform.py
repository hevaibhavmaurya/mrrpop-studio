"""Mr. Pop delivery engine — turns a tagged script into an energetic, curious, trustworthy voiceover.

  packages/pipeline/.venv/bin/python packages/pipeline/voice/perform.py <script.vo.txt> <out.wav> [--voice mr-pop]

Kokoro has no emotion control, so "performance" comes from how each beat is spoken:
  • a delivery style per line (pace, pause after, a small timbre tilt) — see "delivery" in voices/custom/voices.json
  • emphasis words with Kokoro/misaki stress markup:  [Chrome](+2)   (de-stress: [the](-1))
  • punctuation: "!" lifts, "?" rises, "…" makes a beat
  • finishing: de-mud + presence EQ, gentle compression, −14 LUFS, −1 dBFS peak

Script format (one beat per line; blank lines and # comments ignored):
  {hook}    $12,400 a month… from a [Chrome](+2) extension!
  {curious} So how does one developer pull that off?
  {trust}   He posted the number himself — founder-reported, not verified.
  {cta}     Follow MRR Pop!

Writes <out.wav> (24 kHz mono, 16-bit) and <out>.beats.json (start/end per beat, for captions + scene timing).
"""
import argparse
import json
import re
from pathlib import Path

import numpy as np
import soundfile as sf
import torch

from finish import finish, lufs, trim
from kokoro_blend import REG, SR, pipe, registry, voice_tensor

TAG = re.compile(r"^\{(\w+)\}\s*")


# ── voice ────────────────────────────────────────────────────────────────────
def styled_voice(base: dict, style: dict) -> torch.Tensor:
    """Base voice nudged toward a few Kokoro base voices (≤ 25%) so it stays recognisably Mr. Pop."""
    t = voice_tensor(base)
    tilt = style.get("tilt") or {}
    amt = min(sum(tilt.values()), 0.25)
    if not amt:
        return t
    p = pipe(base["lang"])
    total = sum(tilt.values())
    extra = sum(p.load_voice(n) * (w / total) for n, w in tilt.items())
    return t * (1 - amt) + extra * amt


def speak(base: dict, style: dict, text: str) -> np.ndarray:
    p = pipe(base["lang"])
    v = styled_voice(base, style)
    speed = base["speed"] * style.get("pace", 1.0)
    chunks = [a.numpy() if hasattr(a, "numpy") else np.asarray(a) for _, _, a in p(text, voice=v, speed=speed)]
    return np.concatenate(chunks).astype(np.float64)


# ── main ─────────────────────────────────────────────────────────────────────
def parse(path: Path, default: str) -> list[tuple[str, str]]:
    beats = []
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = TAG.match(line)
        style = m.group(1) if m else default
        beats.append((style, TAG.sub("", line)))
    return beats


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--voice", default=None)
    ap.add_argument("--raw", action="store_true", help="skip EQ/compression/loudness")
    a = ap.parse_args()

    reg = registry()
    styles = reg["delivery"]
    base = {v["id"]: v for v in reg["voices"]}[a.voice or reg["default"]]
    lead = styles.get("_lead_in", 0.3)

    parts, beats, t = [np.zeros(int(lead * SR))], [], lead
    for style_id, text in parse(a.script, "fun"):
        st = styles[style_id]
        x = trim(speak(base, st, text))
        x *= 10 ** (st.get("gain_db", 0) / 20)
        dur = len(x) / SR
        spoken = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
        beats.append({"style": style_id, "text": spoken, "start": round(t, 3), "end": round(t + dur, 3)})
        parts += [x, np.zeros(int(st.get("pause", 0.25) * SR))]
        t += dur + st.get("pause", 0.25)
        print(f"  {style_id:<8} {dur:5.2f}s  {spoken}")

    audio = np.concatenate(parts)
    if not a.raw:
        audio = finish(audio)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(a.out, audio.astype(np.float32), SR, subtype="PCM_16")
    meta = {"voice": base["id"], "duration": round(len(audio) / SR, 3), "lufs": round(lufs(audio), 1), "beats": beats}
    a.out.with_suffix(".beats.json").write_text(json.dumps(meta, indent=2))
    print(f"✓ {meta['duration']}s · {meta['lufs']} LUFS · {a.out}")


if __name__ == "__main__":
    main()
