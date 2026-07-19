---
name: lgtm-presentation
description: Build polished, Red Hat-branded technical documents and slide decks — .pptx (16:9 programmatic decks with pptxgenjs) and .docx (branded companion documents with python-docx) — in the house style of the "Designing Cloud-Native APIs" / "API Patterns and Practices" series. Red Hat Display (titles) / Red Hat Text (body) / Red Hat Mono (code) fonts, red #EE0000 accents, embedded SVG→PNG diagrams, the Red Hat logo, thick speaker notes on every slide, and matching SVG + Excalidraw + PNG diagrams from a Python Scene engine. Bundles the deck builder (deck-helpers.js + a deck template), the DOCX builder conventions (python-docx with Red Hat fonts), the diagram engine (dgen.py + build + template), all brand assets, and the full theme tokens. Use this whenever someone wants to CREATE, EXTEND, or RESTYLE a developer-education or technical presentation or document in this look — a "Red Hat deck", a branded .pptx or .docx, a cloud-native / API / Kubernetes talk, an "lgtm presentation", adding slides / sections / appendices to an existing builder, matching a prior deck in the series, converting markdown to a branded DOCX, or making / fixing the diagrams that go in it. Use it even if they just say "make me a branded technical presentation" or "make a document" or "make a diagram for the deck" without naming Red Hat.
---

# LGTM Presentation — Red Hat technical decks & documents

Builds professional, Red Hat-branded **16:9 .pptx decks programmatically**, branded
**companion .docx documents**, and the **diagrams that go in them**. A deck is
JavaScript, not hand-placed slides: a `deck.js` builder calls helpers from
`deck-helpers.js` to emit each slide and writes one `.pptx`. Documents are Python:
a converter turns markdown into a branded `.docx` using `python-docx` with Red Hat
fonts and embedded diagrams. Diagrams are Python: a `diagrams.py` authors `Scene`
objects that `dgen.py` emits as SVG + Excalidraw + PNG, which decks and documents
embed. This is how the "API Patterns and Practices: REST" and "Designing
Cloud-Native APIs" decks and their companion advisory documents are made. The brand
assets, theme tokens, and battle-tested helper/Scene engines are all bundled here —
building a deck or document is mostly **calling the helpers**, not writing layout or
styling code.

## Three engines, one look

```
your-deck/
├── deck.js              # the builder you write — one block per slide
├── deck-helpers.js      # bundled: COLOR/FONT/W/H + slide helpers (do not rewrite)
├── assets/              # bundled: cover panel, divider panel, logos
├── diagrams.py          # the diagrams you author — Scene functions + a SCENES list
├── dgen.py              # bundled: the Scene engine (SVG + Excalidraw emitters)
├── build_diagrams.py    # bundled: builds every scene, renders PNGs
├── png/                 # rendered diagram PNGs (deck reads these)
└── /mnt/user-data/outputs/<deck>-rNN.x.pptx   # the deliverable
```

The output is always a **real `.pptx`** or **`.docx`** the user opens in
PowerPoint / Word / Keynote / LibreOffice — plus, when diagrams are involved, the
editable `.excalidraw` sources.

## When to reach for this

Creating a new branded deck or document; adding a section or appendix to an existing
builder; restyling content into the house look; converting markdown into a branded
DOCX with embedded diagrams; producing the architecture / flow / state-machine /
comparison diagrams that sit in decks or documents; or fixing a wrong diagram already
embedded. If the ask is a technical/developer presentation or document in this
brand — or "the same look as the last deck" — this is the skill.

## Prerequisites

- **Node.js** with **pptxgenjs**. If offline it's often already global — run with
  `export NODE_PATH=$(npm root -g)` so `require("pptxgenjs")` resolves; else
  `npm install pptxgenjs`.
