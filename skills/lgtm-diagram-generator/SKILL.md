---
name: lgtm-diagram-generator
description: Generate clean, consistent technical diagrams as paired files — a themed SVG (to embed or commit) plus an editable .excalidraw source — from a short Python spec of boxes, arrows, and labels. Use this whenever you need a repeatable architecture diagram, flowchart, pipeline, sequence/lifecycle figure, layered/system diagram, or "Figure N" for documentation, a tutorial, a README, or a slide — especially when diagrams must look uniform across a set, follow a house style (warm amber accent on Red Hat fonts), and ship as real files with an editable source rather than a one-off inline picture. Reach for it on "make a diagram of…", "draw the architecture/flow", "a figure showing…", or any request to produce diagram assets on disk.
---

# LGTM diagram generator

`scripts/generate_diagram.py` turns one declarative spec into two files:

- `<name>.svg` — a clean, themed vector diagram (what you embed/commit), and
- `<name>.excalidraw` — the same diagram as editable Excalidraw v2 JSON
  (so anyone can open it on excalidraw.com and adjust).

`emit()` writes both and **self-validates** them (parses the SVG, loads the
JSON) before returning. Diagrams come out visually uniform because every
box, arrow, and label is drawn from the same small palette and rules — ideal
for a documentation set where figures must match.

## How to use it

```python
import sys; sys.path.insert(0, "scripts")   # path to this skill's scripts/
import generate_diagram as g

g.OUT = "assets/diagrams"        # output directory (default ".")
g.emit("request-flow", 880, 300,
       bands=[{"x":20, "y":40, "w":820, "h":120, "label":"service", "fill":"#fafafa"}],
       nodes=[
         {"x":40,  "y":70, "w":170, "h":60, "style":"user",   "lines":["Client", "browser"]},
         {"x":340, "y":70, "w":170, "h":60, "style":"accent", "lines":["API", "handler"]},
         {"x":640, "y":70, "w":170, "h":60, "style":"box",    "lines":["Database"]},
       ],
       edges=[
         {"x1":210, "y1":100, "x2":340, "y2":100, "label":"request"},
         {"x1":510, "y1":100, "x2":640, "y2":100, "label":"query", "amber":True},
       ],
       notes=[{"x":440, "y":30, "text":"one request, three hops", "anchor":"middle", "bold":True}])
# → writes assets/diagrams/request-flow.svg + .excalidraw
```

## The spec — four element kinds

**`nodes`** — labeled boxes. Required `x, y, w, h, lines`. `lines[0]` is the
bold title; any further strings are smaller grey detail lines, all centered.
Optional `icon` (path to a PNG or SVG in `logos/`) renders a small image
centered above the text labels — useful for product logos in architecture
diagrams. Optional `iconSize` (default 28) controls the icon dimensions.
`style` (default `"box"`) picks the palette:

| style    | look                                  | use for |
|----------|---------------------------------------|---------|
| `box`    | white, black border                   | the default thing |
| `accent` | warm wash, amber border               | the subject / the highlighted box |
| `user`   | light blue, blue border               | user-space / client side |
| `kernel` | grey wash, grey border                | kernel / system side |
| `sub`    | white, light-grey border              | secondary/aside boxes |
| `ghost`  | white, dashed grey border             | optional/absent/future things |
| `ink`    | filled dark, white text               | a strong terminal/result box |

**`edges`** — arrows. Required `x1, y1, x2, y2`. Optional: `label`,
`amber: True` (accent-colored line + head), `dashed: True`, `bidir: True`
(arrowheads both ends), and `lx`/`ly` to nudge the label off the midpoint.
Labels get a white halo so they stay legible over a line or box.

**`bands`** — background framing rectangles drawn *behind* everything.
Required `x, y, w, h`. Optional `label` (sits **top-left**) and `fill`.

**`notes`** — free text. Required `x, y, text`. Optional `anchor`
(`start`/`middle`/`end`), `bold`, `size`, `color`.

## Rules that keep diagrams clean (learned the hard way)

- **Nodes draw before edges**, so arrowheads land *on top* of boxes instead
  of hiding behind them. The generator already does this — author freely.
- **A container that holds other boxes must be a `band`, not a `node`.** A
  node's label is centered and would be hidden by the inner boxes; a band's
  label sits in the top-left corner, out of the way.
- **Every edge must terminate on a box edge or on another arrow** — never
  into empty space. Compute endpoints from the boxes you're connecting
  (e.g. right edge of A at `x = A.x + A.w` to left edge of B at `x = B.x`).
- **Lay boxes out first, then connect.** Pick `x/y/w/h` for every node, then
  derive edge endpoints from those coordinates.
- Typical canvas: `width` 700–900, `height` 250–450. Leave ~20px margins.

## Embedding the result

The SVG is standalone — drop it into any HTML/Markdown/site. In a Jekyll
site that uses an Excalidraw include, reference the base name and the
include wires up the `.svg` plus a download link to the `.excalidraw`
source. Otherwise, `<img src="name.svg">` or an inline `<object>` works
anywhere, and the `.excalidraw` file is the editable source of record.

## Node icons (product logos)

Nodes can display a product logo icon above their text labels. This makes
architecture diagrams instantly recognizable — an OpenShift node shows the
OpenShift logo, a database node shows a RHEL icon, etc.

```python
{"x":340, "y":70, "w":170, "h":80, "style":"accent", "lines":["OpenShift", "cluster"],
 "icon": "logos/openshift.png"}
```

When `icon` is set:
- The image renders centered horizontally, ~28x28px, in the upper portion of
  the node box
- Text labels shift down to make room
- PNG and SVG files are supported (base64-embedded in the output SVG)
- Set `iconSize` to override the default 28px (e.g., `"iconSize": 36` for
  larger icons)

**Logo discovery:** check for a `logos/` directory in the working folder.
The structure is typically `logos/<Product Name>/` containing variants
(Standard, Reverse, White, Black) in SVG and PNG sizes. For diagram node
icons, prefer the `Standard-RGB.svg` or a `Small_logo_transparent.png`
(keeps file size down). The agent can auto-suggest icons based on node
labels — if a node says "OpenShift", look for `logos/Red Hat OpenShift/`
and pick the Standard SVG or small transparent PNG.

**Excalidraw limitation:** icons appear as `[filename]` text placeholders in
the `.excalidraw` output since Excalidraw doesn't support inline embedded
images the same way. The SVG output is the authoritative rendered version.

## Recoloring

The accent is amber (`#e8870c` / hover `#b8650a` / wash `#fff8ef`) to match
a specific house style. To rebrand, edit the `accent` entry in the `STYLES`
dict and the `AMBER` constant near the top of
`scripts/generate_diagram.py`; everything else is neutral greys.

## Diagram sets → `lgtm-relay`

A single figure needs no orchestration — write the spec and render it. A *set* that
must stay visually uniform does: use the `lgtm-relay` skill so Opus fixes the shared
visual grammar (layout, palette roles, label conventions) up front, Sonnet renders
each figure to it, and Opus checks the set for drift side by side.
