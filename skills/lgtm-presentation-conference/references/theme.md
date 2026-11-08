# Theme reference: the conference style

Every token lives in `scripts/deck-helpers.js` (`COLOR`, `SEQ`, `FONT`, `BRAND`).
Change the tokens or the brand slots, not the helpers.

## Where the style comes from

The canonical source is `optimizing-quarkus-on-kubernetes.pptx` in the
quarkus-optimization repo, and the Reveal.js decks (`presentation/index.html`) in both
quarkus-optimization and spring-boot-optimization, which share the same palette. The
committed `java-openshift-optimization.pptx` in spring-boot-optimization is not this
style: it was rebuilt in the Red Hat house style (`lgtm-presentation`). The Quarkus
pptx was exported from a slide editor, so there was no builder to copy; the helpers
here were rebuilt from its geometry and colours.

## Canvas and grid

- `LAYOUT_16x9`: **10 × 5.625 in** (the house style uses 13.333 × 7.5).
- Side margin **0.35 to 0.4 in**; content width **9.2 to 9.3 in**.
- Title band: y 0, h **0.70**, colour `band`. Title text x 0.4, 20 pt bold, accent.
- Tag box: x 8.0, y 0.08, 1.8 × 0.55, brand band colour, 10 pt text bottom-right.
- Body region: y **0.85 to 5.30**.
- Footer band: y **5.42**, h 0.205, brand band colour; footer text centred 9 pt;
  page number and optional logo inside the band on the right. (The source deck put
  the page number over the band edge; the helper fixes that.)
- Two-column split: x 0.4 and x 5.15, each 4.45 wide.

## Palette

| Role | Hex | `COLOR` key |
|---|---|---|
| Dark body | `#0A1628` | `bg` |
| Title band, divider body, cover strip | `#08111F` | `band` |
| Cards, table rows, accent rows | `#122040` | `card` |
| Strokes and grid on dark | `#1E3A5F` | `cardLine` |
| Code background | `#0D2137` | `codeBg` |
| Light body variant | `#EBF0F7` | `lightBg` |
| Cards on light | `#FFFFFF` (stroke `#E0E8F0`) | `lightCard`, `lightLine` |
| Text on dark | `#ECF0F1` | `text` |
| Muted / captions on dark | `#90A4AE` | `muted` |
| Text on light | `#1A2B3C` (muted `#546E7A`) | `ink`, `inkMuted` |
| Code foreground | `#A8D8EA` (comments `#6E8CA0` italic) | `codeFg`, `codeComment` |
| Reference callout text | `#00E5C3` | `mint` |
| **Accent: titles, cover bars** | `#00BCD4` | `teal` (`BRAND.accent`) |
| **Band: tag box, footer, table head** | `#1E6FC8` | `blue` (`BRAND.band`) |
| Amber: cover rule, tips, credits | `#F5A623` | `amber` |
| Red: demo dividers, failure rows | `#E84855` | `red` |
| Green: "after" panels, savings | `#27AE60` | `green` |
| Purple | `#7C3AED` | `purple` |

`SEQ` = blue, teal, amber, red, green, purple: the order the agenda tiles, numbered
takeaways and chart series take.

## Fonts

| Role | Font | License, Fedora package | Source deck used |
|---|---|---|---|
| Titles and body | **Carlito** | SIL OFL, `google-carlito-fonts` | Calibri (proprietary) |
| Code | **Source Code Pro** | SIL OFL, `adobe-source-code-pro-fonts` | Courier New, Consolas (proprietary) |

Carlito is metric-compatible with Calibri, so text set in the source deck breaks at
the same places; on Fedora, LibreOffice already rendered the source deck in Carlito.
Liberation Mono (`liberation-mono-fonts`, SIL OFL) is the metric-compatible stand-in
for Courier New if a talk wants the exact code look of the source. A presenting
machine without the fonts substitutes a default face: present from a machine that has
them, or export a PDF.

Sizes: cover title 38 to 40 pt; divider title 40 pt; slide title 20 pt; sub-heading
14 to 16 pt; body 11 to 15 pt; stat value 36 pt; footer 9 pt; code 11 pt shrinking
to fit (8 pt floor).

## Slide grammar

- **Cover:** dark body, teal 0.25 in left bar and 0.12 in top rule, two outline
  circles at the right (accent and band), teal ALL-CAPS eyebrow, 38 pt white title,
  muted tech line, amber rule, amber italic credits line, speaker and event block,
  URL strip on the bottom band, revision marker.
