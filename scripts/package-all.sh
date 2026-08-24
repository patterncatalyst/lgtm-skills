#!/usr/bin/env bash
# Package every skill under skills/ into an installable <name>_rNN.x.skill in dist/.
#
#   scripts/package-all.sh              # build all skills at the current version
#   scripts/package-all.sh lgtm-github    # build just one
#   REL=r2.x scripts/package-all.sh     # build for a specific release
#
# The version comes from REL, or from the latest r* git tag. It appears only in
# the *filename* — the directory inside the zip stays bare `<name>/`, because
# that path is the skill's identity to Claude and must not carry a version.
#
# A .skill file is a zip whose single top-level entry is the skill directory
# (matching the layout Anthropic's skill tooling expects). __pycache__ and other
# build cruft are excluded. dist/ is git-ignored; these artifacts belong on
# GitHub Releases, not in the tree.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p dist

REL="${REL:-$(git describe --tags --abbrev=0 --match='r*' 2>/dev/null || true)}"
if [ -z "$REL" ]; then
  echo "no r* tag found and REL is unset — tag the release first, or run:" >&2
  echo "  REL=r1.x scripts/package-all.sh" >&2
  exit 1
fi

# `git describe` walks backwards, so on a commit past the tag it still reports the
# old version — which would produce r1.x-named artifacts whose contents are not
# what r1.x shipped. Say so rather than let it pass silently.
if [ "$(git rev-parse -q --verify "$REL^{commit}" 2>/dev/null)" != "$(git rev-parse HEAD)" ]; then
  echo "note: HEAD is not at tag $REL — artifacts will not match that release." >&2
  echo "      set REL=<next-version> if you are preparing a new one." >&2
fi
[ -z "$(git status --porcelain)" ] || echo "note: working tree is dirty — artifacts include uncommitted changes." >&2

build_one () {
  local name="$1"
  [ -f "skills/$name/SKILL.md" ] || { echo "skip: skills/$name has no SKILL.md"; return; }
  python3 - "$name" "$REL" <<'PY'
import sys, zipfile, pathlib
name, rel = sys.argv[1], sys.argv[2]
root = pathlib.Path("skills") / name
out = pathlib.Path("dist") / f"{name}_{rel}.skill"
skip = {"__pycache__"}
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(root.rglob("*")):
        if any(part in skip for part in p.parts) or p.suffix in {".pyc"} or p.name == ".DS_Store":
            continue
        if p.is_file():
            # arcname is deliberately unversioned: `<name>/...`, not `<name>_rNN.x/...`
            z.write(p, p.relative_to(root.parent))
print(f"  {out}")
PY
}

if [ "$#" -gt 0 ]; then
  for n in "$@"; do build_one "$n"; done
else
  echo "Packaging all skills at $REL:"
  for d in skills/*/; do build_one "$(basename "$d")"; done

  sums="dist/lgtm-skills_${REL}.sha256sums.txt"
  (cd dist && sha256sum ./*_"${REL}".skill | sed 's| \./| |' > "$(basename "$sums")")
  echo "  $sums"
fi
