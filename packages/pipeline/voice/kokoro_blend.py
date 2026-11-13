"""MRR Pop custom voices — blends Kokoro-82M base voice embeddings into named voices.

  packages/pipeline/.venv/bin/python packages/pipeline/voice/kokoro_blend.py build         # build all voices + samples
  packages/pipeline/.venv/bin/python packages/pipeline/voice/kokoro_blend.py say mr-pop out.wav "Text…"

Registry: voices/custom/voices.json. Each voice is saved as voices/custom/<id>/voice.pt (the blended
style tensor) so it sounds identical every time, plus sample.wav.
"""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from kokoro import KPipeline

ROOT = Path(__file__).resolve().parents[3]
REG = ROOT / "voices" / "custom" / "voices.json"
SR = 24000
_pipes: dict[str, KPipeline] = {}


def pipe(lang: str) -> KPipeline:
    if lang not in _pipes:
        _pipes[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
    return _pipes[lang]


def registry() -> dict:
    return json.loads(REG.read_text())


def blend(v: dict) -> torch.Tensor:
    p = pipe(v["lang"])
    total = sum(v["blend"].values())
    return sum(p.load_voice(name) * (w / total) for name, w in v["blend"].items())


def voice_tensor(v: dict) -> torch.Tensor:
    path = REG.parent / v["id"] / "voice.pt"
    if path.exists():
        return torch.load(path, weights_only=True)
    t = blend(v)
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.save(t, path)
    return t


def say(v: dict, text: str, out: Path, speed: float | None = None) -> float:
    p = pipe(v["lang"])
    chunks = [a.numpy() if hasattr(a, "numpy") else a for _, _, a in p(text, voice=voice_tensor(v), speed=speed or v["speed"])]
    audio = np.concatenate(chunks)
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, audio, SR)
    return len(audio) / SR


def main() -> None:
    reg = registry()
    by_id = {v["id"]: v for v in reg["voices"]}
    cmd = sys.argv[1] if len(sys.argv) > 1 else "build"
    if cmd == "build":
        only = set(sys.argv[2:])
        for v in reg["voices"]:
            if only and v["id"] not in only:
                continue
            (REG.parent / v["id"] / "voice.pt").unlink(missing_ok=True)  # rebuild blend from registry
            secs = say(v, reg["sample"], REG.parent / v["id"] / "sample.wav")
            print(f"✓ {v['name']:<12} {v['id']:<11} {secs:4.1f}s  {v['blend']}")
    elif cmd == "say":
        vid, out, text = sys.argv[2], Path(sys.argv[3]), " ".join(sys.argv[4:])
        print(f"{say(by_id[vid], text, out):.2f}s → {out}")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
