---
name: lgtm-presentation-templates
description: Analyze SVG exports from official Red Hat Google Slides decks, classify slide types, extract layout tokens (positions, colors, bullet styles, accent lines), and output a theme JSON file that skills/lgtm-presentation can consume at build time. Use this whenever someone asks to "analyze a template", "read a slide deck SVG", "extract a theme", "create a new presentation theme", or "compare an official deck against the current layout". Also use if someone provides SVG files from a Google Slides deck and wants to know what changed or how to apply that look.
---

# LGTM Presentation Templates — SVG template reader & theme extractor

Reads SVG exports of official Red Hat slide decks, classifies each slide by type,
extracts layout tokens, and produces:
1. A **markdown suggestions report** comparing the template against the current
   `deck-helpers.js` constants in `skills/lgtm-presentation`.
2. A **theme JSON file** saved to `skills/lgtm-presentation/themes/<name>.json`
   that the presentation builder can load at build time.

## When to use this skill

- User has SVG files exported from a Google Slides deck and wants to analyze them
- User wants to create a new theme for `lgtm-presentation`
- User says "read the template", "analyze the slides", "extract theme from SVGs"
- User wants to compare an official Red Hat deck layout against the current builder
- User drops SVGs in a folder and asks what they can be used for

## Prerequisites

- SVG files exported from Google Slides (see "How to export" below)
- Access to `skills/lgtm-presentation/scripts/deck-helpers.js` for comparison

## Procedure

### Step 1: Locate the SVGs

Ask the user which folder contains the SVG exports. Default locations to check:
- `test-images/`
- `templates/`
- Any folder the user specifies

List the SVGs found and confirm with the user before proceeding.

### Step 2: Read and classify each SVG

For each SVG file, read it and classify its slide type using the heuristics in
**`references/slide-classification.md`**. Parse the SVG structure using the
patterns documented in **`references/svg-parsing.md`**.

Report your classification to the user:
- "Slide 1: Cover (large background image, title text)"
- "Slide 2: Content/Agenda (two columns, triangle bullets, accent rules)"
- "Slide 3: Section Divider (red background, white text)"
- etc.

### Step 3: Extract layout tokens

For each classified slide, extract the layout values documented in
**`references/extraction-rules.md`**:
- Accent line positions (y coordinates in inches)
- Logo placement (x, y, w, h in inches)
- Bullet marker style and color
- Title and body text positions
- Page number position
- Any new elements not present in current `deck-helpers.js`

### Step 4: Produce the suggestions report

Write a markdown report (to the chat or to a file if requested) that includes:

1. **Slide inventory** — each SVG with its classification and a brief description
2. **Extracted constants** — all positions converted to inches (13.333×7.5 canvas)
3. **Comparison against current deck-helpers.js** — show current value vs. template
   value for each constant, flagging differences
4. **New features** — elements the template has that `deck-helpers.js` doesn't
   (e.g., accent rules, triangle bullets, different bullet spacing)
5. **Recommended overrides** — the `overrides` object for the theme JSON

### Step 5: Output the theme JSON

Ask the user for a theme name (suggest one based on the source deck). Write the
theme JSON to `skills/lgtm-presentation/themes/<slug>.json`:

```json
{
  "name": "<Human-readable name>",
  "sourceUpdated": "<date if known, else null>",
  "sourceUrl": "<Google Slides URL if known, else null>",
  "extractedOn": "<today's date>",
  "overrides": {
    // Only include values that DIFFER from deck-helpers.js defaults
  }
}
```

