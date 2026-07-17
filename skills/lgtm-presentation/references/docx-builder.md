# DOCX builder reference (python-docx)

Branded `.docx` documents use `python-docx` with Red Hat fonts and embedded
diagrams. The DOCX is a companion format to the PPTX deck — same brand, same
fonts, same diagrams. Use it for advisory documents, companion writeups, and
any content that should be delivered as a Word document alongside (or instead
of) a slide deck.

## Font conventions

All fonts come from the Red Hat brand family (see `theme.md`):

| Element          | Font              | Size   | Color     |
|------------------|-------------------|--------|-----------|
| Headings (H1–H4) | Red Hat Display   | 24–14pt | `#151515` |
| Body text        | Red Hat Text      | 11pt   | `#242424` |
| Bold body        | Red Hat Text Bold | 11pt   | `#242424` |
| Inline code      | Red Hat Mono      | 10pt   | `#CC0000` |
| Code blocks      | Red Hat Mono      | 9pt    | `#333333` on `#F5F5F5` |
| Captions         | Red Hat Text      | 9pt    | `#666666` italic |
| Links            | Red Hat Text      | 11pt   | `#0066CC` underlined |

Set the `Normal` style font to Red Hat Text at document creation:

```python
from docx import Document
from docx.shared import Pt

doc = Document()
style = doc.styles['Normal']
style.font.name = 'Red Hat Text'
style.font.size = Pt(11)
```

For headings, set the font on each heading style:

```python
for level in range(1, 5):
    style = doc.styles[f'Heading {level}']
    style.font.name = 'Red Hat Display'
```

## Embedding diagrams

SVG diagrams are converted to PNG via `cairosvg` and embedded inline. The
pattern:

```python
import io, cairosvg
from docx.shared import Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

def embed_svg(doc, svg_path, alt_text):
    png_data = cairosvg.svg2png(url=svg_path, output_width=1400)
    png_stream = io.BytesIO(png_data)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(png_stream, width=Inches(5.5))

    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = cap.add_run(alt_text)
    run.font.size = Pt(9)
    run.font.italic = True
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)
```

Key rules:
- **Width:** 5.5 inches (fits within standard margins with room to breathe).
- **Render width:** 1400px for crisp output at print resolution.
- **Caption:** centered, italic, grey — matches the deck's `addCaption` style.
- **Format:** always convert SVG→PNG; DOCX does not support inline SVG.

## Inline formatting

Parse markdown inline formatting into separate `python-docx` runs:

| Markdown         | Run formatting                           |
|------------------|------------------------------------------|
| `**bold**`       | `run.bold = True`                        |
| `*italic*`       | `run.italic = True`                      |
| `` `code` ``     | `font.name = 'Red Hat Mono'`, `font.size = Pt(10)`, `font.color.rgb = RGBColor(0xCC, 0x00, 0x00)` |
| `[text](url)`    | `font.color.rgb = RGBColor(0x00, 0x66, 0xCC)`, `run.underline = True` |

## Code blocks

Render code blocks with a light grey background shading:

```python
from docx.oxml.ns import qn

p = doc.add_paragraph()
run = p.add_run(code_text)
run.font.name = 'Red Hat Mono'
run.font.size = Pt(9)
run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

pPr = p._p.get_or_add_pPr()
shd = pPr.makeelement(qn('w:shd'), {
    qn('w:fill'): 'F5F5F5',
    qn('w:val'): 'clear'
})
pPr.append(shd)
```

## Tables

Use the `Light Grid Accent 1` style for tables. Cell text uses 9pt body font.

## Markdown-to-DOCX conversion

The standard conversion handles these elements:
- Headings (`#` through `####`) → DOCX headings with Red Hat Display
- Paragraphs → Normal style with Red Hat Text
- Bullet lists (`-` / `*`) → List Bullet style
- Numbered lists (`1.`) → List Number style
- Checklist items (`- [ ]` / `- [x]`) → List Bullet style
- Tables (pipe-delimited) → DOCX tables with Light Grid Accent 1
- Code blocks (triple-backtick) → Red Hat Mono on grey background
- Images (`![alt](path)`) → embedded PNG (SVG converted automatically)
- Horizontal rules (`---`) → skipped (section breaks handled by headings)
- Italic caption lines (`*text*` on a line by itself) → centered italic caption

## QA checklist

- [ ] File opens in Word / LibreOffice without errors
- [ ] All headings use Red Hat Display
- [ ] Body text uses Red Hat Text
- [ ] Code blocks use Red Hat Mono on grey background
- [ ] Diagrams are embedded (check file size — should be >100KB with images)
- [ ] Diagram captions are centered and italic
- [ ] Tables render with visible grid lines
- [ ] Bold, italic, and code formatting renders correctly inline
