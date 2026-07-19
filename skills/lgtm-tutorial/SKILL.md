---
name: lgtm-tutorial
description: Author and extend a chapter-based technical tutorial delivered as a Jekyll/GitHub Pages site — write or revise chapters to a consistent depth standard, scaffold a runnable example per chapter, generate paired SVG+Excalidraw diagrams, run the static validation checks, and package each release iteration. This is the topic-agnostic *content-authoring* companion to a site-scaffolding skill — reach for it whenever you are starting a new tutorial, writing or revising chapters, adding a runnable example, making a figure for a chapter, or cutting the next tutorial iteration, even if the request is only "add a chapter", "write the next example", "make a diagram for X", or "package the next iteration". Use it to build ANY tutorial with this template; do not assume a particular subject, language, or stack.
---

# Chaptered tutorial authoring

This skill captures the conventions for authoring a chapter-based technical
tutorial so anything you add — a chapter, a runnable example, a diagram —
matches the rest of the book without a round of corrections. It is **subject-,
language-, and stack-agnostic**: it encodes *how* to write a good tutorial with
this template, not what the tutorial is about. Decide the topic and stack with
the user first, capture those choices once (see "Establish the house style"
below), then apply them consistently everywhere.

If the Jekyll site itself doesn't exist yet — the `_layouts`, CSS, homepage
cards, navigation — scaffold it first with the site-scaffolding skill, then use
*this* skill to write the content.

## The shape of the project

A Jekyll site delivered iteratively as tarballs (`<project>-rNN.x.tar.gz`):

- `_docs/NN-*.md` — chapters (a `docs` collection), ordered by `order`.
- `_parts/*.md` — the parts; each has a `part_name` and an `order`
  (homepage cards render `Part {order}`, so the first part is **Part 0**).
- `examples/NN-name/` — one runnable example per hands-on chapter, each with a
  `README.md` and a run script (e.g. `demo.sh`).
- `assets/diagrams/` — paired `<name>.svg` (embedded) + `<name>.excalidraw`
  (editable source), produced by `scripts/generate_diagram.py`.
- `_plans/` — `iteration-plan.md` (roadmap) and `reconciliation-plan.md`
  (per-claim verification log).
- `scripts/` — any project-specific build/provision/deploy helpers the
  examples need (these are tutorial-dependent; create only what your examples
  require).

**Code stays `unverified` until it is actually run in the real target
environment.** If there is no real run in the authoring loop (no hardware, no
device, no live service), write the code as carefully as possible and mark it
unverified; never self-promote code to "verified" from authoring alone.
**"Verified" means the demo produced its claimed *observable effect*, not that
it ran without error** — a program that loads/attaches/starts cleanly but whose
promised effect never happens is still broken. Drive it, watch the effect, and
write the status behaviorally (see `references/conventions.md` → "The
`unverified` discipline").

## Core disciplines (apply to everything)

- **Unverified by default.** Each chapter ends with a verification-status
  footer; each example README has a verification-status section; new claims go
  into `_plans/reconciliation-plan.md` as `unverified` until a real run
  confirms them.
- **Quote YAML descriptions that contain a colon** — an unquoted colon in
  front matter breaks the build (this causes real failures).
- **Liquid collisions:** in prose, wrap literal `{{ }}`/`{% %}` in
  `{% raw %}…{% endraw %}`; `_plans` pages render with
  `render_with_liquid: false`.
- **House style:** establish the project's conventions once (commands,
  tooling, addresses, image/package references, naming) and apply them
  identically in every chapter and example. Consistency is what makes a
  multi-chapter book feel like one book. See "Establish the house style".
- **Reader-facing prose:** do not reference "the roadmap" or "the
  requirements", and avoid "honest"/"an honest" framing — it reads as if the
  rest of the book is dishonest. Refer to other parts by name or by the correct
  `Part {order}` number.

See `references/conventions.md` for the house-style checklist, the validation
snippets, the `unverified` discipline, and the packaging rhythm.

## Establish the house style (do this once per tutorial)

