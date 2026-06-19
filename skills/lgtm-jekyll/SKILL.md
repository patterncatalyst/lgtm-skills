---
name: lgtm-jekyll
description: Scaffold and author a polished chapter-based documentation or tutorial website as a Jekyll/GitHub Pages site, in the house style of the "eBPF with Aya" book - Red Hat fonts, one configurable accent color, a card-grid homepage, two-level Part to Chapter navigation, numbered chapter pages with breadcrumb and prev/next, dark fenced code, callouts, and a paired SVG+Excalidraw diagram workflow with its own generator. Bundles the battle-tested site.css (with the table-layout and inline-code-wrap fixes), the four layouts, the diagram engine, and the authoring and validation conventions. Use this whenever someone wants to START or BUILD OUT a documentation site, tutorial, handbook, course, technical book, or multi-chapter guide as a Jekyll site, or wants a site "like the eBPF book", the "same theme/layout/colors", "parts and chapters", a "card landing page", or chapter pages with diagrams. Also use for "add a chapter" or "make a diagram" tasks touching such a site's _docs, _parts, _plans, or assets.
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
