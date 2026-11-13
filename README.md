# MRR Pop Studio

**MRR Pop** is an Instagram-first media brand — *the business behind software* — hosted by the
animated mascot **Mr. Pop**. **MRR Pop Studio** is the local web app + toolkit that produces it:
Reels, carousels, posts and stories, all from one brand kit, one character and one set of templates.

> Status: **restructured, studio build in progress.** See "Roadmap" below.

## What the studio does
Run it on your Mac (`npm run dev` → http://localhost:3010):

| Page | What you can do |
|---|---|
| **Brand** | Colours, fonts, logo, stickers, evidence chips — live, click to copy. Switch themes. |
| **Character** | Mr. Pop's poses, expressions and mouth shapes; a playground to make him talk. Switch character packs. |
| **Components** | Every animated building block (revenue card, bubbles, captions, charts…) with editable props. |
| **Canvas** | Open a story → 9:16 preview with Play / scrub timeline / scene list → edit text & numbers → **Render MP4**. |
| **Carousels & posts** | Slide strip + live preview (1080×1350), reorder, edit, see the feed caption → **Export PNGs / ZIP**. |
| **Voices** | The Mr. Pop signature voice, every story voiceover played on Mr. Pop with lip sync + expressions. |
| **Stories** | Each story's script, sources (with evidence labels), voice, and all exports. |
| **Skills** | The Claude skills installed in this project; install new ones from `inbox/skills/`. |

### Getting your files
Every export is a real file in `content/stories/<date-slug>/exports/` (reel.mp4, cover.jpg, caption.txt,
carousel/01.png…, carousel.zip, post.png, story.png). In the studio: **Download**, **Download all (ZIP)**,
**Copy caption**, **Reveal in Finder**. Set `exportsDir` in `studio.config.json` to an iCloud Drive folder to get
files on your iPhone automatically. Posting is manual until the official Instagram API is connected.

## Folder structure
```
mrrpop-studio/
├── README.md · CLAUDE.md · package.json · studio.config.json
├── .claude/skills/          native Claude Code skills (auto-loaded in this project)
├── .claude/instagram/voice.md   MRR Pop voice profile read by the /ig-* skills
├── studio/                  the web app (pages + small local server for render/voice jobs)
├── packages/
│   ├── theme/themes/<name>/ theme.json (colours, fonts, radius, motion) + logo.svg + fonts/   ← swap brand here
│   ├── character/packs/<name>/  manifest.json + parts/*.svg (head, hair, eyes, mouths, arms…)  ← swap avatar here
│   ├── ui/                  animated components (read theme tokens only — no hard-coded colours)
│   ├── templates/           Remotion: reels/ (RevenuePop, LaunchPop, DealPop) · carousels/ · posts/ · stories/
│   └── pipeline/            voice engines, lip sync, captions, render
├── content/
│   ├── stories/<date-slug>/ story.json, script.md, sources.md, carousel.json, voice/, exports/
│   ├── _story-template/
│   └── ledger.json          every story ever made (prevents duplicates)
├── voices/                  Mr. Pop voice (registry, timbre reference, sample)
├── inbox/skills/            new skills drafted by Claude, waiting to be installed
├── docs/                    BRAND.md (editorial rules), references.md, props.md
├── references/              inspiration videos (never reused in our content)
├── scripts/install-skills.sh
└── archive/                 old demos (v1–v4), drafts, old templates, previous Claude outputs, private files
```
**Changing the brand:** copy `packages/theme/themes/mrrpop-v5` → edit `theme.json` / `logo.svg` → set `"theme"` in
`studio.config.json`. **Changing the avatar:** redraw any SVG part with the same filename, or add a new pack and set
`"character"`. Nothing else changes.

## Formats
| Format | Size | Template folder |
|---|---|---|
| Reel | 1080×1920, 20–40 s, 30 fps | `packages/templates/reels/` |
| Carousel | 1080×1350, up to 10 slides | `packages/templates/carousels/` |
| Post | 1080×1350 or 1080×1080 | `packages/templates/posts/` |
| Story | 1080×1920 still | `packages/templates/stories/` |

## Voice engines
| Engine | Licence | Notes |
|---|---|---|
| **Kokoro-82M** (default, voice `am_fenrir`) | Apache-2.0 — commercial OK | Offline, fast, no reference audio needed. Good but not studio-human. |
| **Chatterbox** (Resemble AI) | MIT — commercial OK | Runs locally on Apple Silicon (Python + PyTorch, a few GB). Clones from a 5–20 s reference you have rights to, with an **exaggeration** control for energetic delivery; adds an inaudible watermark. Options for the reference: its default voice, a consenting voice actor, or the Kokoro voice. Test it on your Mac — it cannot run in Claude's cloud sandbox. |
| **ElevenLabs** (optional) | Paid plan = commercial rights | Most human-sounding; needs an API key. |
Each line in the studio can switch engine so you compare by ear. Lip sync: Rhubarb Lip Sync (MIT).

## Claude skills
Native location: `.claude/skills/<name>/SKILL.md` — Claude Code loads them automatically when working here.
- **Instagram pack (13, MIT, by Jake Schincariol):** /ig-reel /ig-caption /ig-carousel /ig-story /ig-profile /ig-plan
  /ig-comment /ig-reply /ig-dm /ig-repurpose /ig-audit /ig-human /ig-viral. Reviewed: scripts run locally, no network;
  /ig-viral uses your own browser for research.
- **MRR Pop skills (coming):** mrrpop-story · mrrpop-script · mrrpop-carousel · mrrpop-produce · mrrpop-brand.
- **Install / update:** `bash scripts/install-skills.sh` (Claude can't write into `.claude/` remotely, so drafts land in
  `inbox/skills/` first).

## Setup (Mac)
```bash
cd ~/Dev/mrrpop-studio
bash scripts/install-skills.sh   # once
npm install                      # when the studio is added
npm run dev                      # opens http://localhost:3010
```
Needs Node.js 20+. Optional: Python 3.11 for Chatterbox. No ffmpeg/yt-dlp/Whisper/HyperFrames needed.

## Editorial rules (summary — full rules in docs/BRAND.md)
Never invent numbers. Every figure carries a label: Payment-verified · Company-announced · Founder-reported · Estimated.
Sponsored content is always labelled. Fictional demo data (e.g. "TabTidy") is marked DEMO.

## Roadmap
1. ✅ Restructure + archive · ✅ Instagram skills added
2. Theme pack (mrrpop-v5) + redesigned Mr. Pop character pack (sheet for approval)
3. Studio app: Brand · Character · Voices · Skills pages
4. Remotion Reel templates on the Canvas (Revenue Pop → Launch Pop → Deal Pop)
5. Carousel / post / story templates + Carousel editor
6. MRR Pop skills
