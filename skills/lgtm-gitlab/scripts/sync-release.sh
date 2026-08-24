#!/usr/bin/env bash
#
# sync-release.sh — apply a versioned release tarball over the current working
# tree, then commit, push, and (if a pipeline exists) watch the GitLab pipeline.
#
# Usage:
#   sync-release.sh <tarball> "<commit message>" [-- <exclude-glob>...]
#
# Commit messages follow references/commit-conventions.md (type(scope): summary).
# Scope a release sync to the iteration: rNN.x (or rNN).
#
# Examples:
#   sync-release.sh ~/Downloads/siftr_r1.0.tar.gz \
#     "docs(r1): add image-data guide; targets template"
#
#   # keep a customized local file from being overwritten:
#   sync-release.sh ~/Downloads/siftr_r1.0.tar.gz \
#     "feat(r2): structured image/package collector" -- 'docs/*.local.md' 'configs/sources.json'
#
# Assumes `git` and the GitLab CLI `glab` are installed and `glab` is
# authenticated (glab auth login).
set -euo pipefail

TARBALL="${1:?usage: sync-release.sh <tarball> \"<commit message>\" [-- excludes...]}"
MSG="${2:?error: commit message required}"
shift 2

# Anything after `--` is treated as extra tar --exclude patterns.
EXCLUDES=()
if [ "${1:-}" = "--" ]; then
  shift
  for pat in "$@"; do EXCLUDES+=(--exclude="${pat}"); done
fi

[ -f "${TARBALL}" ] || { echo "error: tarball not found: ${TARBALL}" >&2; exit 1; }
[ -d .git ]         || { echo "error: not a git repo — run from the project root" >&2; exit 1; }

# Decide whether the archive is wrapped in a single top-level directory.
# If so, --strip-components=1 flattens it into the current tree.
TOPS="$(tar -tzf "${TARBALL}" | sed -e 's#/.*##' | sort -u)"
STRIP=()
if [ "$(printf '%s\n' "${TOPS}" | grep -c .)" -eq 1 ] && tar -tzf "${TARBALL}" | grep -q '/'; then
  echo "Detected single top-level dir '${TOPS}' -> using --strip-components=1"
  STRIP=(--strip-components=1)
else
  echo "Archive files are at the root -> not stripping components"
fi

# --overwrite is GNU tar (Fedora/Linux). On macOS bsdtar it is usually the
# default and can be omitted; if it errors there, remove it.
OVERWRITE=(--overwrite)
tar --version 2>/dev/null | grep -qi 'bsdtar' && OVERWRITE=()

echo "Extracting ${TARBALL} over $(pwd) ..."
tar -xzf "${TARBALL}" "${STRIP[@]}" "${OVERWRITE[@]}" -C . "${EXCLUDES[@]}"

git add -A
if git diff --cached --quiet; then
  echo "No changes after extraction — nothing to commit."
  exit 0
fi

git commit -m "${MSG}"
git push

# Watch the GitLab pipeline — only meaningful if a .gitlab-ci.yml exists.
if [ -f .gitlab-ci.yml ] && command -v glab >/dev/null 2>&1; then
  echo "Waiting for the GitLab pipeline to register..."
  sleep 5
  # `glab ci status` shows the latest pipeline for the current branch;
  # fall back to a plain list if the status view isn't available.
  glab ci status || glab ci list || true
else
  echo "No .gitlab-ci.yml (or glab missing); skipping GitLab pipeline watch."
fi

echo "Done."
