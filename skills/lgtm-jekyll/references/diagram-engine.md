# Diagram engine (`scripts/generate_diagram.py`)

Diagrams are paired files: `name.svg` (committed, embedded) + `name.excalidraw`
(editable source). One call to `emit(...)` writes both, in the same house style as
the rest of the site, so a set of diagrams looks uniform.

## Usage

```python
import generate_diagram as g
g.OUT = "assets/diagrams"      # where the pair is written (default ".")
g.emit("auth-flow", 720, 360,
       nodes=[...], edges=[...], notes=[...], bands=[...])
# writes assets/diagrams/auth-flow.svg and .excalidraw
```

`emit(name, width, height, bands=None, nodes=None, edges=None, notes=None)`.

## Nodes — rounded boxes with a bold title + grey detail lines

```python
{"x":40, "y":60, "w":180, "h":64, "style":"box", "lines":["Title", "detail", "more"]}
```

`lines[0]` renders bold; the rest render smaller and grey. Styles (fill, stroke):

| style    | look                                  | use for |
|----------|---------------------------------------|---------|
| `box`    | white, dark border, bold              | the default / primary box |
| `sub`    | white, grey border                    | secondary / supporting box |
| `accent` | warm wash, accent border              | the highlighted element |
| `user`   | light blue                            | user-space / client side |
| `kernel` | light grey                            | kernel / system side |
| `ghost`  | white, **dashed** border              | optional/notional box — or, at w=2–3, a **vertical divider line** |
| `ink`    | filled dark, white text               | a strong callout box |

A thin `ghost` node (e.g. `w:2, h:240`) is the idiom for a dashed
**user | kernel** divider.

## Edges — arrows

```python
{"x1":220,"y1":92,"x2":300,"y2":92,            # from → to
 "label":"attach", "lx":260,"ly":84,            # optional label + its position
 "amber":True, "dashed":True, "bidir":True}     # optional flags
```

`amber` recolors the arrow to the accent; `bidir` adds a tail arrowhead; labels
get a white halo so they stay readable over lines. **Make each arrow's endpoint
land on the box it points at** and keep its label near the relevant end — scattered
arrows that don't visibly connect to anything read as random.

## Notes — free-standing labels

```python
{"x":360,"y":30,"text":"section title","anchor":"middle","size":14,"bold":True,"color":"#b8650a"}
```

`anchor` is `start`/`middle`/`end`. **Default note color is dark (`#1d1d1d`)** so
peripheral labels are readable — the light-grey default was a real legibility bug;
keep titles dark or accent (`#b8650a`), not light grey. Use `bands` (a list of
`{x,y,w,h,label}`) only for full-width background lanes.

## Validate every diagram

After emitting, confirm both files parse (cheap insurance against a malformed
spec):

```python
import xml.dom.minidom, json
xml.dom.minidom.parse("assets/diagrams/auth-flow.svg")
json.load(open("assets/diagrams/auth-flow.excalidraw"))
```

Then catalogue it in `assets/diagrams/README.md` and embed with the include
(literal Liquid wrapped in `{% raw %}` — see `authoring-conventions.md`). Scan the
`alt=` text you write for stray `<...>` and escape them, or they break the HTML.
