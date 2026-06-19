#!/usr/bin/env bash
# Package every skill under skills/ into an installable <name>.skill file in dist/.
#
#   scripts/package-all.sh            # build all skills
#   scripts/package-all.sh lgtm-git   # build just one
#
# A .skill file is a zip whose single top-level entry is the skill directory
# (matching the layout Anthropic's skill tooling expects). __pycache__ and other
# build cruft are excluded. dist/ is git-ignored; these artifacts belong on
# GitHub Releases, not in the tree.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p dist

build_one () {
  local name="$1"
  [ -f "skills/$name/SKILL.md" ] || { echo "skip: skills/$name has no SKILL.md"; return; }
  python3 - "$name" <<'PY'
import sys, zipfile, pathlib
name = sys.argv[1]
root = pathlib.Path("skills") / name
out = pathlib.Path("dist") / f"{name}.skill"
skip = {"__pycache__"}
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(root.rglob("*")):
        if any(part in skip for part in p.parts) or p.suffix in {".pyc"} or p.name == ".DS_Store":
            continue
        if p.is_file():
            z.write(p, p.relative_to(root.parent))
print(f"  dist/{name}.skill")
PY
}

if [ "$#" -gt 0 ]; then
  for n in "$@"; do build_one "$n"; done
else
  echo "Packaging all skills:"
  for d in skills/*/; do build_one "$(basename "$d")"; done
fi
