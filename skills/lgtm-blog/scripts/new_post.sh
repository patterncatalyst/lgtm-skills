#!/usr/bin/env bash
# Scaffold a new Pattern Catalyst blog post with house front matter.
#
#   new_post.sh "A Specific, Concrete Title" <source-repo-slug>
#
# Creates _posts/YYYY-MM-DD-<slug>.md in the blog repo (today's date), with the
# canonical_project block pre-filled from the hub's _data/sites.yml when the slug
# is found there. Prints the path; does not overwrite an existing file.
#
# Env overrides:
#   BLOG_DIR   default ~/Dev/patterncatalyst-blog
#   HUB_DIR    default ~/Dev/patterncatalyst-workshops-tutorials-list
#   POST_DATE  default today (YYYY-MM-DD)
set -euo pipefail

BLOG_DIR="${BLOG_DIR:-$HOME/Dev/patterncatalyst-blog}"
HUB_DIR="${HUB_DIR:-$HOME/Dev/patterncatalyst-workshops-tutorials-list}"
POST_DATE="${POST_DATE:-$(date +%F)}"

title="${1:-}"
slug_src="${2:-}"
[ -n "$title" ] || { echo "usage: new_post.sh \"<Title>\" <source-repo-slug>" >&2; exit 2; }

# slugify: lowercase, non-alnum -> hyphen, collapse, trim
slug="$(printf '%s' "$title" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')"

out="$BLOG_DIR/_posts/${POST_DATE}-${slug}.md"
[ -e "$out" ] && { echo "refusing to overwrite: $out" >&2; exit 1; }

# Pull the source project's display name + URLs from the hub sites.yml if present.
proj_name="Source Project Name"
proj_url="https://patterncatalyst.github.io/${slug_src:-<source-repo>}/"
if [ -n "$slug_src" ] && [ -f "$HUB_DIR/_data/sites.yml" ]; then
  found="$(awk -v s="$slug_src" '
    $0 ~ "slug: \"" s "\"" {hit=1}
    hit && /title:/   {sub(/^[^"]*"/,""); sub(/".*/,""); print "T=" $0; }
    hit && /site_url:/ {sub(/^[^"]*"/,""); sub(/".*/,""); print "U=" $0; hit=0}
  ' "$HUB_DIR/_data/sites.yml")"
  t="$(printf '%s\n' "$found" | sed -n 's/^T=//p' | head -1)"
  u="$(printf '%s\n' "$found" | sed -n 's/^U=//p' | head -1)"
  [ -n "$t" ] && proj_name="$t"
  [ -n "$u" ] && proj_url="$u"
fi

mkdir -p "$BLOG_DIR/_posts"
cat > "$out" <<EOF
---
title: "$title"
date: $POST_DATE
author: "Pattern Catalyst"
tags: []
categories: []
canonical_project:
  name: "$proj_name"
  repo: "patterncatalyst/${slug_src:-<source-repo>}"
  url: "$proj_url"
excerpt: "One-sentence summary used on the listing and in the feed."
---

Open with a concrete hook, then make the argument section by section. Every post
needs real code samples and at least one diagram.

---

**Source project.** This post is drawn from the
[<chapter>]($proj_url) of the
[$proj_name]($proj_url). Full source is on
[GitHub](https://github.com/patterncatalyst/${slug_src:-<source-repo>}).
EOF

echo "$out"
