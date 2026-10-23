#!/usr/bin/env bash
# Rewrite a published repository's history so no commit identifies the machine.
#
#   rewrite-history.sh plan  <repo-dir>    mirror-clone the remote into a scratch dir,
#                                          scan it, write the replacement rules there
#   rewrite-history.sh apply <work-dir>    run git filter-repo on the mirror with those
#                                          rules, then re-scan and compare the tip trees
#   rewrite-history.sh push  <work-dir>    force-push branches and tags to the remote
#
# Each phase stops for review; nothing is pushed until `push`, and `push` refuses while
# an active ruleset or branch protection blocks force pushes (it prints how to lift it).
# The work dir holds the rules file, which contains the identifying values: delete the
# whole work dir when done. git filter-repo runs through uvx (user-space, no install).
#
# HOST_SCRUB_WORK sets the parent of the work dir (default: a new mktemp -d).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
HOST_IDS="$HERE/host_ids.py"
FILTER_REPO=(uvx --from git-filter-repo git-filter-repo)

die() { echo "rewrite-history: $*" >&2; exit 1; }

phase="${1:-}"; target="${2:-}"
[[ -n "$phase" && -n "$target" ]] || { sed -n '2,15p' "$0" | sed 's/^# \?//'; exit 2; }

case "$phase" in
plan)
  repo="$(git -C "$target" rev-parse --show-toplevel)" || die "$target is not a git work tree"
  url="$(git -C "$repo" remote get-url origin)" || die "no origin remote in $repo"
  work="$(mktemp -d "${HOST_SCRUB_WORK:-${TMPDIR:-/tmp}}/host-scrub.XXXXXX")"
  chmod 700 "$work"
  echo "$url" > "$work/url"
  echo "$repo" > "$work/source"
  git clone -q --mirror "$url" "$work/repo.git"
  # Pull-request refs cannot be rewritten or pushed; keep them out of the mirror.
  git -C "$work/repo.git" for-each-ref --format='%(refname)' refs/pull \
    | xargs -r -n1 git -C "$work/repo.git" update-ref -d
  git -C "$work/repo.git" for-each-ref --format='%(refname) %(objectname)' > "$work/refs-before"
  set +e
  python3 "$HOST_IDS" history --repo "$work/repo.git" --emit-rules "$work/rules.txt"
  rc=$?
  set -e
  if [[ $rc -eq 0 ]]; then
    echo "history is clean: nothing to rewrite. Remove $work"
    exit 0
  fi
  cat <<EOF

Work dir: $work
Next:
  1. Review $work/rules.txt (one literal value==>replacement per line). Delete a line
     to keep that value, for example a dependency pin the scan matched.
  2. $0 apply $work
EOF
  ;;
apply)
  work="$(cd "$target" && pwd)"
  [[ -f "$work/rules.txt" && -d "$work/repo.git" ]] || die "$work is not a plan work dir"
  (cd "$work/repo.git" && "${FILTER_REPO[@]}" --force \
      --replace-text "$work/rules.txt" --replace-message "$work/rules.txt")
  set +e
  python3 "$HOST_IDS" history --repo "$work/repo.git"
  rc=$?
  set -e
  echo
  echo "Tip trees, before -> after (identical when the current tree was already scrubbed):"
  while read -r ref old; do
    [[ "$ref" == refs/heads/* || "$ref" == refs/tags/* ]] || continue
    new="$(git -C "$work/repo.git" rev-parse -q --verify "$ref^{tree}" 2>/dev/null || true)"
    oldtree="$(git -C "$(cat "$work/source")" rev-parse -q --verify "$old^{tree}" 2>/dev/null || echo '?')"
    if [[ "$new" == "$oldtree" ]]; then same=identical; else same=CHANGED; fi
    printf '  %-40s %s\n' "$ref" "$same"
  done < "$work/refs-before"
  [[ $rc -eq 0 ]] || echo "history still has hits (above): extend rules.txt and re-run plan/apply, or allow them in .host-scrub.toml"
  echo
  echo "Next, with the owner's OK for a force push: $0 push $work"
  ;;
push)
  work="$(cd "$target" && pwd)"
  url="$(cat "$work/url")"
  if slug="$(gh repo view "$url" --json nameWithOwner --jq .nameWithOwner 2>/dev/null)"; then
    blocking="$(gh api "repos/$slug/rulesets" --jq '.[] | select(.enforcement=="active") | .id' 2>/dev/null || true)"
    for id in $blocking; do
      if gh api "repos/$slug/rulesets/$id" --jq '.rules[].type' | grep -qx non_fast_forward; then
        die "ruleset $id on $slug blocks force pushes. With the owner's OK, disable it for the push:
  gh api -X PUT repos/$slug/rulesets/$id -f enforcement=disabled
  $0 push $work
  gh api -X PUT repos/$slug/rulesets/$id -f enforcement=active"
      fi
    done
    def="$(gh repo view "$slug" --json defaultBranchRef --jq .defaultBranchRef.name)"
    if gh api "repos/$slug/branches/$def/protection" >/dev/null 2>&1; then
      die "classic branch protection on $def blocks force pushes; lift it with the owner's OK first"
    fi
  fi
  # Push to the URL: filter-repo removed the mirror's origin remote.
  git -C "$work/repo.git" push --force "$url" 'refs/heads/*:refs/heads/*' 'refs/tags/*:refs/tags/*'
  cat <<EOF

Pushed. Still to do:
  - Re-sync every local clone:  git fetch --force --tags && git reset --hard origin/<branch>
    (or re-clone), then run local-cleanup.sh on it.
  - Releases keep pointing at their tags (re-pushed above); check with gh release list.
  - Pull-request refs (refs/pull/*) and cached views still hold the old commits. Only
    GitHub support can purge them: see references/support-request.md.
  - Delete the work dir, which holds the rules file:  rm -rf $work
EOF
  ;;
*) die "unknown phase: $phase (plan, apply, push)" ;;
esac
