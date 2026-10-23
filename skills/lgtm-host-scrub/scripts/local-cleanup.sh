#!/usr/bin/env bash
# Remove local copies of history that a rewrite replaced, so a later push cannot
# re-publish it.
#
#   local-cleanup.sh <repo-dir>            report only (default)
#   local-cleanup.sh --apply <repo-dir>    remove what the report lists
#
# Removed with --apply: extra worktrees with no uncommitted changes (agent worktrees
# under .claude/worktrees are the usual ones), local branches not contained in any
# remote-tracking branch, the reflog, and unreachable objects (gc --prune=now).
# Never removed: a worktree with uncommitted changes, stashes, the current branch.
# Those are reported for the owner to decide.
set -euo pipefail

apply=0
if [[ "${1:-}" == "--apply" ]]; then apply=1; shift; fi
repo="$(git -C "${1:-.}" rev-parse --show-toplevel)"
g=(git -C "$repo")

"${g[@]}" fetch -q --prune --tags --force origin
current="$("${g[@]}" branch --show-current)"

echo "== worktrees"
mapfile -t trees < <("${g[@]}" worktree list --porcelain | awk '/^worktree /{print $2}' | tail -n +2)
for t in "${trees[@]}"; do
  if [[ -n "$(git -C "$t" status --porcelain 2>/dev/null)" ]]; then
    echo "  KEEP (uncommitted changes): $t"
  elif (( apply )); then
    "${g[@]}" worktree unlock "$t" 2>/dev/null || true
    "${g[@]}" worktree remove --force "$t" && echo "  removed: $t"
  else
    echo "  would remove: $t"
  fi
done
(( ${#trees[@]} )) || echo "  (only the main worktree)"
"${g[@]}" worktree prune

echo "== local branches not on any remote"
n=0
while read -r b sha; do
  [[ "$b" == "$current" ]] && { echo "  KEEP (current branch): $b"; continue; }
  if [[ -z "$("${g[@]}" for-each-ref --contains "$sha" --format=x refs/remotes)" ]]; then
    n=$((n + 1))
    if (( apply )); then "${g[@]}" branch -D "$b" >/dev/null && echo "  deleted: $b"
    else echo "  would delete: $b"; fi
  fi
done < <("${g[@]}" for-each-ref --format='%(refname:short) %(objectname)' refs/heads)
(( n )) || echo "  (none)"

stashes="$("${g[@]}" stash list | wc -l)"
(( stashes == 0 )) || echo "== $stashes stash(es): KEEP; they may hold old history. Inspect with git stash list"

echo "== reflog and unreachable objects"
if (( apply )); then
  "${g[@]}" reflog expire --expire=now --all
  "${g[@]}" gc -q --prune=now
  echo "  reflog expired, gc --prune=now done"
else
  echo "  would expire the reflog ($("${g[@]}" reflog --all | wc -l) entries) and gc --prune=now"
fi
(( apply )) || echo "Re-run with --apply to do it."
