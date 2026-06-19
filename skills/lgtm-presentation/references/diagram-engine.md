# Diagram engine reference (`diagrams.py` + `dgen.py`)

Diagrams are authored **in Python** via a `Scene` object and emitted as
**SVG + Excalidraw + PNG**. One source of truth (`diagrams.py`), three outputs:
crisp vector SVG, an editable `.excalidraw` source, and a PNG sized for slide
embedding (read by the deck's `addDiagramSlide`). The palette matches the deck
(see `theme.md`) so diagrams sit naturally beside the slides.

## Setup

```bash
cp scripts/dgen.py scripts/build_diagrams.py .
cp scripts/diagrams.template.py diagrams.py
mkdir -p diagrams png
python3 build_diagrams.py     # builds every scene -> SVG + .excalidraw, then renders PNGs
```

Path env vars (defaults shown), set only if your layout differs:
- `DIAG_DIR` → `./diagrams` (SVG + `.excalidraw` output)
- `PNG_DIR` → `./png` (rendered PNGs; what the deck's `addDiagramSlide` reads)
- `DECK_WORK` → `.` (dir containing `diagrams.py`, for `build_diagrams.py` to import)

## Authoring a scene

A scene is a function that creates a `Scene`, draws on it, and calls `.write()`;
register every scene in the `SCENES` list:

```python
from dgen import Scene, PALETTE

def auth_flow():
    s = Scene("r10-auth-flow", width=1240, height=620,
              title="OAuth bearer-token flow",
              subtitle="The five-service journey, one request.")
    s.box(80, 150, 240, 80, "Client", ["sends Bearer token"], kind="svc")
    s.box(480, 150, 240, 80, "API gateway", ["validates JWT", "iss / aud / exp"], kind="rest")
    s.arrow(320, 190, 480, 190, kind="neutral", label="Authorization: Bearer")
    s.panel(80, 300, 640, 120)                       # soft background callout
    s.label(104, 335, "Pin the algorithm; 401 + WWW-Authenticate on failure.", size=13)
    s.write()                                        # -> diagrams/r10-auth-flow.{svg,excalidraw}

SCENES = [ auth_flow ]                               # register every scene here
```

Naming: a short stable id `rNN-topic` (e.g. `r75-testing-pyramid`). The deck
embeds it by that name: `addDiagramSlide(s, eyebrow, title, "r75-testing-pyramid", caption)`.
`build_diagrams.py` runs every function in `SCENES`, then renders all SVGs to PNGs.

## The Scene API

All coordinates are pixels on the SVG canvas (origin top-left). Every method also
appends an equivalent Excalidraw element, so SVG and `.excalidraw` stay in sync.

```python
Scene(name, width=1200, height=600, title=None, subtitle=None)
```
White canvas; `title` centered at y≈36 (22px bold), `subtitle` at y≈64 (14px
muted). Leave ~100px of top margin for them.

```python
box(x, y, w, h, title="", lines=None, kind="neutral", mono=False, r=8)
```
Rounded rect, white fill, colored stroke by `kind`; `title` centered (at y+24 if
`lines`, else vertically centered); `lines` = short sub-strings (12px, muted)
stacked under the title; `mono=True` for code-like titles; `r` = corner radius.

```python
label(x, y, text, size=12, weight="normal", color=None, anchor="start", mono=False)
text(x, y, text, ...)   # alias for label
```
Standalone text. `anchor` ∈ `start | middle | end`; `color` defaults to neutral
(pass `PALETTE[...]`). For full layout control, draw arrows without inline labels
and place `label`s at hand-picked spots so nothing collides.

```python
arrow(x1, y1, x2, y2, label=None, kind="neutral", dashed=False, label_offset=-6)
```
Straight arrow, arrowhead colored by `kind`; optional mid-`label` offset by
`label_offset`; `dashed=True` for async/optional. **Make an arrow land on a box**
— a target point in empty space reads as "goes nowhere". For request/response
pairs, separate the two arrows' paths and put the request label near the source,
the response label near the target, so they don't overlap.

```python
divider(x1, y1, x2, y2, kind="grid")     # light dashed separator (no arrowhead)
panel(x, y, w, h, fill=None, stroke=None, r=8)   # soft callout; draw BEFORE labels on top of it
chip(x, y, label, kind="rest", w=None)   # pill (HTTP method / status / tag); auto-sizes if w omitted
code_block(x, y, w, h, lines, lang="rest")  # dark block; #/// lines render comment-green
write()                                  # emit DIAG_DIR/<name>.svg + .excalidraw — call once per scene
```

## Palette (`PALETTE` keys)

`rest` `#EE0000` (API surface) · `svc` `#0066CC` (clients/services) · `data`
`#6A1B9A` (stores/queues/state) · `platform` `#006E6E` (infra/runtime) · `govern`
`#B36B00` (policy/lifecycle) · `danger` `#B71C1C` (failure/terminal) · `neutral`
`#4A4A4A` · `muted` `#5A5A5A` · `bg` `#FFFFFF` · `panel` `#F4F4F4` · `grid`
`#D2D2D2` · `code` `#151515` · `code_fg` `#E6E6E6`. Use color to encode role
consistently across the deck.

## Layout tips

- Default `1200×600`; widen to `1240–1300` for multi-panel layouts. Keep the top
  ~100px for title/subtitle.
- Keep sub-line strings under ~60–70 chars so they don't overrun a box at 12px.
- Panels render in call order — if a label vanishes under a panel, draw it after
  the panel (or move the panel).
- State machines: lay states left-to-right (or in a triangle); labeled arrows for
  transitions; route loop-backs above/below the row.
- Before/after contrasts: two side-by-side panels (the "before" with `danger`
  headers, the "after" with `platform`).

## Editing an embedded diagram you can't regenerate

If a deck embeds a rasterized diagram with the wrong content (e.g. a wrong-stack
variant carried over from a scaffold), and you have the **SVG source**: edit the
text spans in the SVG, bump the root `width`/`height` for a crisp render, convert
SVG→PNG, and swap the embedded image in `ppt/media/`. Because the SVGs use
generic font stacks, a re-render matches the original closely.

## Output & embedding

SVG + `.excalidraw` land in `DIAG_DIR` (open the `.excalidraw` in Excalidraw to
hand-edit); PNGs land in `PNG_DIR`, where the deck's `addDiagramSlide` reads them.
`build_diagrams.py` is idempotent. PNG rendering shells out to the public pptx
skill's converter:

```bash
python3 /mnt/skills/public/pptx/scripts/office/soffice.py --headless --convert-to png <svgs...> --outdir <PNG_DIR>
# or directly:
soffice --headless --convert-to png --outdir png diagrams/*.svg
```
