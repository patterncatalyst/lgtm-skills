#!/usr/bin/env bash
# Apply the standard `main` ruleset and squash-only merge settings.
#
# Usage (from the repo root):
#   gh-protect-branch.sh [--delete-others] <check> [<check>...]
#
# <check> is a required status check context (a job name, or job id when it has
# no name), normally the summary jobs such as `tests-ok`. Run this only after the
# PR adding those workflows has merged, so the checks exist.
set -euo pipefail

delete_others=0
checks=()
for arg in "$@"; do
  case "$arg" in
    --delete-others) delete_others=1 ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    -*) echo "unknown option: $arg" >&2; exit 2 ;;
    *) checks+=("$arg") ;;
  esac
done

if [ "${#checks[@]}" -eq 0 ]; then
  echo "usage: $(basename "$0") [--delete-others] <check> [<check>...]" >&2
  exit 2
fi

slug="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
echo "Repository: $slug"

body="$(printf '%s\n' "${checks[@]}" | jq -R . | jq -s '{
  name: "main",
  target: "branch",
  enforcement: "active",
  bypass_actors: [],
  conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
  rules: [
    { type: "deletion" },
    { type: "non_fast_forward" },
    { type: "pull_request", parameters: {
        required_approving_review_count: 0,
        dismiss_stale_reviews_on_push: false,
        require_code_owner_review: false,
        require_last_push_approval: false,
        required_review_thread_resolution: false,
        allowed_merge_methods: ["squash"] } },
    { type: "required_status_checks", parameters: {
        strict_required_status_checks_policy: false,
        required_status_checks: map({ context: . }) } }
  ]
}')"

existing="$(gh api "repos/$slug/rulesets" --jq '.[] | [.id, .name] | @tsv')"

main_id=""
others=()
while IFS=$'\t' read -r id name; do
  [ -n "$id" ] || continue
  if [ "$name" = "main" ] && [ -z "$main_id" ]; then
    main_id="$id"
  else
    others+=("$id	$name")
  fi
done <<<"$existing"

if [ -n "$main_id" ]; then
  echo "Updating ruleset main (id $main_id)"
  gh api -X PUT "repos/$slug/rulesets/$main_id" --input - <<<"$body" >/dev/null
else
  echo "Creating ruleset main"
  gh api -X POST "repos/$slug/rulesets" --input - <<<"$body" >/dev/null
fi

echo "Setting merge settings (squash only, delete branch on merge)"
gh api -X PATCH "repos/$slug" \
  -F delete_branch_on_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false >/dev/null

for entry in "${others[@]}"; do
  id="${entry%%$'\t'*}"
  name="${entry#*$'\t'}"
  if [ "$delete_others" -eq 1 ]; then
    echo "Deleting ruleset $name (id $id)"
    gh api -X DELETE "repos/$slug/rulesets/$id" >/dev/null
  else
    echo "WARNING: other ruleset '$name' (id $id) exists; review it, or rerun with --delete-others" >&2
  fi
done

if gh api "repos/$slug/branches/main/protection" >/dev/null 2>&1; then
  echo "WARNING: classic branch protection exists on main; remove it with:" >&2
  echo "  gh api -X DELETE repos/$slug/branches/main/protection" >&2
fi

echo "Result:"
gh api "repos/$slug/rulesets" --jq '.[] | "  \(.id)\t\(.name)\t\(.enforcement)"'
gh api "repos/$slug/rulesets" --jq '.[] | select(.name == "main") | .id' | head -n1 | while read -r id; do
  gh api "repos/$slug/rulesets/$id" \
    --jq '.rules[] | "  rule: \(.type)" + (if .parameters.required_status_checks then " " + (.parameters.required_status_checks | map(.context) | join(",")) else "" end)'
done
