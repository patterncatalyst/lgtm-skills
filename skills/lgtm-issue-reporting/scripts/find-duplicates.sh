#!/usr/bin/env bash
# Search an upstream repo's issues (open and closed) for each term, before drafting a report.
#
#   find-duplicates.sh <owner/repo> <term> [<term> ...]
#   find-duplicates.sh smallrye/smallrye-graphql "Unknown Scalar Type" "@Id List" "isDeprecated"
#
# Prints, per term, "#N state title" for up to LIMIT hits (default 10, env LIMIT), deduplicated
# across terms at the end. Read every open hit in full (gh issue view N -R owner/repo --comments)
# before deciding to file, comment, or file a narrower issue that links it.
# Needs an authenticated GitHub CLI (gh).
set -euo pipefail

if [[ $# -lt 2 ]]; then
  sed -n '2,10p' "$0" | sed 's/^# \?//'
  exit 2
fi

repo="$1"; shift
limit="${LIMIT:-10}"
all=()

for term in "$@"; do
  echo "== $term"
  # Flags first; "--" ends option parsing so a term may start with "-" or "@".
  hits="$(gh search issues --repo "$repo" --limit "$limit" \
            --json number,state,title --jq '.[] | "#\(.number) \(.state) \(.title)"' -- "$term" || true)"
  if [[ -z "$hits" ]]; then
    echo "   (no matches)"
  else
    while IFS= read -r line; do
      echo "   $line"
      all+=("$line")
    done <<<"$hits"
  fi
done

echo
echo "== distinct hits across all terms (open first)"
if [[ ${#all[@]} -eq 0 ]]; then
  echo "   (none)"
else
  printf '%s\n' "${all[@]}" | sort -u | sort -k2,2r -k1,1 | sed 's/^/   /'
fi
