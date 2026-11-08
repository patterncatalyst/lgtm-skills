---
name: lgtm-presentation-conference
description: Build a 16:9 .pptx conference talk programmatically with pptxgenjs in the vendor-neutral dark navy and teal style of the "Taming the JVM" optimization decks, for talks that are not Red Hat presentations (DevNexus, JavaOne, KubeCon, Devoxx, meetups, user groups, a speaker's own talk). Open fonts only (Carlito for titles and body, Source Code Pro for code), a dark title band with a tag box, a brand-coloured footer band, stat cards, accent rows, agenda tiles, numbered takeaways, themed tables, bordered code blocks, before/after comparisons, light-panel diagrams, native charts, demo dividers, an about-the-speaker slide, QR take-away cards and a Resources and Q&A close. Logo, footer text, accent colours, speaker and event are parameters, and no vendor marks appear by default. Bundles deck-helpers.js, a working deck template and neutral placeholder assets. Use whenever someone wants a conference deck, a talk for a named non-Red-Hat event, a "DevNexus deck", a deck "like the Quarkus optimization talk" or "dark navy / teal theme", a deck carrying the conference's or the speaker's own branding, or wants to strip Red Hat branding from a talk. For Red Hat-branded house-style decks and companion .docx documents use lgtm-presentation instead.
---

# LGTM Presentation (conference): vendor-neutral talk decks

Builds **16:9 .pptx conference talks programmatically** in the dark navy and teal
style of the "Taming the JVM" Quarkus optimization deck. A deck is JavaScript: a
`deck.js` builder calls helpers from `deck-helpers.js` to emit each slide and writes
one `.pptx`. Same engine and rules as `lgtm-presentation`; a different theme and no
fixed brand. The talk carries the conference's or the speaker's branding through a
handful of slots, and nothing vendor-specific by default.

**Pick the skill by audience.** A Red Hat presentation (Red Hat event, customer
briefing, the house series) uses `lgtm-presentation`. Anything else, such as a
DevNexus session, a community meetup or the speaker's own talk, uses this one.

## Layout of a deck

```
your-talk/
├── deck.js              # the builder you write, one block per slide
├── deck-helpers.js      # bundled: theme tokens, brand slots, slide helpers
├── assets/              # bundled placeholders; add the event and speaker art here
├── png/                 # diagram PNGs (from lgtm-diagram-generator)
├── package.json         # pptxgenjs pinned, installed locally
└── <talk>-rNN.x.pptx    # the deliverable
```

## Prerequisites

- **Node.js** and **pptxgenjs 4.0.1** (latest stable, surveyed 2026-11-08), installed
  locally in the deck directory: `npm install pptxgenjs@4.0.1`. Never a global install.
- **Fonts**, both SIL Open Font License and packaged on Fedora:
  Carlito (`google-carlito-fonts`) and Source Code Pro (`adobe-source-code-pro-fonts`).
- **LibreOffice** (`soffice`) and **poppler** (`pdftoppm`) for QA rendering;
  **ImageMagick** (`magick montage`) for contact sheets.

## Build a deck

1. Copy the bundled files into the deck directory:
   ```bash
   mkdir -p my-talk/png && cd my-talk
   cp <skill>/scripts/deck-helpers.js .
   cp <skill>/scripts/deck.template.js deck.js
   cp -r <skill>/assets .
   npm init -y && npm install pptxgenjs@4.0.1
   ```
2. **Fill the brand slots** at the top of `deck.js` with `brand({...})`: footer text,
   logo (or `null`), accent and band colours, speaker, event, URL. See
   **`references/theme.md`**.
3. **Diagrams** come from `lgtm-diagram-generator` (light-themed PNGs in `png/`);
   `addDiagram` puts them on a white panel, fitted to their own aspect.
4. **Write the slides**, one block each:
   `{ const s = contentSlide(pres, "Title", "Tag"); addBullets(s, [...]); addNotes(s, "..."); }`.
   Pass `{ light: true }` for text-heavy and diagram slides. The full helper API is in
   **`references/deck-builder.md`**.
5. **Build:** `node deck.js`. `writeDeck` refuses to write when any slide lacks
   speaker notes, and `addCodeBlock` prints `WARN slide N` when a block needs less
   than 8 pt; treat that as blocking and split the slide.
6. **QA every page** (below) before delivering.

## Helper API (summary)

`brand` · `newDeck` · `contentSlide(pres, title, tag, {light})` · `addCover` ·
`addSectionDivider` · `addDemoDivider` · `addClosing` · `addSpeaker` · `addTakeAway`
(QR cards) · `addBullets` · `addHeading` · `addLead` · `addTwoCol` · `addStatCards` ·
`addAccentRows` · `addAgendaGrid` · `addTakeaways` · `addTable` · `addCodeBlock` ·
`addCallout` · `addTip` · `addComparison` · `addDiagram` · `addCaption` · `addChart` ·
`addNotes` · `writeDeck`. Signatures and layout tips in
**`references/deck-builder.md`**.

## Dependency and platform policy (non-negotiable)

- **Upstream, latest stable, pinned.** Always promote the upstream project's latest stable
  release (never a prerelease), surveyed upstream at the start of work, and pin it exactly. Step
  back only for an actual incompatibility, and record the hold and its reason next to the pin. A
  "newer than supported" warning or a support matrix that has not caught up is not, on its own, a
  reason to step back. Never a floating tag.
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

## Conventions (non-negotiable)

- **Open fonts only.** Carlito and Source Code Pro by default; any replacement must be
  freely licensed and installable on Fedora. Never Calibri, Consolas, Courier New or
  another proprietary face, even though the source deck was drafted in them.
- **Neutral by default.** No Red Hat logo, red brand panels, "Red Hat" company
  metadata, or OpenShift-only framing unless the talk is about that product. Kubernetes
  is the generic platform in titles, footers and examples. Branding comes only from
  the `brand()` slots. The strip-down checklist is in **`references/theme.md`**.
- **Every slide through a helper.** Content slides come from `contentSlide`, so the
  title band, tag box, footer band and page number are always present.
- **Speaker notes on every slide, and thick.** They are the spoken script. `writeDeck`
  enforces the count.
- **Cross-reference by concept, never by slide number**; no build or turn language in
  slide-visible text.
- **Credit every source, copy nothing.** When a slide leans on a book, paper, talk or
  article, name the author and work on the slide or in the notes, and list every book
  on the Resources slide. Wording, examples and structure stay original: paraphrase
  and cite; quote only a short, verified line, with attribution. A missing credit is a
  blocking review finding.
- **Verify currency before asserting**: versions, flags and defaults are checked
  upstream before they go on a slide; the numbers on a slide come from a measured run
  described in the notes.
- **Versioning:** `<talk>-rNN.x.pptx`. New section: bump the major (`rNN.0`);
  post-review fix: bump `.x`. Bump both `REV` (drives `OUT` and the cover marker);
  retire superseded files.
- **No em or en dashes** in slide text or notes; use a colon, a comma or two sentences.

## QA workflow (always, before delivering)

```bash
node deck.js
soffice -env:UserInstallation=file://$PWD/qa/profile --headless --convert-to pdf --outdir qa <talk>.pptx
pdftoppm -png -r 60 qa/<talk>.pdf qa/p
magick montage qa/p-*.png -tile 4x -geometry 400x225+4+4 qa/sheet.png
```

View every page. Checklist: nothing runs past the footer band; code fits its box (no
`WARN` lines); table first columns do not wrap (tune `colW`); diagrams keep their
aspect; the footer shows the event text and page number on every content slide; the
cover and closing carry the speaker and event; no vendor mark appears that the brand
slots did not put there; `unzip -l <talk>.pptx | grep -c notesSlide[0-9]*.xml` equals
the slide count. Then run the `lgtm-professional-voice` scan over `deck.js`.

## Reference files

- **`references/theme.md`**: tokens (palette, fonts, canvas, grid), brand slots, how
  this style differs from the house style, and the vendor strip-down checklist.
- **`references/deck-builder.md`**: deck structure, every helper's signature, layout
  tips, charts and diagrams, and versioning.
- `scripts/deck-helpers.js`: the helper library (extend, do not rewrite).
- `scripts/deck.template.js`: a 16-slide working deck with one slide of every kind.
- `assets/`: `logo-placeholder.png` (white wordmark for the footer band),
  `sample-diagram.png`, `qr-placeholder.png`. Replace them per talk.

## Multi-step work → `lgtm-relay`

A full talk is a natural relay: Opus plans the arc and the slide inventory, Sonnet
builds the slides, Opus runs the QA and voice pass. Restate the conventions above in
every executor prompt; subagents do not inherit loaded skills.
