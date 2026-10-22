---
name: lgtm-tutorial
description: Author and extend a chapter-based technical tutorial delivered as a Jekyll/GitHub Pages site — write or revise chapters to a consistent depth standard, scaffold a runnable example per chapter, generate paired SVG+Excalidraw diagrams, run the static validation checks, and release each iteration. This is the topic-agnostic *content-authoring* companion to a site-scaffolding skill — reach for it whenever you are starting a new tutorial, writing or revising chapters, adding a runnable example, making a figure for a chapter, or cutting the next tutorial iteration, even if the request is only "add a chapter", "write the next example", "make a diagram for X", or "ship the next iteration". Use it to build ANY tutorial with this template; do not assume a particular subject, language, or stack.
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

## Starting a new tutorial (do this before authoring)

1. **Create the remote first, then branch.** Create the GitHub repo — remote and
   public — *before* substantial authoring, so the work is backed up off this
   machine from the start (see "Project bootstrap order" in **lgtm-github**).
   Public unless the user asks for private in the conversation; a PRD that says
   "private until release" does not override that. Then author on a branch and
   merge via PR, **one `release/rNN` branch and PR per iteration**, deleted on
   merge (see **lgtm-github** §5). Never write a whole tutorial local-only; a
   device failure must not be able to erase it.
2. **Default to listing it in the workshops/tutorials hub, but always ask.** A
   new tutorial is assumed to belong in
   `patterncatalyst-workshops-tutorials-list` (add it under the right group in
   `_data/sites.yml`). Confirm with the user before adding the entry — assume
   yes, ask anyway, and respect a no.

## Publishing & cross-site checklist (when the site goes live)

Publishing a tutorial is not just pushing its own repo. Do these cross-site
updates too (they are easy to forget and only surface in a later QA pass):

1. **Hub site entry.** Add the tutorial to
   `patterncatalyst-workshops-tutorials-list/_data/sites.yml` under the right
   `group`, with the live Pages `site_url` and `repo_url`. (Default yes, ask.)
2. **Book references → the hub.** Any book in the tutorial's bibliography goes
   into the hub's `_data/books.yml` (`title`/`authors`/`publisher`/`year`/`isbn`/
   `url`/`referenced_by: [<slug>]`) and is placed in a category in
   `_data/book_categories.yml` by exact title. Re-run `gen-books.py` only with
   `--enrich` (never the base generator — it overwrites curated data).
3. **Verify the books first — never fabricate.** Look each one up; drop any you
   cannot confirm exists (AI-drafted bibliographies hallucinate plausible
   titles/authors). **Every book link points to the publisher or author page
   (Manning, Pearson, Springer, O'Reilly, Leanpub, the author's own site);
   Amazon is a last resort, only when no publisher page exists.**
4. **Wire the site's own listing pages** (Chapters/Examples/Diagrams/Bibliography)
   before calling it done — see lgtm-jekyll's "Wire the listing/index pages".
   Open each index page in the browser; a green build does not prove they have
   content.

## The shape of the project

A Jekyll site delivered iteratively, one PR and `rNN.x` tag per iteration:

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

## Dependency and platform policy (non-negotiable)

- **Upstream, latest stable, pinned.** Always promote the upstream project's latest stable
  release (never a prerelease), surveyed upstream at the start of work, and pin it exactly. Step
  back only for an actual incompatibility, and record the hold and its reason next to the pin. A
  "newer than supported" warning or a support matrix that has not caught up is not, on its own, a
  reason to step back. Never a floating tag.
- **Idiomatic code first.** Write every example the way its language and framework
  intend: the standard library, the framework's own facilities, and the community's
  established libraries before anything hand-rolled. Apply `lgtm-idiomatic-review`'s
  checklists while authoring, not only in the validation pass. Where a technique
  needs a non-idiomatic construct (a busy-spin, manual memory layout, a lock-free
  structure), say why in the prose and keep the rest of the example idiomatic.
- **Maintained open source first.** Before adding any library, image, service or tool, look for a
  maintained open-source option: an open license, recent releases, and no fees or license keys.
  An archived or unmaintained project is not an option; say so and pick a maintained one.
- **No vendor cloud components unless the user decides otherwise.** Do not bring AWS, Google
  Cloud, Microsoft/Azure or other company-specific services, SDKs or managed offerings into
  examples or recommended solutions (for example `aws-sdk-*`, `boto3`, S3 pre-signed URLs, STS,
  Azure or Google Cloud client libraries) unless the user has explicitly decided to. Describe the
  capability generically and implement it with open-source components. The rule is about
  proprietary and managed services, not about who sponsors an open-source project: the stack
  leans on Red Hat-led open source (UBI images, Quarkus, Strimzi, Apicurio, Debezium, Keycloak),
  and that is welcome.
- **Prefer CNCF and vendor-neutral standards.** When options compete, prefer CNCF projects and
  other vendor-neutral, industry-standard open source: OpenTelemetry, Strimzi, CloudNativePG,
  KEDA, Istio, Kyverno, Falco, and OpenMetadata for metadata catalogs.
