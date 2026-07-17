# Theme reference — the Red Hat house style

Every visual token lives in code: the deck side in `FONT` / `COLOR` in
`scripts/deck-helpers.js`, the diagram side in `PALETTE` in `scripts/dgen.py`.
**Change the tokens, not the rules** — and keep the deck `COLOR` and the diagram
`PALETTE` in sync so slides and embedded diagrams read as one set.

## Fonts

| Role            | Font              | Fallback | Token (`FONT`) | DOCX style |
|-----------------|-------------------|----------|----------------|------------|
| Titles, eyebrows | **Red Hat Display** | Calibri  | `FONT.title`   | Heading 1–4 |
| Body, bullets    | **Red Hat Text**   | Calibri  | `FONT.body`    | Normal     |
| Code, mono labels | **Red Hat Mono**  | Consolas | `FONT.mono`    | code runs  |

All three fonts are the Red Hat brand family — installed system-wide via
`redhat-fonts` on Fedora/RHEL, or available from Google Fonts. Use them
consistently across PPTX decks and DOCX documents.

Diagrams use generic families (`Helvetica … sans-serif` for labels, an
`SF Mono / Cascadia / Menlo / Consolas` stack for mono) so SVG→PNG renders
identically without the brand fonts installed. To rebrand, change `FONT` in
`deck-helpers.js` (decks pick up the new face everywhere), update the DOCX
builder's font assignments, and the font stacks in `dgen.py` if you want
diagrams to match.

## Color palette

The deck `COLOR` map and the diagram `PALETTE` share the same hues. Use color to
**encode role consistently** across the whole deck (e.g. blue = services,
purple = data stores, red = the API surface).

| Meaning / role            | Hex       | deck `COLOR` | diagram `PALETTE` |
|---------------------------|-----------|--------------|-------------------|
| Primary accent / API surface | `#EE0000` | `red`     | `rest`            |
| Divider background (deep red) | `#AB0000` | `redDark` | —                 |
| Clients & services        | `#0066CC` | `svc`        | `svc`             |
| Datastores, queues, state | `#6A1B9A` | `data`       | `data`            |
| Infrastructure / runtime  | `#006E6E` | `platform`   | `platform`        |
| Policy / governance / lifecycle | `#B36B00` | `govern` | `govern`          |
| Failure / terminal / error | `#B71C1C` | `redDeep`   | `danger`          |
| Title ink                 | `#151515` | `ink`        | — (code bg `code`)|
| Body text                 | `#242424` | `body`       | —                 |
| Captions / muted          | `#5A5A5A` | `caption`    | `muted`           |
| Secondary stroke/text     | `#4A4A4A` | —            | `neutral`         |
| Page number               | `#8A8A8A` | `pageNum`    | —                 |
| Light grid / separators   | `#D2D2D2` | `grid`       | `grid`            |
| Panel / callout fill      | `#F4F4F4` | `panel`      | `panel`           |
| Code background           | `#151515` | `codeBg`     | `code`            |
| Code foreground           | `#E6E6E6` | `codeFg`     | `code_fg`         |
| Code comment (green)      | `#8FB98F` | `codeComment`| (comment lines)   |
| Perf-callout amber accent | `#FFA000` | `amber`      | —                 |
| Perf-callout background   | `#FFF7E6` | `perfBg`     | —                 |
| Perf-callout border       | `#B36B00` | `perfBorder` | —                 |

`dgen.py` keeps parallel Excalidraw stroke/background maps so the `.excalidraw`
export matches the SVG.

## Layout constants (16:9)

- Canvas: `LAYOUT_WIDE`, **`W = 13.333` × `H = 7.5`** inches.
- Content margins: left/right ≈ **`0.62`**.
- Title block: eyebrow at y **`0.42`**, title at y **`0.74`**.
- Body content starts at y **`1.85`**.
- Footer: page number bottom-left (x `0.62`, y `6.96`); Red Hat **color logo**
  bottom-right (x `11.55`, y `6.95`, w `1.13`, h `0.27`).
- Code box / diagram box default region: y `1.85`, h `4.65` (bottom ≈ `6.50`);
  captions sit just below at y `6.50`.

## The logo rule (every slide, non-negotiable)

- **Content slides:** `addFooter` (called by `S()`) stamps the color logo
  bottom-right. Always create content slides via `S()` so the footer is present.
- **Section dividers:** `addSectionDivider` stamps the **white** logo on the red
  panel.
- **Cover:** carries its own color logo (see `scripts/deck.template.js`).

Never ship a content slide without the footer + logo.

## Brand assets (`assets/`)

- `cover-panel.png` — full-bleed cover background (red rule + texture).
- `section-panel.png` — textured panel for section dividers.
- `redhat-logo-white.png` — white logo for dividers (on red).
- `logo-candidate-2.png` — color logo on white, for the content-slide footer.

## Diagram palette `kind` keys (`dgen.py`)

`rest` (red, the API surface) · `svc` (blue, clients/services) · `data`
(purple, stores/queues) · `platform` (teal, infra/runtime) · `govern` (amber,
policy/lifecycle) · `danger` (deep red, failure/terminal) · `neutral` / `muted`
(text & strokes) · `panel` / `grid` (backgrounds & separators) ·
`code` / `code_fg` (dark code blocks). Comment lines in `code_block` (`#` or
`//`) render in comment-green.
