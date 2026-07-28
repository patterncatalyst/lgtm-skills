# Slide Classification Heuristics

Use these heuristics to identify the type of each SVG slide. Apply them in
order — the first match wins.

## Classification table

| Type | Key signals | Confidence boosters |
|------|-------------|---------------------|
| **Cover** | Large `<image>` (>50% slide area), title text in accent color (>40pt equiv.) | No bullet markers, no page number |
| **Section Divider** | Background fill is red (`#ab0000`, `#cc0000`) or dark (`#151515`), white text | Minimal elements (<20 paths), no bullets |
| **Code** | Large dark rectangle (>60% area, fill `#151515`/`#1a1a1a`) | Monospace-like text regions, no bullets |
| **Agenda/Content** | Bullet markers present (triangles or circles), accent rules | Two-column layout, page number, logo |
| **Closing/Thank You** | Background fill, large centered text, contact info pattern | Logo present, minimal body text |
| **Blank/Template** | Only background + logo + page number | <10 total elements |

## Detailed heuristic rules

### 1. Cover slide

**Primary signal:** An `<image>` element whose width × height exceeds 50% of
the slide area (1280 × 720 = 921,600 sq units; image area > 460,800).

**Secondary signals:**
- Title text cluster with fill `#ee0000` positioned in the upper half
- No bullet markers anywhere
- No page number in bottom-left
- May have a subtitle text cluster in `#151515` or `#ffffff`

**Variant — dark cover:** Background path fill is `#151515`, title in `#ffffff`,
red accent line present.

### 2. Section Divider

**Primary signal:** The background `<path>` (first full-slide path) has a fill
that is NOT white. Look for:
- `#ab0000` (dark red)
- `#cc0000` (medium red)
- `#ee0000` (bright red)
- `#151515` (near-black)

**Secondary signals:**
- Very few elements total (< 20 significant paths)
- Text is white (`#ffffff`) or light
- No bullet markers
- May have a logo (white variant) in corner

### 3. Code slide

**Primary signal:** A rectangular `<path>` with fill `#151515` or `#1a1a1a`
that covers > 60% of the slide area (not the background itself, but an
overlaid rectangle, typically with some margin).

**Secondary signals:**
- Text regions inside the dark rectangle (code content — paths with light fills)
- No bullet markers
- May have a thin title area above the code block
- The dark rectangle typically has margins: x > 30, y > 100

**Distinguishing from Section Divider:** Code slides have a dark *rectangle*
as a foreground element with visible margins; section dividers have the
background itself as the dark/red fill.

### 4. Agenda / Content slide

**Primary signal:** Presence of bullet markers — small `<path>` elements with
fill `#ee0000` forming triangles OR small `<circle>` elements.

**Layout detection — two columns:**
- Bullets appear in two x-position clusters (left cluster x < 640, right
  cluster x > 640)
- OR a vertical divider/gap between x=580–700

**Layout detection — single column:**
- All bullets in one x-position cluster (x < 640 or x > 200)

**Secondary signals:**
- Red accent lines (`stroke="#ee0000"`) at top and/or bottom
- Page number text near bottom-left
- Logo image near bottom-right
- Title text in `#ee0000` at top

### 5. Closing / Thank You

**Primary signal:** Background is NOT white (often red or dark), similar to
divider, but with:
- Contact information pattern: multiple small text clusters stacked vertically
  in the lower half
- A logo (possibly larger than footer-sized)

**Secondary signals:**
- Text clusters that look like: name, title, email (stacked)
- Social media icons (small images or specific path shapes)

### 6. Blank / Template skeleton

**Primary signal:** Very few elements (< 10 paths total after filtering the
background clip path).

Contains only:
- Background (white)
- Logo in standard position
- Page number
- Possibly accent lines

No title text, no bullets, no large shapes.

## Decision flowchart

```
Start
  │
  ├─ Background fill ≠ #ffffff?
  │   ├─ Few elements (< 20)? → Section Divider
  │   └─ Contact info pattern? → Closing
  │
  ├─ Large dark rectangle (>60% area)? → Code
  │
  ├─ Large image (>50% area)? → Cover
  │
  ├─ Bullet markers present?
  │   ├─ Two x-clusters? → Agenda (two-column)
  │   └─ One cluster? → Content (single-column)
  │
  ├─ < 10 elements total? → Blank/Template
  │
  └─ Default → Content (single-column)
```

## Edge cases

- **Hybrid slides** (e.g., content with an embedded image): classify by the
  dominant structural element. If bullets exist, it's Content even if there's
  a small image.
- **Numbered lists vs bullets:** Numbered lists won't have triangle/circle
  markers but will have number text. Classify as Content.
- **Multiple code blocks:** Still classify as Code if the largest dark rectangle
  exceeds 40% area.
- **Partial exports:** If the SVG appears truncated or has unexpected dimensions,
  flag it for manual review rather than guessing.
