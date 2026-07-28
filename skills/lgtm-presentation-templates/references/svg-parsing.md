# SVG Parsing — Google Slides Exports

This document describes the structure of SVG files exported from Google Slides
and how to parse them for layout token extraction.

## SVG envelope

Every exported slide has this structure:

```xml
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0.0 0.0 1279.6798 720.0">
  <defs>
    <clipPath id="p.0">
      <path d="m0 0l1279.68 0l0 720.0l-1279.68 0l0 -720.0z" ... />
    </clipPath>
  </defs>
  <g clip-path="url(#p.0)">
    <!-- All visible elements here -->
  </g>
</svg>
```

Key takeaways:
- **ViewBox** is `0.0 0.0 1279.6798 720.0` — this is the coordinate system.
- All child elements sit inside a single `<g>` clipped to the slide bounds.
- The aspect ratio is 16:9 (1279.68:720 ≈ 1.777).

## Coordinate system

| Axis | SVG range | Deck inches (13.333×7.5) | Conversion |
|------|-----------|--------------------------|------------|
| X    | 0 – 1279.68 | 0 – 13.333           | `× 0.01042` |
| Y    | 0 – 720.0   | 0 – 7.5              | `× 0.01042` |

**Formula:** `inches = svg_units × (13.333 / 1279.68)`

Both axes use the same factor since the aspect ratio is preserved.

## Element types

### Background rectangle

The first `<path>` with a `fill` and no `stroke` that matches the full slide
bounds is the background:

```xml
<path fill="#ffffff" d="m0 0l1279.68 0l0 720.0l-1279.68 0l0 -720.0z" ... />
```

- White (`#ffffff`) = standard content/cover slide
- Red (`#ab0000` or `#cc0000`) = section divider
- Dark (`#151515` or `#1a1a1a`) = dark/code slide

### Accent lines (rules)

Horizontal or vertical lines drawn as `<path>` with a colored stroke:

```xml
<path stroke="#ee0000" stroke-width="1.0" stroke-linejoin="round"
      d="m47.244 0l0 93.543" fill-rule="evenodd" />
```

Parse the `d` attribute to find start/end points:
- `m<x> <y>` = starting point
- `l<dx> <dy>` = line delta (relative move)

In this example: vertical line at x=47.24, from y=0 to y=93.54.

Look for `stroke="#ee0000"` (Red Hat red) as the accent color.

### Text elements

Google Slides exports text as **paths** (outlines), not as `<text>` elements.
Text is identified by:
1. Small `<path>` elements with `fill` color matching known text colors
2. Grouped together spatially in bounding boxes
3. Often preceded by a transform or clip-path defining the text frame

Common text colors:
| Color | Purpose |
|-------|---------|
| `#ee0000` | Titles, headings |
| `#151515` or `#000000` | Body text |
| `#5a5a5a` or `#8a8a8a` | Captions, page numbers |
| `#ffffff` | Text on dark/red backgrounds |

Since text is paths, you cannot read the actual text content. Instead, identify
text regions by:
- Clusters of small complex paths with the same fill color
- Bounding box can be estimated from the `d` attribute min/max coordinates
- Position of the first path in a cluster = approximate text origin

### Images (logos, photos)

Embedded as base64-encoded `<image>` elements:

```xml
<image x="1203.27" y="656.69" width="41.6" height="31.1"
       xlink:href="data:image/png;base64,iVBOR..." />
```

Extract: `x`, `y`, `width`, `height` for position and size.

For the Red Hat logo specifically, look for an `<image>` element near the
bottom-right corner (x > 1100, y > 600).

### Bullet markers

Triangular bullets appear as small `<path>` elements with:
- `fill="#ee0000"` (same red as accents)
- A triangular shape in the `d` attribute

Pattern for a right-pointing triangle:
```
m<x> <y> l-8.5 4.6 l0 -9.1 l8.5 4.5z
```

The first `m` gives the position. Look for paths where:
- The path is small (bounding box < 15 SVG units)
- Fill is the accent color
- Shape forms a triangle (3 line segments + close)

Round bullets appear as small circles:
```xml
<circle cx="..." cy="..." r="3.5" fill="#ee0000" />
```
Or as very small arc paths.

### Rectangles and shapes

Generic shapes (colored blocks, code backgrounds, divider fills):

```xml
<path fill="#151515" d="m50 150l800 0l0 450l-800 0l0 -450z" ... />
```

Rectangles have 4 `l` segments forming a closed box. Extract bounds from the
`m` start and the `l` deltas.

## Parsing strategy

1. **Read the viewBox** to confirm dimensions (expect ~1280×720).
2. **Find the background** — first full-slide `<path>` with a fill.
3. **Scan for accent lines** — `<path>` elements with `stroke="#ee0000"`.
4. **Locate images** — `<image>` elements; the bottom-right one is typically the logo.
5. **Find bullet markers** — small red-filled triangular/circular paths.
6. **Identify text regions** — clusters of same-colored paths; estimate bounding boxes.
7. **Detect large shapes** — rectangles with dark/colored fills (code blocks, dividers).

## Handling large SVG files

SVG files from Google Slides can exceed 100KB due to embedded images and
vectorized text. When reading:
- Use `offset` and `limit` to read sections if the file is too large
- Search (grep) for specific patterns like `stroke="#ee0000"` or `<image` first
- The structural elements (accents, shapes, images) are typically in the first
  50–100 lines and last 20 lines; vectorized text fills the middle

## Example: Converting an accent line position

SVG accent line at `m47.244 0l0 93.543`:
- Start: (47.24, 0) → (0.49", 0.0")
- End: (47.24, 93.54) → (0.49", 0.97")

This means a vertical red rule at x=0.49" running from y=0" to y=0.97" (top of slide).
