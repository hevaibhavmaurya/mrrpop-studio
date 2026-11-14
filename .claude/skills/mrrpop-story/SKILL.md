---
name: mrrpop-story
description: >-
  Find, research and script an MRR Pop Reel about a software product, following the studio's story protocol
  (sources, evidence labels, real images, audience angle, hook scoring, script rules). Use whenever the user asks
  to make a story, reel, script or video about a product, founder, launch, revenue milestone or SaaS for sale,
  pastes a product / TrustMRR / X link, asks "what should we cover next", or asks to research a story.
---

# mrrpop-story

Before doing anything, read these in order:
1. `docs/STORY-PROTOCOL.md`: the full protocol. Follow every section.
2. `docs/BRAND.md`: scope, evidence labels, voice.
3. `.claude/instagram/voice.md`: Mr. Pop's voice.

## Steps

1. **Find or take the story** (protocol §1). Check `content/ledger.json` for duplicates.
2. **Research everything** (protocol §2): all product pages, the founder's X (built-in browser), TrustMRR.
   Cross-check numbers. Flag conflicts to the user. Collect the real images.
3. **Create the folder** `content/stories/YYYY-MM-DD-slug/` from `content/_story-template/` (source-files/, voice/,
   build/assets/, exports/). Write `sources.md` while researching.
4. **Audience + angle** (protocol §3–4): name the one problem/desire, write 3 angles, pick one, and write down the
   belief before and after.
5. **Hooks** (protocol §5): 5 text + 5 verbal, score with `.claude/skills/ig-reel/hookscore.py`, keep ≥ 60.
6. **Script** (protocol §6): 85–95 words, time it with `.claude/skills/ig-reel/beats.py`, one CTA, loop word,
   no hyphens/dashes/ellipses, no "Boom", transitions as animation. Run `/ig-human`.
7. **Write** `script.md` (table: voiceover · on screen · label/source), `voice/voiceover.vo.txt` with emotion tags,
   `caption.md`, `meta.json`.
8. **Show the user the script first.** Voice + render only after they approve, since the voice alone takes ~1.5 h.
9. Production and hand-off: protocol §7–9. Nothing gets published.

When the user corrects a rule (a word, a format, a look), add it to `docs/STORY-PROTOCOL.md` so the next story
follows it.
