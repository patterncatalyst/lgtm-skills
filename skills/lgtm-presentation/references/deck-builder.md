# Deck builder reference (`deck.js` + `deck-helpers.js`)

The deck is **JavaScript, not hand-placed slides**: `deck.js` calls helpers from
`deck-helpers.js` to emit each slide, then writes one `.pptx`. Brand tokens live
in `FONT` / `COLOR` (see `theme.md`); brand images in `assets/`.

## How a deck is structured

`deck.js` owns module-scope state and two tiny helpers:

```js
const pres = newDeck();           // configured pptxgenjs presentation (LAYOUT_WIDE)
let pageNum = 0;
function S() {                    // new CONTENT slide + footer (page no. + logo)
  const s = pres.addSlide(); pageNum += 1; addFooter(s, pageNum); return s;
}
function divider(code, title, subtitle, notes) {  // a SECTION DIVIDER slide
  const s = pres.addSlide(); pageNum += 1; addSectionDivider(s, code, title, subtitle); addNotes(s, notes);
}
```

Each slide is then a block:
`{ const s = S(); addContentTitle(...); addBullets(...); addNotes(s, "..."); }`.
The file ends with `pres.writeFile({ fileName: OUT })`. `scripts/deck.template.js`
is a minimal working deck (including the custom cover) — copy it to `deck.js`
and grow it.

`deck-helpers.js` reads two paths from the environment (defaults shown), set
only if your layout differs:
- `DECK_ASSETS` → `./assets` (brand images)
- `DECK_PNG` → `./png` (diagram PNGs referenced by `addDiagramSlide`)

Build: `export NODE_PATH=$(npm root -g) && node deck.js`.

## The helper API (`deck-helpers.js`)

Exports `COLOR, FONT, W, H, PNG, ASSETS, newDeck` plus these slide helpers:

- **`addContentTitle(slide, eyebrow, title, opts?)`** — red ALL-CAPS eyebrow +
  large dark title. `opts.w` narrows the title (e.g. when a code lang chip sits
  at the right).
- **`addBullets(slide, lines, opts?)`** — round bullets; items are strings or
  `{text, sub, options}`. Pass `{options:{bullet:false}}` on an item to drop the
  round bullet (e.g. when a number/letter `"1 · …"` / `"A · …"` is the marker).
  `opts.fontSize` (default 17).
- **`addTwoColBullets(slide, left, right, opts?)`** — two columns; items support
  `{text, muted}` (muted = grey italic) and per-item `{options:{bullet:false,
  bold:true}}` for headers.
- **`addStatusTable(slide, rows, opts?)`** — 3-column reference table; `rows` are
  `{code, name, purpose}` (col 1 mono-red bold). **`opts.colW`** (3 numbers
  summing to ≈`12.09`) widens columns so long labels don't wrap — essential when
  col 1 isn't a short status code. Also `opts.rowH` (≈0.50–0.66),
  `opts.withCallout`.
- **`addCodeSlide(slide, eyebrow, title, lang, codeLines, caption?, opts?)`** —
  dark code box; `lang` shows a right chip and narrows the title; lines starting
  `#` or `//` render green. **`opts.fontSize`** (default 11; use 10 for ≳22
  lines). Keep `caption` to **ONE line** — a 2-line caption overlaps the box.
- **`addDiagramSlide(slide, eyebrow, title, pngName, caption?, opts?)`** — embeds
  `${PNG}/${pngName}.png` with `contain` sizing. `opts` = `{x, y, w, h}`; for a
  near-square image, pass a narrower centered box; wide images fit the default.
  Use with the diagram engine (`diagram-engine.md`). Sourced raster graphics work
  too — drop a PNG into `./png` and reference it by name.
- **`addPerfCallout(slide, text, opts?)`** — amber "⚡ PERFORMANCE" sidebar.
- **`addCaption(slide, text, y?)`** — grey italic caption (default y `6.50`).
- **`addSectionDivider(slide, code, title, subtitle)`** — full-bleed red divider
  with the textured panel + white logo.
- **`addFooter(slide, pageNum)`** — page number + color logo (called by `S()`).
- **`addNotes(slide, text)`** — speaker notes (REQUIRED on every slide).

## Content principles (non-negotiable)

- **Speaker notes on every slide, thick and complete.** They are the spoken
  script AND the source text for any companion examples/demos. A slide without
  notes is incomplete; `notesCount` must equal slide count.
- **Cross-reference by concept, never by slide number** — "the idempotency
  section", not "see slide 142". Slide numbers drift as the deck grows.
- **No build/process language in slide-visible text** — no "Turn 7", "Phase 2",
  "as added in this revision". That belongs in commits, not slides.
- **Legacy/older-tech references only where genuinely useful** — acknowledge the
  migration context enough to be credible, never center the content there.
- **Examples run locally and on plain infrastructure** — Podman / podman-compose
  on a desktop, unchanged on plain Kubernetes; no managed cloud services on the
  primary path. State the constraint and hold to it.
- **Reference-heavy material goes in appendices** explicitly scoped to "keep open
  in another window", not read front-to-back.
- **Verify currency before asserting** — web-search library maintenance status,
  current CLI flags, and standard status (RFC vs IETF Internet-Draft; e.g.
  Deprecation = RFC 9745, Sunset = RFC 8594, Problem Details = RFC 9457, while
  RateLimit-* and Idempotency-Key remain drafts). Cite the standard.

## Table tips (`addStatusTable`)

Column 1 renders mono-red bold (designed for HTTP status codes). For reference
tables where col 1 is a longer label, pass `opts.colW` — three widths summing to
≈`12.09`. Examples that don't wrap:
- test types: `[2.40, 3.30, 6.39]`
- longer first column ("Conditional requests"): `[3.20, 3.40, 5.49]`
- command one-liners in col 2: `[2.20, 4.20, 5.69]`

Set `opts.rowH` (≈0.50–0.66) to fit the row count; `opts.withCallout: true`
leaves room for a perf callout beneath.

## Code slide tips (`addCodeSlide`)

- Dark box defaults to y `1.85`, h `4.65` (bottom `6.50`). `#`/`//` lines render
  green. Keep total lines ≲ what fits — overflow spills below the box.
- **Captions must be ONE line** (≲110 chars); a 2-line caption overlaps the box.
- Dense code (≳22 lines): `opts.fontSize: 10`.
- A set `lang` shows a right chip and narrows the title; a long title wrapping to
  two lines is fine.

## Versioning & artifacts

- Filenames: `<deck-name>-rNN.x.pptx`, plus (if applicable)
  `diagram-sources-<name>-rNN.x.zip` and a source zip.
- New section/turn → bump the major (`rNN.0`); post-review fix → bump `.x`.
- On every bump, update BOTH the `OUT` constant and the on-cover revision marker.
- Retire superseded artifacts from the output dir once the new revision ships
  (unless the user is mid-review of the prior one).

## QA pipeline (always before delivering)

```bash
export NODE_PATH=$(npm root -g)
node deck.js
# pptx -> pdf (LibreOffice; the public pptx skill ships scripts/office/soffice.py)
soffice --headless --convert-to pdf --outdir qa <out>.pptx
# render a page to JPEG to eyeball it (>=100 slides => 3-digit zero-pad: pg-163.jpg)
pdftoppm -jpeg -r 110 -f 163 -l 163 qa/<out>.pdf qa/pg
```

Eyeball checklist: table first columns don't wrap (tune `colW`); code-slide
captions sit below the dark box; embedded diagrams centered; the Red Hat logo is
bottom-right on every content slide; **speaker-note count == slide count**.
