---
name: lgtm-jekyll
description: Scaffold and author a polished chapter-based documentation or tutorial website as a Jekyll/GitHub Pages site, in the house style of the "eBPF with Aya" book - Red Hat fonts, one configurable accent color, a card-grid homepage, two-level Part to Chapter navigation, numbered chapter pages with breadcrumb and prev/next, dark fenced code, callouts, and a paired SVG+Excalidraw diagram workflow with its own generator. Bundles the battle-tested site.css (with the table-layout and inline-code-wrap fixes), the four layouts, the diagram engine, and the authoring and validation conventions. Use this whenever someone wants to START or BUILD OUT a documentation site, tutorial, handbook, course, technical book, or multi-chapter guide as a Jekyll site, or wants a site "like the eBPF book", the "same theme/layout/colors", "parts and chapters", a "card landing page", or chapter pages with diagrams. Also use for "add a chapter" or "make a diagram" tasks touching such a site's _docs, _parts, _plans, or assets. Also supports a "blog mode" for a post-centric site (dated posts under _posts, tags/categories, pagination via jekyll-paginate-v2, RSS, and an essay-style single-post layout) in the same house style — use it for "start a blog", "add a blog", "blog post site", or "add a post".
---

# LGTM Jekyll — chaptered technical-book site

This skill builds and maintains a Jekyll site in the house style of the
"eBPF with Aya" book: a card-grid landing page, **two-level navigation**
(Home → Part → Chapter), numbered chapter pages with breadcrumb + prev/next,
a warm single-accent theme on Red Hat fonts, dark fenced code, callouts, and a
paired **SVG + Excalidraw** diagram workflow. The complete, *already-refined*
skeleton lives in `assets/site-template/` — scaffolding is mostly **copying those
files** and filling in a few config values, not writing markup. The diagram
generator is in `scripts/`, and the conventions that keep a multi-chapter book
consistent are in `references/`.

This is the loaded, opinionated sibling of a generic chaptered-site theme: the
CSS already carries the table-wrapping and inline-code-wrap fixes, the diagram
engine defaults to readable dark labels, and the references encode the depth
standard and validation checks used to build a 70-chapter book.

## What gets produced

```
your-site/
├── _config.yml              # site identity + collections + default layouts
├── Gemfile                  # Jekyll 4.3 + GH-Pages-compatible plugins
├── index.html               # hero + Part cards
├── .github/workflows/pages.yml   # build on any branch, deploy from main
├── _layouts/   default · tutorial · part_index · plan
├── _includes/  header · footer · excalidraw (paired SVG+Excalidraw embed)
├── assets/css/site.css      # the theme — all design tokens live here
├── assets/diagrams/         # name.svg + name.excalidraw pairs + a catalogue
├── _docs/      one file per Chapter
├── _parts/     one file per Part (the homepage cards)
└── _plans/     plain pages (roadmaps, changelogs, reconciliation notes)
```

## Scaffold it (the procedure)

0. **Create the remote first, then branch.** Before scaffolding, create the
   GitHub repo — remote and public — so the work is backed up off this machine
   from the start (`gh repo create <name> --public --source=. --remote=origin
   --push`, or `scripts/gh-new-repo.sh` from **lgtm-github**; private only on
   request — a PRD saying "private until release" is not a request). Enable
   Pages (Source: GitHub Actions) and set the About website link at creation.
   Then make the iteration's branch (`git checkout -b release/r00`) and do the
   scaffolding there, opening a PR to merge; every later iteration gets its own
   `release/rNN` branch and PR (see **lgtm-github** §5). Never build out a whole site
   local-only — see "Project bootstrap order" in **lgtm-github**.
1. **Copy the skeleton.** Copy everything in `assets/site-template/` into the
   repo root, then move `workflow-pages.yml` to `.github/workflows/pages.yml`
   (it's stored flat because skills don't carry dot-directories).
2. **Fill in `_config.yml`** — `title`, `description`, `brand_emoji`,
   `github_username`, `github_repo`, and `baseurl` (`"/repo-name"` for a project
   Pages site, `""` for a user/org site).
3. **Recolor / rebrand if wanted** — see `references/theming.md`. The accent is
   one token trio in `assets/css/site.css`; the glyph is `brand_emoji`; the fonts
   are one `<link>` + the `--font-*` tokens.
4. **Write content** — add `_parts/*.md` (cards) and `_docs/*.md` (chapters). The
   bundled samples make the nav resolve immediately; edit or replace them.