The `overrides` object can contain any of these keys:
- `accentRules` (boolean) — draw red horizontal rules on content slides
- `topRuleY` (number) — y position in inches for the top accent rule
- `bottomRuleY` (number) — y position for the bottom accent rule
- `bulletStyle` ("round" | "triangle") — bullet marker shape
- `bulletColor` (string) — hex color for bullet markers (no #)
- `logoX`, `logoY`, `logoW`, `logoH` (number) — footer logo position/size
- `pageNumX`, `pageNumY` (number) — page number position
- `titleX`, `titleY`, `titleW` (number) — content title position
- `bodyY` (number) — where body content starts
- `colors` (object) — color overrides keyed by COLOR map names

### Step 6: Install and confirm

Save the theme JSON to **both** locations so the installed skill picks it up:
1. `skills/lgtm-presentation/themes/<slug>.json` (workspace copy)
2. `~/.claude/skills/lgtm-presentation/themes/<slug>.json` (installed copy)

Then tell the user the theme was saved and remind them that next time they use
`lgtm-presentation` to build a deck, the agent will offer this theme as an option.

## How to export SVGs from Google Slides

1. Open the deck in Google Slides (e.g.,
   [Red Hat Standard Template](https://docs.google.com/presentation/d/1vsgAuoBu8aZDMbmvsYy-VViim4vmoTm8TEgEgzupEj0/edit))
2. Navigate to a slide you want to export
3. **File → Download → Scalable Vector Graphics (.svg)**
4. This exports the current slide only — repeat for each slide type you need
   (typically: cover, content, agenda, section divider, closing)
5. Save the SVGs into a folder in your workspace (e.g., `test-images/` or
   `templates/<deck-name>/`)
6. Name them descriptively if possible, or leave the default numbered names

**Tip:** You only need one representative of each slide type. Exporting 4–6
slides (cover + a few content variants + divider) is sufficient for theme
extraction.

## Coordinate conversion

Google Slides exports SVGs at a viewBox of approximately `1279.68 × 720.0`.
The deck builder uses inches on a `13.333 × 7.5` canvas (LAYOUT_WIDE).

**Conversion factor:** `13.333 / 1279.68 ≈ 0.01042 inches per SVG unit`

To convert any SVG coordinate to deck inches: `svg_value × 0.01042`

## Example walkthrough

Here's what a full run looks like in practice:

**User says:** "Analyze the templates in test-images/"

**Agent responds:**

> Found 5 SVGs in `test-images/`:
>
> | # | File | Classification |
> |---|------|----------------|
> | 1 | `1. Red Hat standard presentation template.svg` | Agenda (two-column, triangle bullets) |
> | 2 | `1. Red Hat standard presentation template (1).svg` | Cover (large background image) |
> | 3 | `1. Red Hat standard presentation template (2).svg` | Content (single-column bullets) |
> | 4 | `1. Red Hat standard presentation template (3).svg` | Section Divider (red background) |
> | 5 | `1. Red Hat standard presentation template (5).svg` | Code (dark rectangle overlay) |
>
> ### Extracted layout (Agenda slide)
>
> - Accent rules: vertical red lines at x=0.49", top (y=0→0.97") and bottom (y=7.0→7.5")
> - Logo: (12.53", 6.83") size 0.43"×0.32"
> - Page number: (0.09", 6.75")
> - Triangle bullets in two columns: left at x=0.49", right at x=9.72"
> - Title: red text at (0.49", 0.06")
>
> ### Comparison vs. current deck-helpers.js
>
> | Constant | Current | Template | Delta |
> |----------|---------|----------|-------|
> | Logo x | 11.55 | 12.53 | +0.98 |
> | Logo y | 6.95 | 6.83 | -0.12 |
> | Logo w | 1.13 | 0.43 | -0.70 |
> | Logo h | 0.27 | 0.32 | +0.05 |
> | Page num x | 0.62 | 0.09 | -0.53 |
> | Bullet style | round | triangle | change |
> | Accent rules | none | present | NEW |
>
> ### New features not in current helpers
> - Red accent rules (vertical lines at left edge)
> - Triangle bullet markers instead of round
> - Smaller logo (fedora icon vs. wordmark)
>
> What would you like to name this theme?

**User says:** "Red Hat Standard"

**Agent writes** `skills/lgtm-presentation/themes/red-hat-standard.json`:

```json
{
  "name": "Red Hat Standard",
  "sourceUpdated": "2026-04-10",
  "sourceUrl": "https://docs.google.com/presentation/d/1vsgAuoBu8aZDMbmvsYy-VViim4vmoTm8TEgEgzupEj0/",
  "extractedOn": "2026-07-28",
  "overrides": {
    "accentRules": true,
    "topRuleY": 0.97,
    "bottomRuleY": 7.0,
    "ruleX": 0.49,
    "bulletStyle": "triangle",
    "logoX": 12.53,
    "logoY": 6.83,
    "logoW": 0.43,
    "logoH": 0.32,
    "pageNumX": 0.09,
    "pageNumY": 6.75
  }
}
```

> Theme saved. Next time you build a deck with `lgtm-presentation`, you'll be
> asked whether to use "Red Hat Standard (Apr 2026)" or the series default.

---

**Later, when building a deck:**

**User says:** "Build me a deck about Kubernetes operators"

**Agent checks `themes/` and asks:**

> I found 2 themes available:
> 1. **Red Hat Standard** (source updated Apr 2026) — triangle bullets, accent rules
> 2. **Designing Cloud-Native APIs** (default) — round bullets, no accent rules
>
> Which theme should I use?

**User picks 1**, agent sets `export DECK_THEME=./themes/red-hat-standard.json`
before running `node deck.js`, and the resulting `.pptx` uses the new layout.

## Reference files

- **`references/svg-parsing.md`** — SVG structure, element types, how Google
  Slides encodes text/shapes/images, and the coordinate system.
- **`references/slide-classification.md`** — heuristics for identifying slide
  types from SVG structure.
- **`references/extraction-rules.md`** — what to extract from each slide type
  and how it maps to `deck-helpers.js` constants.
