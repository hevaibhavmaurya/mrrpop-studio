# Mr. Pop — production character library (LOCKED design)

**MRR Pop** = the media brand. **Mr. Pop** = its animated host. Voiced by Vaibhav.
This folder is the single source of truth for the character. Older drafts in `brand/avatar/` are archive only.

## Locked identity — never change
Quiff with violet shine · round thick glasses · short jawline beard + moustache + chin beard · thick brows ·
warm brown skin #B9794C · navy blazer #1E2340 over violet hoodie #6C5CE7 · lime drawstrings #C6F432 ·
lime "$" lapel pin (signature; neutral versions without it exist) · one white earbud · 6px ink outline #0F1222 · flat vector.

## Folders
| Folder | Contents | Size |
|---|---|---|
| `expressions/` | 19 head-and-shoulders PNGs, transparent | 1200×1440, head centred |
| `expressions-no-badge/` | same, without the $ pin (sponsored / neutral content) | 1200×1440 |
| `poses/` | 6 full-body PNGs, transparent | 1200×2760, feet at bottom |
| `poses-no-badge/` | same, without the pin | 1200×2760 |
| `svg/`, `svg-no-badge/` | layered vectors (groups: body, badge, head › face-base, beard, mouth, moustache, eyes, glasses, brows, hair, extras) | viewBox 600×720 / 600×1380 |
| `brand/` | profile-avatar.png (lime circle, transparent corners), -square, -violet | 1080×1080 |
| `reference/master-character-sheet.png` | overview for humans and AI tools | — |
| `manifest.json` | machine-readable list: name, files, "use_for" | — |
| `build.py` | generator — `python3 build.py .` regenerates svg/ + svg-no-badge/ | — |

## Expressions → when to use (also in manifest.json)
grin (default/end card) · smile · money-eyes (revenue hook) · shocked (big number, acquisition) · wink · thinking ·
confused · laughing · laughing-hard · serious (sources, disclaimers) · crying (failed launch) · skeptical (estimates) ·
star-struck (record milestone) · cool (impressive solo founder) · nervous (risky bet) · angry (scam / unfair change) ·
confident (strong verdict) · curious (investigating a claim) · facepalm (obvious mistake)

## Poses
idle · pointing · celebrating · shrug · thumbs-up · explaining

## Rules for Claude when making videos
- Pick assets via manifest.json; never redraw or restyle the character.
- Animate with transforms only (pop-in scale, bob, tilt). For blinks/mouth swaps use the layered SVGs.
- Sponsored Reels use the `*-no-badge` versions.
- To add an expression or pose: edit build.py, regenerate, export PNG at 2× with transparent background, update manifest.json.