5. **Run it** — `bundle install`, then `bundle exec jekyll serve --baseurl ""`.
   Push to GitHub and set Settings → Pages → Source: **GitHub Actions** once.

## Wire the listing/index pages (do NOT ship empty index pages)

The template ships the *shells* of the index pages (Chapters, Examples,
Diagrams, Bibliography). Each must be wired to its content before the site is
"done", or you get live 404s and blank pages that only surface in a later QA
pass. Check every one against a shipped reference site:

- **Chapters nav → a landing that exists.** The header links to
  `/docs/00-index/`. That URL must resolve — ship a `/docs/00-index/` map page
  (a table of contents iterating `site.parts` → `site.docs`). If the order-0
  slot is taken by a prerequisites chapter, make the map a standalone page with
  `permalink: /docs/00-index/` rather than colliding on `order`.
- **Examples page → a populated `_examples/` collection.** `examples.html`
  iterates `site.examples`; the runnable code under `examples/` is excluded from
  the build, so you need one `_examples/<slug>.md` collection doc per demo
  (front matter: `card_eyebrow`/`card_title`/`card_blurb`/`order`/`permalink:
  /examples/<slug>/`, body linking the chapter and the GitHub source). No
  collection docs → a blank Examples page and 404 per-demo pages.
- **Diagrams page → a wired gallery.** `diagrams.html` must loop over the actual
  figures, not a "no diagrams yet" placeholder. Build a `_data/diagrams.yml`
  (name/section/title/caption, one per figure) and loop `diagram-card.html` over
  it; the entries can be extracted from the chapters' `{% include excalidraw.html %}`
  calls so the gallery and the chapters never drift.
- **part_index reuses the chapter (`tutorial.html`) class vocabulary** —
  `tutorial__header` / `tutorial__breadcrumb` / `tutorial__pager`, not a parallel
  `doc-page`/`pager` set with inline styles. A divergent part_index renders
  unstyled. Keep it identical to the shipped reference's `part_index.html`.
- **Bibliography page uses the house table format** (Title linked + `<small>`
  blurb, Author(s), Publisher, Year), matching the hub's Books page.

After wiring, build and actually open each index page (not just `/`) — a clean
`jekyll build` does not prove the index pages have content. See the
`lgtm-tutorial` publishing checklist for the cross-site (hub + books) steps.

## The content model

**A Part** (`_parts/name.md`) is a homepage card and a landing page listing its
chapters:

```yaml
---
title: "Getting started"
order: 0                      # cards render "Part {order}"
part_name: "Getting started"  # the exact string chapters reference in `part:`
blurb: "One-line description shown on the card."
---
```

**A Chapter** (`_docs/NN-name.md`) is a numbered page. Its `part:` **must exactly
equal** some part's `part_name` — that is the link between the two:

```yaml
---
title: "Your first chapter"
order: 1                      # sort key + big page number; 0 renders as "Overview"
part: "Getting started"       # MUST match a _parts part_name exactly
description: "Shown under the title and on the part card."
duration: 15 minutes          # optional chip
---
```

Homepage, part pages, breadcrumb, and prev/next are all derived from `order` and
the `part`/`part_name` match. Use `_plans/*.md` (layout `plan`,
`render_with_liquid: false`) for plain pages where you want literal `{{ }}`.

## Blog mode (posts instead of chapters)

For a post-centric site (dated articles, tags, categories, RSS) rather than a
chaptered book, keep the same theme and build a thin posts layer on top of it.
Give the blog its **own repo**, separate from any hub or doc site, so its publish
cadence and failure domain stay independent. The reference implementation is the
`patterncatalyst-blog` repo; the deltas from the chaptered scaffold are:

- **Collections.** Use the built-in `_posts/` (`_posts/YYYY-MM-DD-slug.md`);
  drop `_docs/_parts/_plans` and their collection config.
- **`_config.yml`.** `permalink: /:year/:month/:day/:title/`; a `defaults` block
  mapping `type: posts` to `layout: post`; add `jekyll-paginate-v2` with
  `pagination:` (per-page list) and `autopages:` (tag and category index pages).
  Keep `jekyll-feed` for `/feed.xml`.
- **Gemfile.** Add `gem "jekyll-paginate-v2"`. This works only because
  `pages.yml` builds with `bundle exec jekyll build`; the restricted
  `github-pages` gem would reject it. Do **not** switch to
  `actions/jekyll-build-pages`.
- **Templates.** `post.html` (single post), `post_list.html` (tag/category
  pages), and a `post_table.html` include used by the home page and the
  autopages. Post **listings render as tables**, not card grids.