- **Generic Kubernetes is the target.** minikube (docker driver, containerd) is the primary
  Kubernetes target because it is generic upstream Kubernetes. OpenShift Local (CRC) appears only
  to show the same examples running on an on-premises Kubernetes distribution: application code,
  images, verification and recommended solutions never depend on OpenShift-, CRC- or ACS-specific
  features.

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
  requirements". Refer to other parts by name or by the correct
  `Part {order}` number. See "Deception framing" below for the
  honest/lie vocabulary rule.

See `references/conventions.md` for the house-style checklist, the validation
snippets, the `unverified` discipline, and the release rhythm.

- **Open source only, no fees.** Every runtime, framework, library, image,
  operator and tool must be usable without a license fee, license key or paid
  subscription: anyone who clones the project runs it for free. Use the
  latest stable release; an LTS line is not a reason to hold back. When a project's newest
  release moves to a commercial license, pin the newest open-source line instead
  and record why next to the pin (for example MassTransit 8.5.x under
  Apache-2.0 rather than the commercial 9.x). Check the license field on the
  registry (pom, nuspec, PyPI, chart) when bumping. Free-registration items such
  as the Red Hat pull secret for OpenShift Local are acceptable; paid ones are not.

## Deception framing: the "honest" and "lie" vocabulary

Two different things get called the same word, and only one of them is a
problem.

**Banned — framing the work, the method, or the reader as deceptive.** "An
honest benchmark", "honestly, this is slow", "benchmarking without lies", "the
lie this chapter corrects". This vocabulary implies a baseline of dishonesty:
if *this* chapter is the honest one, the rest of the book is not, and if the
reader's previous benchmark was a "lie", they are being called a liar rather
than told what their harness omitted. Write **real**, **accurate**,
**practical**, or name the actual defect — "unwarmed", "single-sample",
"naive", "uncorrected".

**Allowed — a machine reporting a wrong value.** "The mtime can lie",
"`hardware_concurrency()` lies about its container", "the PID is a lie
inherited from the 1970s". Here "lie" describes a system that reports something
untrue, which is accurate technical idiom and carries no accusation. Removing
it costs real expressiveness and leaves the prose stilted. Keep it.

The test: **is the subject a person or a process (ban it), or a machine
reporting a value (keep it)?**

This bites hardest in **identifiers**, not prose. A CLI flag named `--lie`, a
subcommand, an example slug, a chapter title — these propagate into source in
every language, into `verify.lua` assertions, into recorded run output quoted
in the chapter, and into the example directory name. Renaming one later means
touching all of it *and* re-running the example to re-record its output,
because the recorded lines are verification evidence. Pick the neutral name
first. For a deliberately-bad variant that exists to be compared against, name
it after its defect — `--naive`, `--unwarmed`, `--single-sample` — which is
both inoffensive and more informative than `--lie`.

Grep for `honest`, `honestly`, `\blie\b`, `\blies\b`, `\blying\b` before
releasing an iteration, and triage each hit with the person-or-machine test.

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
   in `references/chapter-template.md`. Every chapter carries the house framing
   sections — **Learning objectives** and **Diagram** at the top, **Why this
   matters** over the opening hook, and **For deeper coverage** at the end
   (reading-list books from `_data/books.yml` + companion-project cross-refs;
   never invent citations). Every hands-on chapter needs a "How the code works"
   walkthrough that explains *what the code is doing, as if the reader were
   writing it themselves*: show the real, runnable code (not stubs) and explain
   each meaningful call/decision and why it is made that way. Where it helps the
   reader confirm their build, end with a **cross-check** against an independent
   tool or method.
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
(dashed), `ink` (light slate fill, dark text). See
`references/diagram-engine.md` for the full `emit()` API.

## Validate, log, release

Before releasing, run the checks in `references/conventions.md`
(front-matter YAML parses; `part` matches a `part_name`; no stray `{{` outside
includes/`relative_url`; SVG well-formed; Excalidraw JSON valid; `bash -n` on
each run script). Then update `_plans/reconciliation-plan.md` (new claims
`unverified`) and the iteration log, and clean `__pycache__` and build
artifacts. Then ship through `lgtm-github`: PR from `release/rNN`, squash-merge,
tag `rNN.x` on `main`, and a GitHub release with notes only. No tarball, no
checksum file.

## References

- `references/chapter-template.md` — chapter skeleton + the depth standard, with a worked walkthrough
- `references/example-template.md` — the runnable-example shape, file by file
- `references/conventions.md` — house-style checklist, validation snippets, the `unverified` discipline, release rhythm
- `references/diagram-engine.md` — the `emit()` API, node styles, edges/notes, validation
- `scripts/generate_diagram.py` — the diagram compiler (import and call `emit`)

## Multi-step work → `lgtm-relay`

Authoring a chapter with its runnable example, or releasing an iteration, runs
through the `lgtm-relay` skill: Opus plans the chapter arc and acceptance criteria,
Sonnet writes prose, example, and diagram spec, Opus validates against the depth
standard and runs the static checks. Give each executor this skill's conventions
in its prompt — a subagent does not inherit them.
