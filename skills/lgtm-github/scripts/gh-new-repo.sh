#!/usr/bin/env bash
#
# gh-new-repo.sh — initialize (if needed) and create a GitHub repo from the
# current directory, then push. Public by default.
#
# Usage:
#   gh-new-repo.sh [name] [description]
#
#   name         repo name (default: current directory name)
#   description  optional one-line description
#
# Env:
#   VISIBILITY   public (default) | private | internal
#   HOMEPAGE     URL for the repo's About-box website link
#   PAGES        set to 1 to derive HOMEPAGE as the GitHub Pages URL,
#                https://<owner>.github.io/<name>/ (ignored if HOMEPAGE is set)
#
# Assumes `gh` is installed and authenticated (gh auth login).
set -euo pipefail

NAME="${1:-$(basename "$PWD")}"
DESC="${2:-}"
VIS="${VISIBILITY:-public}"

command -v gh >/dev/null 2>&1 || { echo "error: gh (GitHub CLI) not found" >&2; exit 1; }
if ! gh auth status >/dev/null 2>&1; then
  echo "error: gh is not authenticated — run: gh auth login" >&2
  exit 1
fi

# Initialize a repo if this directory isn't one yet.
if [ ! -d .git ]; then
  echo "Initializing git repo (branch: main)..."
  git init -b main
fi

# Make sure identity is set, otherwise the first commit fails or is mis-authored.
if ! git config user.email >/dev/null 2>&1; then
  echo "warning: git user.email is not set; commit author may be wrong." >&2
  echo "         set it with: git config user.email \"you@example.com\"" >&2
fi

# Create the first commit if there are no commits yet.
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "Creating initial commit..."
  git add -A
  git commit -m "Initial commit"
fi

BRANCH="$(git symbolic-ref --short HEAD 2>/dev/null || echo main)"

if git remote get-url origin >/dev/null 2>&1; then
  echo "origin already configured: $(git remote get-url origin)"
  echo "Pushing ${BRANCH}..."
  git push -u origin "${BRANCH}"
else
  echo "Creating ${VIS} repo '${NAME}' and pushing..."
  gh repo create "${NAME}" \
    "--${VIS}" \
    --source=. \
    --remote=origin \
    ${DESC:+--description "${DESC}"} \
    --push
fi

# Set the About-box website link. GitHub never fills this in on its own,
# even after Pages is enabled.
if [ -z "${HOMEPAGE:-}" ] && [ "${PAGES:-0}" = "1" ]; then
  OWNER="$(gh repo view --json owner --jq '.owner.login')"
  REPO="$(gh repo view --json name --jq '.name')"
  HOMEPAGE="https://${OWNER}.github.io/${REPO}/"
fi
if [ -n "${HOMEPAGE:-}" ]; then
  echo "Setting homepage: ${HOMEPAGE}"
  gh repo edit --homepage "${HOMEPAGE}"
fi

echo "Done."