A post's front matter:

```yaml
---
title: "A specific, concrete title"
date: 2026-10-07
author: "Pattern Catalyst"
tags: [tag-a, tag-b]
categories: [cloud-native]
canonical_project:                 # the source project this is mined from
  name: "Source Project Name"
  repo: "patterncatalyst/<source-repo>"
  url: "https://patterncatalyst.github.io/<source-repo>/"
excerpt: "One sentence used on the listing and in the feed."
# hero: /assets/img/heroes/<name>.svg   # optional, off by default
---
```

**Single-post layout is an essay, not a doc page.** Target the clean, readable
"Beautiful Jekyll" feel (for example `https://vladikk.com/`), in the house style
(Red Hat fonts, amber accent) and with **no AI/stock hero art**. The look lives
in `post.html` plus a `.post-article*` block in `site.css`; the properties to
hold:

- Single centered column, reading measure **~46rem (~736px)**; no breadcrumb,
  no sidebar, no section accent bar (`h2::before`) from the chaptered `.tutorial`
  layout.
- Header: a small category **kicker**, a large **title**, then a clean byline
  (`Month D, YYYY · N min read · author`; reading time from `content |
  number_of_words`). Tag chips under it.
- Body **~1.15rem / 1.8 line-height**, with a slightly larger **lead paragraph**.
- Keep the content body on the shared `.tutorial__body` class so code, figures,
  callouts, and tables stay styled; `.post-article__body` only changes the feel.

Link a post back to its source project with the in-body credit and, if there is a
hub site, feature it there by adding an entry to the hub's `_data/blogs.yml`
(point hub-ward links at `{{ site.hub_url }}`). Write post prose in the
`lgtm-professional-voice` register: no em-dash overuse, no contrived phrasing.

## Diagrams

Diagrams are paired `name.svg` (committed/embedded) + `name.excalidraw`
(editable). Generate both with `scripts/generate_diagram.py` — see
`references/diagram-engine.md` for the `emit(...)` API, the node styles, the
**dark-label** rule, and the validation step. Embed with the `excalidraw.html`
include (wrap the literal Liquid in `{% raw %}` in prose).

## Non-obvious rules (these cause real build breaks)

- **Quote any front-matter value containing a colon** — an unquoted `:` breaks
  YAML and the build.
- **In chapter prose, wrap literal `{{ }}`/`{% %}` in `{% raw %}…{% endraw %}`**
  so Liquid doesn't interpret it (the diagram-include example shows the pattern).
- **`part:` must match a `part_name` exactly** (case + spacing) or the chapter
  won't appear under its part.
- **`baseurl`**: serve locally with `--baseurl ""`; the Pages workflow injects the
  project base path at deploy.
- **Tables**: `site.css` already sets `table-layout: fixed` and wraps inline code
  in cells — don't reintroduce `white-space: nowrap` on cell code or
  `overflow-wrap: anywhere` on `th,td` (it collapses columns). See
  `references/theming.md`.

## References

- `references/theming.md` — every design token, the recolor recipe, accent
  palettes, font swapping, the full CSS class vocabulary, and the table-wrap
  rules to preserve.
- `references/diagram-engine.md` — how to drive `scripts/generate_diagram.py`:
  the `emit()` signature, node styles, edges/notes, the dark-label convention,
  vertical dividers, and validation.
- `references/authoring-conventions.md` — the depth standard for chapters, the
  static validation snippets (front matter, Liquid, alt-text, diagram parsing),
  command-prefix and "unverified" conventions, and the per-iteration packaging
  rhythm used to build a large book.

## Versions: latest stable

Always promote the latest stable release of Ruby, Jekyll, every gem, and the Node and
Actions versions in `workflow-pages.yml`, surveyed upstream at the start of work, and pin
them exactly. Step back only for an actual incompatibility (for example a gem that fails to
build on the newer Jekyll or Ruby) and record the hold and its reason next to the pin. A
GitHub Pages versions page that has not caught up is not, on its own, a reason to step back.
The template's `Gemfile` and workflow pins are a snapshot; re-check upstream and promote
before use.

## Multi-step work → `lgtm-relay`

Scaffolding a site is a relay job, not a one-shot: plan the part/chapter structure
and navigation with Opus, build the layouts, pages, and assets with parallel Sonnet
executors, then validate with Opus that nav wiring, prev/next, and the build all
hold. See the `lgtm-relay` skill. Pass this skill's structure rules into every
executor prompt — subagents do not inherit the skills loaded here.
