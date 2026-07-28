# Extraction Rules — Mapping SVG Elements to deck-helpers.js

This document defines what to extract from each SVG slide type and how it maps
to the constants and helper functions in `deck-helpers.js`.

## Conversion reference

**SVG viewBox:** 1279.68 × 720.0
**Deck canvas:** 13.333 × 7.5 inches
**Factor:** `13.333 / 1279.68 = 0.01042`

```
inches = svg_units × 0.01042
```

## Constants to extract

### COLOR map

Look for these fill/stroke values in the SVGs and compare against the current
`COLOR` object in `deck-helpers.js`:

| COLOR key | Current value | SVG element to check |
|-----------|---------------|---------------------|
| `red` | `EE0000` | Accent lines stroke, title text fill, bullet markers fill |
| `redDark` | `AB0000` | Section divider background fill |
| `ink` | `151515` | Body text fill on dark backgrounds, code box fill |
| `body` | `242424` | Main body text fill |
| `caption` | `5A5A5A` | Caption/subtitle text fill |
| `pageNum` | `8A8A8A` | Page number text fill |
| `codeBg` | `151515` | Code rectangle fill |
| `white` | `FFFFFF` | Text on dark/red backgrounds |

### Footer — `addFooter(slide, pageNum)`

Extract from content/agenda slides (look for logo image + page number text):

| Property | Current value | SVG source |
|----------|---------------|------------|
| Page number x | `0.62` | x of page number text cluster (bottom-left) |
| Page number y | `6.96` | y of page number text cluster |
| Logo x | `11.55` | x of bottom-right `<image>` element |
| Logo y | `6.95` | y of that image |
| Logo w | `1.13` | width of that image |
| Logo h | `0.27` | height of that image |

**SVG identification:**
- Page number: small text paths near (x < 100, y > 640), fill matches `pageNum` color
- Logo: `<image>` element with x > 1100, y > 640

### Content title — `addContentTitle(slide, eyebrow, title)`

Extract from content/agenda slides:

| Property | Current value | SVG source |
|----------|---------------|------------|
| Eyebrow x | `0.62` | x of red text cluster at top |
| Eyebrow y | `0.42` | y of that cluster |
| Title x | `0.62` | x of dark text cluster below eyebrow |
| Title y | `0.74` | y of that cluster |
| Title w | `12.09` | width of title text frame (right edge x - left x) |

**SVG identification:**
- Eyebrow: text paths with fill `#ee0000` at top of slide (y < 100)
- Title: text paths with fill `#151515` just below the eyebrow (y between 50–150)

### Bullets — `addBullets(slide, lines)`

Extract from content slides with bullets:

| Property | Current value | SVG source |
|----------|---------------|------------|
| Bullets x | `0.62` | x of first bullet marker |
| Bullets y | `1.85` | y of first bullet marker |
| Bullets w | `12.09` | right edge of text - left edge |
| Bullet style | `"25CF"` (round) | Shape of marker paths (triangle vs circle) |
| Bullet color | (same as body) | Fill of marker paths |

**SVG identification:**
- Bullet markers: small paths (< 15 SVG units bounding box) with fill `#ee0000`
- Triangle: path with 3 line segments + close (e.g., `l-8.5 4.6 l0 -9.1 l8.5 4.5z`)
- Circle: `<circle>` element or small arc path

**Bullet style mapping:**
| SVG shape | Theme value | pptxgenjs code |
|-----------|-------------|----------------|
| Triangle (right-pointing) | `"triangle"` | `"25B6"` |
| Circle (filled) | `"round"` | `"25CF"` |
| Dash | `"dash"` | `"2014"` |

### Two-column layout — `addTwoColBullets(slide, left, right)`

Extract from agenda slides with two x-clusters of bullets:

| Property | Current value | SVG source |
|----------|---------------|------------|
| Left column x | `0.62` | x of left bullet cluster |
| Left column w | `6.00` | gap start x - left x |
| Right column x | `7.02` | x of right bullet cluster |
| Right column w | `6.00` | slide right edge - right column x (with margin) |
| Column y | `1.85` | y of first bullet in either column |

**SVG identification:**
- Two distinct x-position clusters of bullet markers
- Left cluster: markers with x < 640 SVG units (< 6.67")
- Right cluster: markers with x > 640 SVG units (> 6.67")
- The gap between columns: right cluster x - (left cluster x + estimated text width)

### Accent rules (NEW — not in current deck-helpers.js)

Red accent lines that appear on content/agenda slides:

| Property | SVG source |
|----------|-----------|
| `accentRules` | `true` if any `stroke="#ee0000"` line paths found |
| `topRuleX` | x of top accent line start |
| `topRuleY1` | y start (typically 0) |
| `topRuleY2` | y end of top accent line |
| `bottomRuleX` | x of bottom accent line start |
| `bottomRuleY1` | y start of bottom accent line |
| `bottomRuleY2` | y end (typically 720 = 7.5") |

**SVG identification:**
- `<path stroke="#ee0000" stroke-width="1.0" ...>` elements
- Parse `d` attribute: `m<x> <y>l<dx> <dy>` gives start and end
- Vertical lines: dx=0, dy > 50

### Section divider — `addSectionDivider(slide, code, title, subtitle)`

Extract from divider slides (red/dark background):

| Property | Current value | SVG source |
|----------|---------------|------------|
| Background color | `AB0000` | Fill of the full-slide background path |
| Title x | `6.24` | x of large white text cluster |
| Title y | `2.84` | y of that cluster |

**SVG identification:**
- Background: first path filling entire slide with non-white color
- Title text: white-filled (`#ffffff`) text paths, large bounding box

### Code slide — `addCodeSlide(...)`

Extract from code slides (dark rectangle overlay):

| Property | Current value | SVG source |
|----------|---------------|------------|
| Code box x | `0.62` | x of dark rectangle |
| Code box y | `1.85` | y of dark rectangle |
| Code box w | `12.09` | width of dark rectangle |
| Code box h | `4.65` | height of dark rectangle |
| Code box fill | `151515` | fill color of the rectangle |

**SVG identification:**
- Large rectangle path with fill `#151515` that does NOT cover the entire slide
- Has margins (x > 0, y > 100 SVG units)

## Comparison report format

After extracting values, produce a comparison table:

```markdown
## Layout Comparison: <Theme Name> vs. Current

| Constant | Current | Template | Delta |
|----------|---------|----------|-------|
| Footer logo x | 11.55 | 12.53 | +0.98 |
| Footer logo y | 6.95 | 6.83 | -0.12 |
| ... | ... | ... | ... |

### New features in template (not in current deck-helpers.js):
- Accent rules: vertical red lines at x=0.49", top (y=0 to 0.97") and bottom (y=7.0 to 7.5")
- Triangle bullets instead of round bullets
- ...
```

## Theme JSON output rules

Only include values in the `overrides` object that **differ** from current
`deck-helpers.js` constants. Do not repeat values that already match.

Example: if the template logo is at (12.53, 6.83) but current is (11.55, 6.95),
include `logoX`, `logoY`. If bullet color is `EE0000` in both, omit it.

Special cases:
- `accentRules: true` — always include if accent lines are found (feature not
  in current helpers at all)
- `bulletStyle: "triangle"` — include if template uses triangles (current uses
  round `"25CF"`)
- New colors: include in a `colors` sub-object only if they differ from
  the `COLOR` map

## Precision

- Round all inch values to **2 decimal places**
- Convert SVG values to inches before rounding
- When comparing, flag differences > 0.05" as significant; differences < 0.05"
  can be noted as "minor adjustment"
