#!/usr/bin/env bash
# One-time (and repeatable) skill install for MRR Pop Studio.
# Moves skills into Claude Code's native project location: .claude/skills/<name>/SKILL.md
#  - skills/ig-*        → .claude/skills/   (first run only; skills/ is then emptied)
#  - inbox/skills/*     → .claude/skills/   (new skills Claude drafted remotely)
#  - skills/mrrpop-voice.md → .claude/instagram/voice.md and ~/.claude/instagram/voice.md
set -e
cd "$(dirname "$0")/.."
mkdir -p .claude/skills .claude/instagram "$HOME/.claude/instagram"
for src in skills/ig-* skills/mrrpop-* inbox/skills/*; do
  [ -d "$src" ] || continue
  name=$(basename "$src"); rm -rf ".claude/skills/$name"; mv "$src" ".claude/skills/$name"; echo "→ installed $name"
done
if [ -f skills/mrrpop-voice.md ]; then
  cp skills/mrrpop-voice.md .claude/instagram/voice.md
  [ -f "$HOME/.claude/instagram/voice.md" ] || cp skills/mrrpop-voice.md "$HOME/.claude/instagram/voice.md"
  mv skills/mrrpop-voice.md .claude/instagram/voice.source.md
fi
[ -d skills/_vendor ] && { mkdir -p .claude/skills/_vendor; mv skills/_vendor/* .claude/skills/_vendor/ 2>/dev/null || true; }
rmdir skills/_vendor skills 2>/dev/null || true
echo "✅ Skills in .claude/skills: $(ls .claude/skills | tr '\n' ' ')"
