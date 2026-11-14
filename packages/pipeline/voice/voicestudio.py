"""Voice a tagged script with a VoiceStudio (OmniVoice, local) voice profile through its MCP endpoint.

  python3 packages/pipeline/voice/voicestudio.py <script.vo.txt> <out.wav> --voice V1 [--steps 32] [--speed 1.0]

One generate_speech call per line (so lip sync gets per-line beats), the same pauses/gain per {tag} as
expressive.py (voices/custom/voices.json → expressive), finished to -14 LUFS. Writes <out>.beats.json; run
lipsync.py on it afterwards for <out>.face.json. Server: VOICESTUDIO_MCP (default http://localhost:3900/mcp/).
"""
import argparse
import base64
import io
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).parent))
from finish import finish, lufs, trim  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
REG = ROOT / "voices" / "custom" / "voices.json"
URL = os.environ.get("VOICESTUDIO_MCP", "http://localhost:3900/mcp/")
TAG = re.compile(r"^\{(\w+)\}\s*")
SR = 24000


class MCP:
    def __init__(self):
        self.sid, self.n = None, 0
        r = self.rpc("initialize", {"protocolVersion": "2025-03-26", "capabilities": {}, "clientInfo": {"name": "mrrpop-pipeline", "version": "1"}})
        self.rpc("notifications/initialized", None, notify=True)
        self.info = r

    def rpc(self, method, params, notify=False):
        body = {"jsonrpc": "2.0", "method": method}
        if params is not None:
            body["params"] = params
        if not notify:
            self.n += 1
            body["id"] = self.n
        h = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream", "X-OmniVoice-Client-Id": "claude-code"}
        if self.sid:
            h["mcp-session-id"] = self.sid
        req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers=h)
        with urllib.request.urlopen(req, timeout=900) as res:
            self.sid = res.headers.get("mcp-session-id") or self.sid
            raw = res.read().decode()
        if notify:
            return None
        data = [l[6:] for l in raw.splitlines() if l.startswith("data: ")]
        msg = json.loads(data[-1] if data else raw)
        if "error" in msg:
            raise SystemExit(f"VoiceStudio error: {msg['error']}")
        return msg["result"]

    def tool(self, name, args):
        r = self.rpc("tools/call", {"name": name, "arguments": args})
        if r.get("isError"):
            raise SystemExit(f"{name} failed: {r['content'][0].get('text', r)}")
        return r["content"]


def audio_from(content):
    """generate_speech returns JSON text (maybe with base64 wav or a file path) and/or an audio/resource block."""
    for c in content:
        if c.get("type") == "audio" and c.get("data"):
            return base64.b64decode(c["data"])
        if c.get("type") == "resource" and c.get("resource", {}).get("blob"):
            return base64.b64decode(c["resource"]["blob"])
    for c in content:
        if c.get("type") == "text":
            try:
                j = json.loads(c["text"])
            except Exception:
                continue
            for k in ("audio_base64", "audio", "data", "wav_base64"):
                if isinstance(j.get(k), str) and len(j[k]) > 100:
                    return base64.b64decode(j[k].split(",")[-1])
            for k in ("file_path", "path", "audio_path"):
                if j.get(k) and Path(j[k]).exists():
                    return Path(j[k]).read_bytes()
            if j.get("url") or j.get("audio_url"):
                u = j.get("url") or j.get("audio_url")
                u = u if u.startswith("http") else URL.split("/mcp")[0] + u
                return urllib.request.urlopen(u, timeout=120).read()
    raise SystemExit("no audio in generate_speech result: " + json.dumps(content)[:400])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--voice", default="V1", help="VoiceStudio profile name or id")
    ap.add_argument("--steps", type=int, default=32)
    ap.add_argument("--speed", type=float, default=1.0)
    a = ap.parse_args()

    styles = json.loads(REG.read_text())["expressive"]
    vs = MCP()
    profiles = json.loads(vs.tool("list_voices", {})[0]["text"])
    prof = next((p for p in profiles if a.voice in (p["id"], p["name"])), None)
    if not prof:
        raise SystemExit(f"voice {a.voice!r} not found: {[p['name'] for p in profiles]}")
    print(f"VoiceStudio · {prof['name']} ({prof['id']}, {prof['kind']}) · steps {a.steps} · speed {a.speed}", flush=True)

    lines = []
    for raw in a.script.read_text().splitlines():
        s = raw.strip()
        if s and not s.startswith("#"):
            m = TAG.match(s)
            lines.append((m.group(1) if m else "fun", TAG.sub("", s)))

    lead = styles.get("_lead_in", 0.3)
    parts, beats, t = [np.zeros(int(lead * SR))], [], lead
    for sid, text in lines:
        st = styles.get(sid, {})
        wav = audio_from(vs.tool("generate_speech", {"text": text, "profile_id": prof["id"], "steps": a.steps, "speed": a.speed, "format": "wav"}))
        x, sr = sf.read(io.BytesIO(wav))
        x = x if x.ndim == 1 else x.mean(1)
        if sr != SR:
            import librosa

            x = librosa.resample(x.astype(np.float32), orig_sr=sr, target_sr=SR).astype(np.float64)
        x = trim(x, sr=SR) * 10 ** (st.get("gain_db", 0) / 20)
        dur = len(x) / SR
        beats.append({"style": sid, "text": text, "start": round(t, 3), "end": round(t + dur, 3)})
        parts += [x, np.zeros(int(st.get("pause", 0.25) * SR))]
        t += dur + st.get("pause", 0.25)
        print(f"  {sid:<8} {dur:5.2f}s  {text}", flush=True)

    audio = finish(np.concatenate(parts))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(a.out, audio.astype(np.float32), SR, subtype="PCM_16")
    meta = {"engine": "voicestudio", "voice": {"id": prof["id"], "name": prof["name"]}, "steps": a.steps, "speed": a.speed,
            "duration": round(len(audio) / SR, 3), "lufs": round(lufs(audio), 1), "beats": beats}
    a.out.with_suffix(".beats.json").write_text(json.dumps(meta, indent=2))
    print(f"✓ {meta['duration']}s · {meta['lufs']} LUFS · {a.out}")


if __name__ == "__main__":
    main()
