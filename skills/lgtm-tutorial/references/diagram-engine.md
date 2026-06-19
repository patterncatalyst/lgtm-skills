# Diagram engine — `generate_diagram.py`

`scripts/generate_diagram.py` compiles one spec into a matching pair: a themed
`<name>.svg` (what the site embeds) and a valid `<name>.excalidraw` (the
editable companion). Both are written to `OUT` and validated on the way out.

## Driving it

```python
import sys; sys.path.insert(0, "scripts")
import generate_diagram as g
g.OUT = "assets/diagrams"          # output directory
g.emit(name, width, height, bands=[...], nodes=[...], edges=[...], notes=[...])
```

`emit()` writes `OUT/name.svg` and `OUT/name.excalidraw`, then parses both to
confirm they are well-formed. All four element lists are optional.

## Elements

- **band** — a background lane / container box. A box that *contains* other
  boxes must be a band (its label sits top-left, out of the way).
  `{"x","y","w","h","label","fill"}` (`fill` defaults to `#fafafa`).
- **node** — a rounded box with a bold title line plus smaller grey detail
  lines. `{"x","y","w","h","style","lines":[title, detail, …]}`.
- **edge** — an arrow. `{"x1","y1","x2","y2"}` plus optional
  `label`, `lx`/`ly` (label nudge), `amber` (accent color), `dashed`, `bidir`
  (arrowheads on both ends). Terminate every edge on a box edge or another
  arrow — never into empty space.
- **note** — free text. `{"x","y","text"}` plus optional `anchor`
  (`start`/`middle`/`end`), `size`, `color`, `bold`.

## Node styles

| style    | look                              |
|----------|-----------------------------------|
| `box`    | white fill, dark border (default) |
| `sub`    | white fill, grey border           |
| `accent` | soft accent fill, accent border   |
| `muted`  | light-grey fill, grey border      |
| `info`   | soft-blue fill, blue border       |
| `ghost`  | white fill, dashed grey border    |
| `ink`    | filled dark, white text           |

## Conventions

- **Nodes are drawn before edges** so arrowheads render on top of boxes — the
  generator already does this; don't reorder.
- Labels get a white halo so they stay legible over a line or box.
- Embed with the include, always with `alt` text and a `Figure N.x` caption:
  `{% raw %}{% include excalidraw.html file="my-diagram" alt="…" caption="Figure N.x — …" %}{% endraw %}`

## Theming

The palette lives in the `STYLES` dict and the `INK`/`GREY`/`AMBER` constants at
the top of the script. To rebrand, change the accent there (and match the site
CSS accent token). The two arrowhead markers (`a` grey, `am` accent) are defined
in the SVG `<defs>`.
