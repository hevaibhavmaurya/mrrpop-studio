# Story protocol: how to find, research and script an MRR Pop Reel

Read this before researching or writing any story. It collects every rule and lesson
learned so far (first written 2026-11-14 from the MoveMRR story). BRAND.md still wins on brand and
trust rules; this file says how to apply them.

---

## 1. Finding stories

**Where to look** (tech software products only, see BRAND.md scope):

| Source | What it gives you | Notes |
|---|---|---|
| **TrustMRR** (trustmrr.com) | Payment-verified revenue, MRR, founder, founded date, **for-sale listings with asking price**, founder messages | Best single source. Revenue there counts as ✓ Payment-verified (says which provider, e.g. Polar or Stripe). Browse the marketplace for "for sale" deals (Deal Pop). |
| **Founder's X profile** | Bio (exits, location), pinned post, revenue claims, launch posts | Everything here is Founder-reported. Read the pinned post and the last ~20 posts. |
| **Product website** | What it does, pricing, customer stories, stats, founder story | Read EVERY page, not just the homepage: about, customers, pricing, FAQ, security, blog. Numbers here are Company-announced (or Customer-reported if the site says so). |
| Indie Hackers, Product Hunt, Show HN, acquisition marketplaces | Leads only | Never the only source for a number. Confirm on TrustMRR, the product site or the founder. |