- **Content (dark or light):** title band, tag box, footer band. Light is for
  text-heavy, agenda, takeaways and diagram slides; dark for stats, tables, code.
- **Section divider:** band-colour body, accent left bar, eyebrow code, 40 pt title,
  italic subtitle, one outline circle.
- **Demo divider:** red left bar, "DEMO 01" eyebrow, title, "What you'll see"
  bullets, mono command chip in a card.
- **Code:** `codeBg` box with a 1.5 pt accent border, light-blue mono text.
- **Tables:** band-colour header with white bold text, card rows separated by 2 pt
  body-colour rules, first column bold accent and centred.
- **Diagrams:** light-themed figures on a white panel, never stretched.
- **Charts:** native pptxgenjs charts on a card plot area, muted axis labels, grid in
  `cardLine`, series colours from `SEQ`.
- **Closing:** "Resources & Q&A" title, coloured resource cards, mono link chips,
  "Questions?" in accent, "Thank you!" with an outline circle, accent bottom band.
- Cards carry a soft outer shadow; no gradients, no textures, no photos by default.

## Brand slots (`brand({...})`)

| Slot | Default | Shown on |
|---|---|---|
| `accent` | `00BCD4` | titles, cover and divider bars, code border, closing |
| `band` | `1E6FC8` | tag box, footer band, table header, cover circle |
| `footer` | empty | footer band, every content slide |
| `logo`, `logoAspect` | `null`, 3 | right of the footer band (white or light art) |
| `speaker` `{name, role, handle, url}` | empty | cover, about slide, closing |
| `event` `{name, date, logo}` | empty | cover |
| `url` | empty | cover strip |

Typical uses: the conference's colours and logo for a sponsored track; the speaker's
own mark for a community talk; nothing at all for a neutral deck. Keep the accent
light enough to read on `#08111F` (teal, amber, mint, light green pass; dark red or
navy does not).

## How it differs from the house style (`lgtm-presentation`)

| | House (`lgtm-presentation`) | Conference (this skill) |
|---|---|---|
| Canvas | 13.333 × 7.5 in | 10 × 5.625 in |
| Body | white | dark navy, with a light variant |
| Fonts | Red Hat Display / Text / Mono, Overpass titles | Carlito, Source Code Pro |
| Accent | red `#EE0000` | teal `#00BCD4` + blue band, configurable |
| Title | red ALL-CAPS eyebrow + 30 pt black title | teal 20 pt title in a dark band + tag box |
| Dividers | textured red panel image + white logo | flat dark, coloured bar, outline circle |
| Footer | page number left, Red Hat logo right | coloured band: text, number, optional logo |
| Logo | Red Hat on every slide | none unless `brand.logo` is set |
| Extras | perf callout, status table | stat cards, accent rows, agenda tiles, takeaways, comparison, charts, demo divider, speaker, QR cards |
| Deliverables | pptx + companion docx + diagram engine | pptx only; diagrams from `lgtm-diagram-generator` |

Kept unchanged: the pptxgenjs builder approach, notes on every slide, concept
cross-references, credit rules, dependency policy, versioning, render QA, and the
aspect-fit diagram embed.

## Strip-down checklist: from a Red Hat deck to a conference talk

Found in the two optimization decks, and what to do with each:

- Red Hat logo on every slide and on the cover (Spring pptx; Quarkus QR slide):
  remove; use `brand.logo` only for the event's or speaker's mark.
- Red textured `cover-panel.png` / `section-panel.png` and `#EE0000` / `#AB0000`
  panels: replace with the cover and divider helpers here.
- Red Hat Display / Text / Mono and Overpass faces: Carlito and Source Code Pro.
- `pres.company = "Red Hat"`: leave empty or set the speaker's organisation.
- Footer and title text naming OpenShift ("Java Optimization on OpenShift"): say
  Kubernetes; keep OpenShift only on slides that are about it.
- Product-only tooling as the main path (OpenShift Cost Management, Cryostat on
  OpenShift, `cost.openshift.io`, `access.redhat.com` articles): lead with the
  upstream or generic tool; mention the product as one option where useful.
- "Red Hat build default" style claims: state the upstream default and name the
  distribution only as a comparison.
- A slide appended in another style (the Quarkus QR slide is white with the Red Hat
  logo): rebuild it with `addTakeAway` on a light content slide.