Before writing chapters, pin the decisions that must stay consistent and record
them in `references/conventions.md` (or the project's own conventions page):

- **Versions** — language/runtime/library/tool versions, pinned and dated; note
  to re-verify against upstream before a release (they drift).
- **Tooling & commands** — which CLI/runtime, which container engine if any,
  loopback vs `localhost`, fully-qualified image/package refs, single-line
  pasted commands, command prefixes that show *where* a command runs.
- **Naming & site config** — `github_username`, `github_repo`, `baseurl`, the
  brand accent color, the brand emoji/glyph, and the license.
- **Verification reality** — whether there is a real run in the loop; if not,
  everything ships `unverified`.

## Adding or revising a chapter

1. Front matter: `title`, `order`, `part`, `description`, `duration`. The
   `part` value **must exactly equal** a `_parts` file's `part_name`.
2. Follow the chapter skeleton and — most importantly — the **depth standard**
   in `references/chapter-template.md`. Every hands-on chapter needs a "How the
   code works" walkthrough that explains *what the code is doing, as if the
   reader were writing it themselves*: show the real, runnable code (not stubs)
   and explain each meaningful call/decision and why it is made that way. Where
   it helps the reader confirm their build, end with a **cross-check** against
   an independent tool or method.
3. Near the "The code is in `examples/NN-name/`." line, add the run hint:
   "the run script there builds/sets up and runs it; its `README.md` covers
   what it does and how to drive it."

## Scaffolding an example

Use the runnable-example shape in `references/example-template.md`: a
self-contained directory per hands-on chapter with a clear entry point, a
run script that builds/sets up → runs → (if relevant) drives activity →
points at the result, a `README.md` that mirrors the chapter, and a closing
verification-status section. Keep the *shape* identical across examples so
that once a reader has built one, they have built them all — only the contents
change per topic.

## Making a diagram

`scripts/generate_diagram.py` emits a matching themed SVG + valid Excalidraw
from one spec of `bands` / `nodes` / `edges` / `notes`:

```python
import sys; sys.path.insert(0, "scripts")
import generate_diagram as g
g.OUT = "assets/diagrams"   # output dir
g.emit("my-diagram", 880, 300,
       bands=[{"x":20,"y":40,"w":820,"h":120,"label":"frame","fill":"#fafafa"}],
       nodes=[{"x":40,"y":70,"w":180,"h":60,"style":"accent","lines":["Title","detail"]}],
       edges=[{"x1":220,"y1":100,"x2":300,"y2":100,"label":"step","amber":True}],
       notes=[{"x":440,"y":40,"text":"caption","anchor":"middle"}])
```

Rules that keep diagrams clean (learned the hard way):

- **Nodes are drawn before edges** so arrowheads render *on top* of boxes — the
  generator does this; don't reorder.
- **A box that contains other boxes must be a `band`** (label sits top-left),
  never a `node` (whose label is centered and would hide behind the inner
  boxes).
- Make every edge **terminate on a box edge or on another arrow** — no arrows
  into empty space.
- Embed with the include, always with `alt` text and a `Figure N.x` caption:
  `{% raw %}{% include excalidraw.html file="my-diagram" alt="…" caption="Figure N.x — …" %}{% endraw %}`

Node styles available: `box`, `sub`, `accent`, `muted`, `info`, `ghost`
(dashed), `ink` (filled dark, white text). See
`references/diagram-engine.md` for the full `emit()` API.

## Validate, log, package

Before packaging, run the checks in `references/conventions.md`
(front-matter YAML parses; `part` matches a `part_name`; no stray `{{` outside
includes/`relative_url`; SVG well-formed; Excalidraw JSON valid; `bash -n` on
each run script). Then update `_plans/reconciliation-plan.md` (new claims
`unverified`) and the iteration log, clean `__pycache__` and build artifacts,
`tar -czf` the repo to the outputs directory, and present the tarball **before**
the summary message (forgetting `present_files` has left iterations
undelivered).

## References

- `references/chapter-template.md` — chapter skeleton + the depth standard, with a worked walkthrough
- `references/example-template.md` — the runnable-example shape, file by file
- `references/conventions.md` — house-style checklist, validation snippets, the `unverified` discipline, packaging
- `references/diagram-engine.md` — the `emit()` API, node styles, edges/notes, validation
- `scripts/generate_diagram.py` — the diagram compiler (import and call `emit`)

## Multi-step work → `lgtm-relay`

Authoring a chapter with its runnable example, or packaging an iteration, runs
through the `lgtm-relay` skill: Opus plans the chapter arc and acceptance criteria,
Sonnet writes prose, example, and diagram spec, Opus validates against the depth
standard and runs the static checks. Give each executor this skill's conventions
in its prompt — a subagent does not inherit them.
