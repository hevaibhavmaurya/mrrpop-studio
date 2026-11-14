"""Upcoming Reel drafts → content/drafts/drafts.json (read by the studio's Drafts page).

Edit the DRAFTS list, then run:  python3 content/drafts/build.py
It writes each script to content/drafts/<id>/script.txt, times it with /ig-reel's beats.py, scores the hook with
hookscore.py, runs /ig-human's detect.py, rejects hyphens/dashes/ellipses, and saves everything to drafts.json.

Rules (BRAND.md + memory): under 30 s, hook first, no "Follow MRR Pop" sign off, no hyphens, no "Boom",
transitions are animation + SFX (put them in `cards`, never in `lines`), every number has a label and a source.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
SK = HERE.parent.parent / ".claude" / "skills"
WPM_REAL = 125  # Mr. Pop's real pace incl. pauses (Maya story: 101 words took 41 to 50 s)

DRAFTS = [
    dict(id="01-postiz", order=1, series="revenue-pop", title="Postiz", tag="You can host it free. People still pay.",
         label="Payment verified", key_number="$416,786 MRR",
         lines=["You can host this app for free. People still pay $416K a month.", "Free.", "It's called Postiz, and it schedules your posts on every platform while AI agents write them for you.", "The code's open source.", "Yet 12,277 people pay so they never touch a server.", "Would you pay for an app you could host for free?"],
         cards=["$416K A MONTH", "Free to host?", "Postiz · schedules everything", "Open source code", "12,277 people pay", "Would you pay?"],
         sources=[["TrustMRR: Postiz (Stripe verified, 14 Nov 2026)", "https://trustmrr.com/startup/postiz"]],
         notes="Founder Nevo David, X handle on TrustMRR: @wickedguro. Re check MRR on production day."),
    dict(id="02-conductor", order=2, series="deal-pop", title="Meta buys Conductor", tag="Post before 20 November",
         label="Company announced", key_number="100,000+ users · price not disclosed",
         lines=["Used Conductor? Your cloud data gets deleted after November 20.", "Conductor let you run a whole team of AI coding agents at once, and over 100,000 developers used it.", "Then Meta bought it.", "Sign ups stopped that day.", "The cloud? Gone on the 20th.", "So export your work now.", "Would you trust a tool like Conductor again?"],
         cards=["DATA GONE NOV 20", "Many AI agents at once", "100,000+ users", "Meta bought it · Nov 4", "Cloud off · Nov 20", "Export now", "Trust it again?"],
         sources=[["SiliconANGLE, 4 Nov 2026", "https://siliconangle.com/2026/11/04/meta-acquires-ai-coding-startup-conductor-whose-app-runs-several-coding-agents-at-once/"],
                  ["Axios, 4 Nov 2026", "https://axios.com/2026/11/04/meta-acquires-ai-coding-startup-conductor"],
                  ["InfoWorld", "https://www.infoworld.com/article/4245065/meta-acquires-conductor-as-ai-coding-shifts-toward-multi-agent-development.html"]],
         notes="Deadline story: must go out before 20 November."),
    dict(id="03-web3forms", order=3, series="revenue-pop", title="Web3Forms", tag="The most boring idea ever",
         label="Payment verified", key_number="$44,687 MRR",
         lines=["It's just a contact form. It makes $44K a month.", "Seriously.", "You paste one line into your website, and every message people send lands straight in your inbox.", "No server. No backend.", "It's been around since 2020, and 3,243 people pay for it now.", "Would you pay for a contact form?"],
         cards=["$44K A MONTH", "Paste one line", "No server", "3,243 subscriptions", "Every site needs one", "Would you pay?"],
         sources=[["TrustMRR: Web3Forms (Paddle verified, 14 Nov 2026)", "https://trustmrr.com/startup/web3forms"]],
         notes="Founder Surjith S M, @surjithctly on X."),
    dict(id="04-miro", order=4, series="deal-pop", title="Bending Spoons buys Miro", tag="Sold for about 2x revenue",
         label="Company announced", key_number="$1.355B for ~$600M ARR",
         lines=["Miro makes $600 million a year. It just sold for $1.36 billion.", "Cash.", "The buyer's Bending Spoons, the same company that bought Evernote and WeTransfer, and it paid every dollar up front.", "Over 100 million people use Miro, and almost 4 million pay.", "That's about two times its yearly revenue.", "Was Miro a bargain, or a fair price?"],
         cards=["$600M A YEAR", "Sold for $1.36B", "Bending Spoons", "All cash", "100M users · 4M pay", "2.3x revenue", "Bargain or fair?"],
         sources=[["Bending Spoons: agreement, 10 Sep 2026", "https://investors.bendingspoons.com/newsroom/bending-spoons-agrees-to-acquire-miro"],
                  ["Bending Spoons: completion, 26 Oct 2026", "https://investors.bendingspoons.com/newsroom/bending-spoons-completes-the-acquisition-of-miro"]],
         notes="$1.355B is enterprise value. Evernote and WeTransfer: Bending Spoons portfolio (Wikipedia), confirm before render."),
    dict(id="05-flight-game", order=5, series="growth-story", title="Pieter Levels' flight game", tag="Fast money vs slow money",
         label="Founder reported", key_number="$87K MRR on day 17 → $0 now",
         lines=["$1 million a year in 17 days. Then it went to zero.", "Pieter Levels spent three hours prompting an AI editor, and out came a flight game you could play right in your browser.", "Blimp ads. A $29.99 jet.", "Day 17? $87K a month.", "Today his own bio says $0.", "One time money doesn't renew. Subscriptions do.", "Fast million, or slow million?"],
         cards=["$1M/YEAR IN 17 DAYS", "Built in 3 hours", "Blimp ads · $29.99 jet", "Day 17 · $87K/mo", "Now · $0/mo", "One time money fades", "Fast or slow?"],
         sources=[["Pieter Levels on X: $0 to $1M ARR in 17 days (Mar 2025)", "https://x.com/levelsio/status/1899596115210891751"],
                  ["Pieter Levels on X: the three hour build", "https://x.com/levelsio/status/1893385114496766155"],
                  ["DEV summary", "https://dev.to/promptway/he-built-a-flight-simulator-in-three-hours-and-hit-1m-a-year-in-17-days-then-it-went-to-zero-1b1l"]],
         notes="2025 story, frame as a lesson. Check his X bio still says $0 on the day you post."),
    dict(id="06-guess-the-mrr", order=6, series="guess-the-mrr", title="Guess the MRR", tag="A, B or C?",
         label="Payment verified", key_number="$48,566 · $44,687 · $28,010",
         lines=["Guess which app makes $48K a month. Most people get it wrong.", "A. A contact form.", "B. A button that posts your video to every app at once.", "C. Analytics that tells founders which channel actually brings paying customers.", "Comment your letter.", "It's B. $48,566 a month.", "A's at $44,687, and C's at $28,010.", "Did you get the $48K app?"],
         cards=["WHICH ONE MAKES $48K?", "A · Contact form", "B · Post everywhere", "C · Revenue analytics", "Comment A, B or C", "B · $48,566", "A $44,687 · C $28,010", "Did you get it?"],
         sources=[["TrustMRR: POST BRIDGE", "https://trustmrr.com/startup/post-bridge"], ["TrustMRR: Web3Forms", "https://trustmrr.com/startup/web3forms"], ["TrustMRR: DataFast", "https://trustmrr.com/startup/datafast"]],
         notes="Pause card before the reveal is a 1 s animation with a ticking SFX, no voice."),
    dict(id="07-marc-lou", order=7, series="revenue-pop", title="Marc Lou's three products", tag="Every dollar verified",
         label="Payment verified", key_number="$2,449,721 all time",
         lines=["One guy, three products, $2.4 million. Every dollar's verified.", "Marc Lou.", "First he made ShipFast, a starter kit for building apps, and it's brought in $1.27 million so far.", "Then CodeFast, a coding course. $836K.", "Now DataFast. $28K a month.", "He just keeps building tools for people exactly like him.", "Which of his three would you buy?"],
         cards=["$2.4M · 3 PRODUCTS", "ShipFast · $1.27M", "CodeFast · $836K", "DataFast · $28K/mo", "Built for people like him", "Which one?"],
         sources=[["TrustMRR: ShipFast", "https://trustmrr.com/startup/shipfast"], ["TrustMRR: CodeFast", "https://trustmrr.com/startup/codefast"], ["TrustMRR: DataFast", "https://trustmrr.com/startup/datafast"]],
         notes="Totals are all time revenue, not MRR (except DataFast)."),
    dict(id="08-peec-ai", order=8, series="revenue-pop", title="Peec AI", tag="Doubled in six months",
         label="Company announced", key_number="$20M ARR",
         lines=["This startup went from zero to $20 million a year in under two years.", "Peec AI shows brands exactly what ChatGPT and other AI tools are saying about them, good or bad.", "May? $10 million a year.", "November? $20 million.", "Six months. Doubled.", "Do you know what ChatGPT says about your product?"],
         cards=["$0 TO $20M A YEAR", "What AI says about you", "May · $10M", "Nov · $20M", "Doubled in 6 months", "Have you checked?"],
         sources=[["Peec AI press release, 2 Nov 2026", "https://finance.yahoo.com/technology/ai/articles/peec-ai-doubles-revenue-six-161500583.html"]],
         notes="Good follow up to the ChatGPT Business Hub Reel."),
    dict(id="09-post-bridge", order=9, series="revenue-pop", title="POST BRIDGE", tag="One button, every app",
         label="Payment verified", key_number="$48,566 MRR",
         lines=["He makes $48K a month from one button that posts everywhere.", "Same video. Every app. Again and again.", "jack friks fixed that with POST BRIDGE, so you upload once and it goes out to every platform you use.", "Two years in, 1,615 people pay for it.", "$48,566 a month.", "How many apps do you post the same video to?"],
         cards=["$48K A MONTH", "Same video, every app", "Upload once", "1,615 people pay", "$48,566 a month", "How many apps?"],
         sources=[["TrustMRR: POST BRIDGE (Stripe verified, 14 Nov 2026)", "https://trustmrr.com/startup/post-bridge"]],
         notes="Founded Sep 2024. Confirm jack friks' X handle before posting."),
    dict(id="10-trustmrr", order=10, series="founder-brief", title="TrustMRR", tag="Revenue you can't fake",
         label="Payment verified", key_number="$412,072 all time",
         lines=["He built a website where founders can't fake their revenue.", "Screenshots lie.", "On TrustMRR, founders plug in their Stripe or Paddle account, read only, and the number updates every single hour.", "Over 1,000 startups are for sale on it too.", "And the site itself? $412K made.", "Would you show your real revenue in public?"],
         cards=["CAN'T FAKE REVENUE", "Screenshots lie", "Connected · hourly", "1,000+ for sale", "$412K made", "Would you show yours?"],
         sources=[["TrustMRR: TrustMRR (Stripe verified, 14 Nov 2026)", "https://trustmrr.com/startup/trustmrr"]],
         notes="Built by Marc Lou. This is where our Payment verified label comes from."),
    dict(id="11-screen-studio", order=11, series="launch-pop", title="Screen Studio 4.0", tag="#1 on Product Hunt",
         label="Company announced", key_number="#1 product of the day, 1 Nov",
         lines=["A screen recorder beat every AI launch on Product Hunt.", "Number one. November 1st.", "Screen Studio smooths your cursor, zooms in on every click and drops a clean background behind it, so a demo looks polished in about a minute.", "Now? You edit by editing the transcript.", "Would you use a screen recorder like this for your demo?"],
         cards=["#1 ON PRODUCT HUNT", "Screen Studio 4.0", "Smooth cursor · auto zoom", "Polished in a minute", "Edit by transcript", "Would you use it?"],
         sources=[["Product Hunt daily leaderboard, 1 Nov 2026", "https://www.producthunt.com/leaderboard/daily/2026/11/1"], ["screen.studio", "https://screen.studio"]],
         notes="Product clips only from screen.studio's own site or press kit, credited."),
    dict(id="12-llm-gateway", order=12, series="revenue-pop", title="LLM Gateway", tag="Open source, $1M",
         label="Payment verified (as of 7 Sep 2026)", key_number="$1,000,116 all time",
         lines=["An open source AI router made its first $1 million in 16 months.", "With one connection, your app can reach over 280 AI models from OpenAI, Anthropic, Google and more.", "Launched May 2025.", "By September? $1,000,116.", "And you can host the code yourself, free.", "Would you pay for a router you could host for free?"],
         cards=["$1M IN 16 MONTHS", "280+ AI models", "Launched May 2025", "$1,000,116 total", "Free to self host", "Would you pay?"],
         sources=[["TrustMRR: LLM Gateway (last updated 7 Sep 2026)", "https://trustmrr.com/startup/llm-gateway"]],
         notes="Stripe key expired on TrustMRR, so say 'by September'. Re check before producing."),
    dict(id="13-runway", order=13, series="revenue-pop", title="Runway", tag="A forecast, not a result",
         label="Company announced (forecast)", key_number="$200M → $450M ARR target",
         lines=["Runway says its revenue will more than double by December.", "Two months ago, the AI video company said it was making $200 million a year, and now it's aiming for $450 million by year end.", "Big claim.", "It's a forecast, not a result.", "One of its two CEOs said it on stage at Bloomberg Tech.", "Do you think Runway hits $450 million?"],
         cards=["MORE THAN DOUBLE?", "$200M a year", "Target · $450M", "Forecast only", "Bloomberg Tech · London", "Will they hit it?"],
         sources=[["Bloomberg, 3 Nov 2026", "https://www.bloomberg.com/news/articles/2026-11-03/runway-ai-says-arr-set-to-double-to-450-million-by-end-of-year"]],
         notes="Label the $450M as a forecast on screen the whole time it shows."),
    dict(id="14-aplano", order=14, series="deal-pop", title="saas.group buys Aplano (backup)", tag="Boring software sells",
         label="Company announced", key_number="2,500+ businesses · price not disclosed",
         lines=["2,500 businesses run their shifts on this boring app. It just got bought.", "Aplano handles shifts, time tracking and sick days for pharmacies, care homes, cafes and cleaning teams, all in one app.", "Berlin. 2020.", "Now saas.group owns it.", "Their 28th.", "Would you build boring software like this?"],
         cards=["2,500 BUSINESSES", "Shift planning", "Shifts · time · sick days", "Berlin · 2020", "saas.group's 28th", "Would you build it?"],
         sources=[["Onrec", "https://www.onrec.com/node/130053"], ["Startup Researcher", "https://www.startupresearcher.com/news/saas-group-acquires-aplano-in-28th-acquisition-deal"]],
         notes="Backup. Only secondary sources so far: find saas.group's own announcement first."),
]

BAD = re.compile(r"[\-‐-―…]|\.\.\.|\bboom\b|follow mrr pop", re.I)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True).stdout


def main():
    out = []
    for d in DRAFTS:
        for txt in d["lines"] + d["cards"]:
            if BAD.search(txt):
                sys.exit(f"{d['id']}: banned character or phrase in: {txt!r}")
        folder = HERE / d["id"]
        folder.mkdir(exist_ok=True)
        script = folder / "script.txt"
        script.write_text("\n".join(d["lines"]) + "\n")
        beats = run(["python3", str(SK / "ig-reel" / "beats.py"), str(script), "--target", "30"])
        hook = run(["python3", str(SK / "ig-reel" / "hookscore.py"), "--hook", d["lines"][0]])
        human = run(["python3", str(SK / "ig-human" / "detect.py"), str(script)])
        words = len(" ".join(d["lines"]).split())
        secs = float((re.search(r"~([\d.]+)s", beats) or [0, 0])[1])
        hs = re.search(r"HOOK SCORE\s+#*\.*\s+([\d.]+)\s+(\w+)", hook)
        hu = re.search(r"HUMAN SCORE\s+#*\.*\s+([\d.]+)\s+(\w+)", human)
        flags = [l.strip()[2:] for l in beats.splitlines() if l.strip().startswith("- ")]
        d.update(words=words, seconds_165wpm=secs, seconds_mrpop=round(words / WPM_REAL * 60, 1),
                 hook_score=float(hs[1]) if hs else None, hook_grade=hs[2] if hs else None,
                 human_score=float(hu[1]) if hu else None, human_grade=hu[2] if hu else None,
                 beat_flags=list(dict.fromkeys(flags)), status=d.get("status", "draft"))
        out.append(d)
        print(f"{d['id']:<20} {words:3d} words  {secs:5.1f}s@165  ~{d['seconds_mrpop']:4.1f}s Mr.Pop  hook {d['hook_score']} {d['hook_grade']}  human {d['human_score']} {d['human_grade']}")
    (HERE / "drafts.json").write_text(json.dumps({"updated": "2026-11-14", "plan": "content/plans/2026-11-next-posts.md", "drafts": out}, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