- **Python 3** with **python-docx** (`pip install python-docx`) for DOCX generation,
  and **cairosvg** (`pip install cairosvg`) for SVG→PNG conversion when embedding
  diagrams in DOCX or PPTX via python-pptx.
- **LibreOffice** (`soffice`) + **poppler** (`pdftoppm`) for QA rendering and for
  SVG→PNG. The public pptx skill ships `scripts/office/soffice.py`.
- **Red Hat fonts** — Red Hat Display, Red Hat Text, Red Hat Mono (installed system-
  wide via `redhat-fonts` package on Fedora/RHEL, or from Google Fonts).

## Build a deck (the procedure)

1. **Set up a working dir** and copy the bundled files in:
   ```bash
   mkdir -p work && cd work
   cp /path/to/skill/scripts/deck-helpers.js .
   cp /path/to/skill/scripts/deck.template.js deck.js
   cp -r /path/to/skill/assets .
   mkdir -p png diagrams
   ```
   `deck-helpers.js` reads `DECK_ASSETS` (`./assets`) and `DECK_PNG` (`./png`) from
   the environment — set only if your layout differs.
2. **(If the deck has diagrams)** copy `dgen.py`, `build_diagrams.py`, and
   `diagrams.template.py → diagrams.py`; author scenes; then
   `python3 build_diagrams.py` to emit SVG + `.excalidraw` + PNG into `diagrams/`
   and `png/`. See **`references/diagram-engine.md`**.
3. **Write `deck.js`** — grow it slide by slide from the template. Each slide is a
   block: `{ const s = S(); addContentTitle(...); addBullets(...); addNotes(s, "…"); }`.
   Section breaks use `divider(code, title, subtitle, notes)`. See the helper API
   below and **`references/deck-builder.md`**.
4. **Build:** `export NODE_PATH=$(npm root -g) && node deck.js` → writes the
   `.pptx` named in `OUT`.
5. **QA every changed slide** (always — see below) before delivering.

## Build a DOCX (the procedure)

Use `python-docx` to convert markdown content into a branded `.docx` document with
Red Hat fonts and embedded diagrams. Full conventions in
**`references/docx-builder.md`**.

1. **Read the source markdown** and parse it section by section.
2. **Set fonts:** Red Hat Display for headings, Red Hat Text for body, Red Hat Mono
   for code blocks and inline code. These are set on the document's `Normal` style
   and on individual heading styles.
3. **Embed diagrams:** SVG files are converted to PNG via `cairosvg` (1400px wide)
   and inserted inline with `run.add_picture()` at 5.5" width, centered, with an
   italic caption below.
4. **Format inline text:** bold (`**`), italic (`*`), inline code (`` ` ``), and
   links are parsed into separate runs with appropriate formatting.
5. **Handle tables, code blocks, checklists, and bullet/numbered lists** as native
   DOCX elements.
6. **QA:** verify the DOCX opens correctly and diagrams render. Check file size —
   a DOCX with embedded PNGs should be significantly larger than text-only.

## The deck helper API (summary)

`deck-helpers.js` exports `COLOR, FONT, W, H, PNG, ASSETS, newDeck` plus:
`addContentTitle` (red eyebrow + title) · `addBullets` (round bullets; per-item
`{options:{bullet:false}}` to let a number/letter be the marker) ·
`addTwoColBullets` · `addStatusTable` (3-col reference table; `opts.colW` so long
labels don't wrap) · `addCodeSlide` (dark code box; `#`/`//` lines green; one-line
caption) · `addDiagramSlide` (embeds `png/<name>.png`, `contain` sizing) ·
`addPerfCallout` · `addCaption` · `addSectionDivider` · `addFooter` (page no. +
logo, via `S()`) · `addNotes`. Full signatures and tips in
**`references/deck-builder.md`**.

## The diagram Scene API (summary)

