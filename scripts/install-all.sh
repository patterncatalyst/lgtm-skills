#!/usr/bin/env bash
# Install skills from this repo into the local Claude skills directory.
#
#   scripts/install-all.sh                      # install/refresh all skills
#   scripts/install-all.sh lgtm-git             # just one
#   scripts/install-all.sh --dry-run            # show what would change
#
# Destination defaults to ~/.claude/skills, override with CLAUDE_SKILLS_DIR.
#
# This makes the repo the source of truth: each skill directory is replaced
# outright, so files deleted here disappear there too. Skills installed locally
# but absent from this repo are NEVER touched — they're reported as orphans so
# you can import them (see lgtm-systems-programming) or delete them yourself.
# Silently deleting someone's only copy of a skill is not this script's call.
set -euo pipefail

cd "$(dirname "$0")/.."

DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
DRY_RUN=0
names=()

for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    -h|--help)    sed -n '2,12p' "$0" | sed 's/^# \?//'; exit 0 ;;
    -*)           echo "unknown option: $arg" >&2; exit 2 ;;
    *)            names+=("$arg") ;;
  esac
done

[ "${#names[@]}" -gt 0 ] || names=($(ls skills))

say () { [ "$DRY_RUN" -eq 1 ] && echo "  would $*" || echo "  $*"; }

install_one () {
  local name="$1" src="skills/$1" dst="$DEST/$1"
  [ -f "$src/SKILL.md" ] || { echo "  skip: $src has no SKILL.md" >&2; return; }

  # Same content already installed? Nothing to do.
  if [ -d "$dst" ] && diff -rq "$src" "$dst" >/dev/null 2>&1; then
    echo "  ok:   $name (unchanged)"
    return
  fi

  local verb="install"
  [ -d "$dst" ] && verb="update "
  say "$verb $name"
  [ "$DRY_RUN" -eq 1 ] && return

  # Replace wholesale rather than copying over the top, so files removed from
  # the repo don't survive in the install. cp -r preserves the exec bits the
  # lab scripts need.
  rm -rf "$dst"
  cp -r "$src" "$dst"
}

echo "Installing into $DEST"
mkdir -p "$DEST"
for n in "${names[@]}"; do install_one "$n"; done

# Anything installed that this repo doesn't know about. Common causes: a skill
# authored locally and never imported, or a rename that left the old directory
# behind (the /caveman → /lgtm-caveman case).
orphans=()
for d in "$DEST"/*/; do
  n="$(basename "$d")"
  [ -d "skills/$n" ] || orphans+=("$n")
done

if [ "${#orphans[@]}" -gt 0 ]; then
  echo
  echo "Installed but not in this repo (left untouched):"
  for n in "${orphans[@]}"; do echo "  - $n"; done
  echo "Import with: cp -r \"$DEST/<name>\" skills/ && python3 scripts/gen-catalog.py"
fi

echo
echo "Restart Claude Code to pick up added, renamed, or removed skills."
