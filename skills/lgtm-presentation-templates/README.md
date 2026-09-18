# lgtm-presentation-templates

A Cursor/Claude skill that reads SVG exports from official Red Hat Google Slides decks, classifies slide types, extracts layout tokens, and produces theme JSON files for the `lgtm-presentation` deck builder.

## What it does

1. **Reads** SVG files exported from Google Slides (one per slide)
2. **Classifies** each slide by type (cover, content/agenda, section divider, code, closing)
3. **Extracts** layout tokens — logo position, accent lines, bullet style, title placement, colors
4. **Compares** extracted values against the current `deck-helpers.js` constants
5. **Outputs** a theme JSON file that `lgtm-presentation` loads at build time

## Usage

In a chat with the skill loaded, say:

```
Analyze the templates in test-images/
```

The agent will classify each SVG, extract layout data, show you a comparison report, and ask for a theme name before saving the JSON.

## How to export SVGs from Google Slides

1. Open the deck in Google Slides
2. Navigate to a slide
3. **File → Download → Scalable Vector Graphics (.svg)**
4. Repeat for each slide type (cover, content, divider, code)
5. Save into a folder (e.g., `test-images/` or `templates/<deck-name>/`)

You only need one representative of each slide type — 4–6 SVGs is sufficient.

## Theme JSON output

The skill produces a file like `skills/lgtm-presentation/themes/<name>.json`:

```json
{
  "name": "Red Hat Standard",
  "sourceUpdated": "2026-04-10",
  "sourceUrl": "https://docs.google.com/presentation/d/...",
  "extractedOn": "2026-07-28",
  "overrides": {
    "accentRules": true,
    "topRuleY": 0.97,
    "bottomRuleY": 7.0,
    "bulletStyle": "triangle",
    "logoX": 12.53,
    "logoY": 6.83,
    "logoW": 0.43,
    "logoH": 0.33
  }
}
```

Only values that differ from `deck-helpers.js` defaults are included in `overrides`.

## Relationship to lgtm-presentation

```
lgtm-presentation-templates (this skill)
    reads SVGs → produces theme JSON
                        ↓
lgtm-presentation (the deck builder)
    reads theme JSON → applies overrides → builds .pptx
```

The two skills communicate via the `themes/` directory. Neither modifies the other's code.

## Structure

```
skills/lgtm-presentation-templates/
├── SKILL.md                           # Skill definition and procedure
└── references/
    ├── svg-parsing.md                 # SVG structure and coordinate conversion
    ├── slide-classification.md        # Heuristics for identifying slide types
    └── extraction-rules.md            # Mapping SVG elements to deck-helpers.js
```