A scene creates a `Scene(name, width, height, title, subtitle)`, draws with
`box / label / arrow / divider / panel / chip / code_block`, and calls `.write()`;
register it in `SCENES`. Color by `kind` (`rest` red API surface, `svc` blue
services, `data` purple stores, `platform` teal infra, `govern` amber policy,
`danger` deep-red failure). Full signatures, palette, and layout tips in
**`references/diagram-engine.md`**.

## House conventions (non-negotiable for this brand)

- **Brand:** Red Hat Display (titles) / Red Hat Text (body) / Red Hat Mono (code);
  accent red `#EE0000`. Full token tables in **`references/theme.md`**.
- **The Red Hat logo appears on every slide** — `addFooter` (via `S()`) on content
  slides, `addSectionDivider` on dividers, the cover carries its own. Always create
  content slides via `S()`; never ship one without the footer.
- **Speaker notes on every slide, and thick** — they are the spoken script and the
  source text for any companion examples project. `notesCount` must equal slide
  count.
- **Cross-reference by concept, never by slide number** ("the idempotency
  section"); no build/turn/positional language in slide-visible text.
- **Examples run on plain infrastructure** — Podman / plain Kubernetes, no managed
  cloud on the primary path; state the constraint and hold it.
- **Reference-heavy material goes in appendices** scoped to "keep open in another
  window".
- **Verify currency before asserting** — web-search library maintenance, current
  CLI flags, and RFC-vs-draft status before stating them.
- **Versioning:** artifacts are `<name>-rNN.x.pptx` (+ `diagram-sources-…-rNN.x.zip`
  and a source zip). New section → bump the major (`rNN.0`); post-review fix →
  bump `.x`. Bump BOTH the `OUT` constant and the on-cover revision marker; retire
  superseded files.

## QA workflow (always, before delivering)

```bash
export NODE_PATH=$(npm root -g)
node deck.js
soffice --headless --convert-to pdf --outdir qa <out>.pptx     # or the pptx skill's soffice.py
pdftoppm -jpeg -r 110 -f N -l N qa/<out>.pdf qa/pg             # render a page to eyeball it
```
With ≥100 slides, `pdftoppm` zero-pads to 3 digits (`pg-163.jpg`). Eyeball: table
first columns don't wrap (tune `colW`); code-slide captions sit below the dark box
(one line / `fontSize:10` for dense code); diagrams are centered and on the right
stack; the logo is bottom-right on every content slide.

## Reference files

- **`references/theme.md`** — all visual tokens: fonts, the full color palette
  (deck `COLOR` ↔ diagram `PALETTE`), layout constants, the logo rule, brand
  assets, and the diagram `kind` keys. Start here to rebrand or recolor.
- **`references/deck-builder.md`** — deck structure, the complete helper API,
  table / code-slide tips, content principles, versioning, and the QA pipeline.
- **`references/docx-builder.md`** — DOCX font conventions, diagram embedding,
  inline formatting, and the python-docx build pattern.
- **`references/diagram-engine.md`** — the Scene API in full, authoring scenes,
  layout tips, editing an embedded SVG you can't regenerate, and output/embedding.
- `scripts/deck.template.js` — a minimal working deck (incl. the custom cover) to
  copy and grow. `scripts/deck-helpers.js` — the helper library (extend, don't
  rewrite).
- `scripts/diagrams.template.py` — a starter `diagrams.py` with one scene and the
  `SCENES` list. `scripts/dgen.py` — the Scene engine. `scripts/build_diagrams.py`
  — the batch builder.
- `assets/` — `cover-panel.png`, `section-panel.png`, `redhat-logo-white.png`,
  `logo-candidate-2.png`.

## Multi-step work → `lgtm-relay`

A deck is a natural relay: Opus plans the narrative arc and slide inventory, Sonnet
builds the slides against it, Opus runs the brand and consistency pass (the QA
workflow above). See the `lgtm-relay` skill. The house conventions in this skill are
non-negotiable, so restate them in every executor prompt — subagents do not inherit
loaded skills.