**A story is worth making when it has:**
- one specific true number that can be sourced (reject the story if the key number can't be),
- a turn: a problem, an irony, a twist or a surprise (e.g. "the tool built to sell a SaaS is now for sale"),
- something useful for our audience (a lesson about pricing, distribution, exits, buying),
- no duplicate in `content/ledger.json`.

---

## 2. Research checklist (do all of it)

1. **Product site, all pages.** Note what it does in one sentence, who it's for, price, every stat and its fine print
   ("lower bound", "customer-reported", "from €150").
2. **Founder on X.** Bio, pinned post, recent posts. X blocks headless/automated fetches (403), so use the
   built-in browser and `get_page_text`.
3. **TrustMRR page.** All-time revenue, MRR, last 30 days, verification provider + "last updated" date, for-sale
   banner, asking price (and any old price), founder message.
4. **Cross-check every number between sources. If two sources disagree, flag it to the user. Don't pick one
   silently.** Example: MoveMRR's pinned X post said "sold for 10k" while TrustMRR showed it for sale at $49,800.
   Put open questions in `sources.md` and `meta.json` notes, and say them in the hand-off message.
5. **Precise wording about other companies.** Don't overclaim what a big platform can't do. Example: Stripe now has a
   Billing Migration Toolkit, so say "Stripe's Customer Data Copy moves customers and cards, not subscriptions",
   not "Stripe can't move subscriptions".
6. **Read MRR right.** One-time-priced products show MRR "–" on TrustMRR. Use all-time revenue instead and say so.
7. **Write `sources.md` as you go:** claim · label · URL · date checked. Quotes verbatim, including the founder's own
   spelling (e.g. "I dont like marketing").
8. **Collect real images (minimum requirement for every Reel):**
   - Founder photo: X avatar from `pbs.twimg.com/profile_images/...`. Drop the `_400x400` suffix for the original.
     The product site's About page often has a larger one too.
   - Product logo: from the site (`_astro/logo*.png`, `apple-touch-icon.png`, `og-image`).
   - TrustMRR icon (`trustmrr.com/icon.png`) and a 2× screenshot of the listing (revenue card, for-sale banner).
   - Product homepage screenshot (2×, 1280 wide viewport).
   - Customer logos shown on the product's own site.
   - Save to `content/stories/<slug>/build/assets/` and list them in `sources.md` with where they came from.
   - Don't use: X profile screenshots (blocked anyway), banners showing other brands, cars, plates or people
     other than the founder, other creators' footage or music.

---

## 3. Our audience (use this to pick the angle)

Indie hackers, SaaS founders, developers, and people who want to **build, sell or buy** small software
businesses (US, UK, Europe, Australia, India).

**Problems they face:** no distribution after launch · SEO takes months · they don't know what a SaaS is worth ·
handing over Stripe, domains and code when selling · churn · pricing too low · one-time vs subscription pricing ·
doing marketing at all.

**Frustrations:** "I built it and nobody came" · "I hate marketing" · "Stripe won't just move my subscriptions" ·
"buyers lowball small SaaS" · "revenue screenshots online are fake".

**What they want:** first paying users · a clean exit · proof that small, boring software makes real money · a
cheap SaaS to buy and grow · numbers they can trust.

**Questions they ask:** How much did it make? How long did it take? How did they get users? What would it sell for?
What multiple is fair? Is the revenue verified?

**Mistakes they make:** building before validating · ignoring SEO and directories · underpricing · leaving the
billing handover to the last day · trusting unverified MRR claims.

**Objections / limiting beliefs:** "you need an audience" · "my SaaS is too small to sell" · "selling is too
complicated" · "only VC startups exit".

**Their words:** paying users, MRR, ARR, exit, acquisition, multiple, verified revenue, bootstrapped, solo, shipped,
churn, "move my subs", "double charged", "listed for sale".

**The emotion underneath:** they want proof it's possible for someone like them, and they're scared the one big
moment (launch, first sale, exit) breaks.

---

## 4. Picking the angle

Write 3 angles, pick one, and write down:
- main problem · viewer's belief before · belief after · the one insight · why they stop scrolling.

**What has worked best so far:** **problem first → the builder who fixed it → the twist.** Teach something the
audience fears or wants (e.g. "your subscriptions don't move when you sell your SaaS"), then the founder story,
then the surprise (for sale, price, reason). The irony on its own (v1 of MoveMRR) was fun but taught less, and its
hook scored lower (63.7 vs 76.4).

---

## 5. Hooks

- Write **5 text hooks** (on-screen, ≤ 7 words) and **5 verbal hooks** (spoken, 5–12 words), from different
  formulas in `.claude/skills/ig-reel/hooks.json`.
- Score the verbal hooks: `python3 .claude/skills/ig-reel/hookscore.py hooks.txt`. Shoot only ≥ 60. Aim for 75+.
  Addressing "you" and naming the stake ("Selling your SaaS?") scores best.
- The first frame shows the hook number or claim on screen.
- No clickbait, no hype words.

---

## 6. Script rules

- **Length:** 85–95 words. The signature Mr. Pop voice runs ≈ 2.1 words/s with pauses: 92 words ≈ 41 s, 100 words
  ≈ 47 s. Target 25–40 s. Check with `python3 .claude/skills/ig-reel/beats.py script.txt --target 38`.
- **Shape:** HOOK → VALUE (problem, why it hurts) → SOLUTION/STORY → TWIST → ONE CTA. Short lines, one idea each.
  Every line has to pull its weight. No intro, no filler, no motivational lines, don't say the same point twice.
- **Voice:** sounds like a person talking. Contractions. Numbers spelled out in the voiceover ("forty nine thousand
  eight hundred dollars"), digits on screen ("$49,800").
- **Never:**
  - hyphens, en/em dashes or "…" in scripts, voiceover or on-screen text (reads as AI). Use full stops.
  - "Boom" (reads as bot). Use "Just like that" if needed.
  - guru, passive income, get rich, insane, secret, hack, game-changer.
  - spoken transition words like "Rewind". Do those as animation + SFX (e.g. VHS rewind) instead.
- **CTA:** exactly one spoken ask, matched to the goal. Default goal is comments:
  "Would you buy it? Comment yes or no." "Follow MRR Pop" lives on the end card. Echo a hook word in the last
  line for a loop ("Selling your SaaS…" → "Would you buy this SaaS?").
- **Retention pass:** mark where interest dips (usually the explanation) and keep those lines under 10 words. Add one
  real pattern interrupt where the story turns ("Plot twist."). Close the open loop the hook opened.
- Run `/ig-human` on the final script.

---

## 7. On-screen rules

- Every number carries its label chip: ✓ Payment verified · Company announced · Founder reported · Customer reported.
- A source bar on every beat ("Source: TrustMRR listing · Nov 14"), changing as the source changes.
- Real images from §2.8 in at least: hook or intro (logo), founder beat (photo), proof beat (TrustMRR screenshot).
- Text safe box x 80–850, y 250–1440: `node packages/pipeline/render/safezone.mjs build/reel.html` must pass.
- Headline ≥ 64 px, numbers ≥ 160 px.

---

## 8. Production notes (time and tools)

- Voice: `expressive.py` with the locked signature (6 takes per line). It takes **~1.25 min per take, so ~1.5 h for
  12 lines**. Run it in the background and build the canvas on mock timings meanwhile.
- Rewind or any non-spoken transition: add the gap + SFX with
  `content/stories/2026-11-14-movemrr-for-sale/build/rewind_gap.py <story>/voice 0.9` (keeps `voiceover.raw.*`).
- Build: `build/reel.tpl.html` → `node packages/pipeline/render/assemble.mjs <story> packages/character/packs/mr-pop-v3 reel`
  → check frames with `capture.mjs ... --only t1,t2` → `capture.mjs` full → `swift packages/pipeline/render/encode.swift`.
- The studio (Stories + Canvas) picks a story up automatically when the folder has `source-files/meta.json`,
  `source-files/*.md`, `build/reel.tpl.html`, `voice/voiceover.wav|beats.json|face.json`, `exports/`.

---

## 9. Hand-off checklist

- [ ] Every claim in `sources.md` with a label and URL, open questions listed
- [ ] Hook score, word count, final duration stated
- [ ] No hyphens/dashes/ellipses, no "Boom", one CTA
- [ ] Real images used and credited
- [ ] Safe zone passes, reel 1080×1920 H.264 + AAC, -14 LUFS
- [ ] `caption.md`, `meta.json`, ledger entry (status `draft`)
- [ ] Told the user what's unverified. Nothing published.
