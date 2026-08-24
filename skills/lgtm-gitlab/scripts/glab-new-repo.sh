#!/usr/bin/env bash
#
# glab-new-repo.sh — initialize (if needed) and create a GitLab project from the
# current directory, then push. Private by default. Supports groups/subgroups.
#
# Usage:
#   glab-new-repo.sh [path] [description]
#
#   path         Full project path INCLUDING group/subgroup, e.g.
#                  lightwell/ga-speedrun/my-project
#                Bare name (no slash) creates under your personal namespace.
#                Default: current directory name (personal namespace).
#   description  optional one-line description
#
# Env:
#   VISIBILITY   private (default) | public | internal
#   GITLAB_HOST  GitLab instance (e.g. gitlab.cee.redhat.com). Usually unnecessary
#                if glab is already configured for that instance.
#
# Assumes `glab` is installed and authenticated (glab auth login). The parent
# group/subgroup must already exist — glab does not create groups.
set -euo pipefail

PATH_ARG="${1:-$(basename "$PWD")}"
DESC="${2:-}"
VIS="${VISIBILITY:-private}"

command -v glab >/dev/null 2>&1 || { echo "error: glab (GitLab CLI) not found" >&2; exit 1; }
if ! glab auth status >/dev/null 2>&1; then
  echo "error: glab is not authenticated — run: glab auth login" >&2
  exit 1
fi

case "${VIS}" in
  private)  VFLAG=(--private) ;;
  public)   VFLAG=(--public) ;;
  internal) VFLAG=(--internal) ;;
  *) echo "error: unknown VISIBILITY '${VIS}' (private|public|internal)" >&2; exit 1 ;;
esac

# Initialize a repo if this directory isn't one yet.
if [ ! -d .git ]; then
  echo "Initializing git repo (branch: main)..."
  git init -b main
fi

if ! git config user.email >/dev/null 2>&1; then
  echo "warning: git user.email is not set; commit author may be wrong." >&2
  echo "         set it with: git config user.email \"you@example.com\"" >&2
fi

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "Creating initial commit..."
  git add -A
  git commit -m "Initial commit"
fi

BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo main)"

# If origin already exists, just push.
if git remote get-url origin >/dev/null 2>&1; then
  echo "origin already configured: $(git remote get-url origin)"
  echo "Pushing ${BRANCH}..."
  git push -u origin "${BRANCH}"
  echo "Done."
  exit 0
fi

echo "Creating ${VIS} GitLab project '${PATH_ARG}' and pushing..."
# glab creates the project on the configured instance. Path may be group/subgroup/name.
glab repo create "${PATH_ARG}" "${VFLAG[@]}" ${DESC:+--description "${DESC}"} || {
  echo "error: 'glab repo create' failed." >&2
  echo "       - The parent group/subgroup must already exist (glab won't create groups)." >&2
  echo "       - Confirm you have Developer/Maintainer rights on that group." >&2
  exit 1
}

# glab may or may not wire the remote depending on version; ensure origin exists.
if ! git remote get-url origin >/dev/null 2>&1; then
  HOSTPART="${GITLAB_HOST:-$(glab config get host 2>/dev/null || echo gitlab.com)}"
  git remote add origin "https://${HOSTPART}/${PATH_ARG}.git"
fi
git push -u origin "${BRANCH}"

echo "Done."
