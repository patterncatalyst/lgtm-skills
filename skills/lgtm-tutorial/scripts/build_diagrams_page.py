#!/usr/bin/env python3
"""Build a self-contained diagrams.html gallery for a book/tutorial site by
harvesting the inline `{% include excalidraw.html ... %}` figures already
embedded in the chapters.

Usage: build_diagrams_page.py <repo_dir> [--title "Modernizing ..."]

The gallery reuses the site's existing `.excalidraw-embed` styling (rendered by
_includes/excalidraw.html) inside a responsive grid with its own scoped CSS, so
it looks native in every repo without depending on per-repo gallery CSS or JS.
"""
import argparse
import re
import sys
from pathlib import Path

INCLUDE_RE = re.compile(r"\{%-?\s*include\s+excalidraw\.html\b(.*?)%\}", re.S)
# Capture the full attribute value, tolerating backslash-escaped quotes (\") inside it.
ATTR_RE = re.compile(r'(\w+)\s*=\s*"((?:\\.|[^"\\])*)"', re.S)


def _attr_safe(s: str) -> str:
    """Make a harvested alt/caption safe to re-emit inside a double-quoted Liquid
    include attribute: Liquid does not honor backslash escapes, so any embedded
    double-quote (escaped or not) would prematurely close the attribute. Unescape
    \\" to " and then render every double-quote as a single quote."""
    return s.replace('\\"', '"').replace("\\'", "'").replace('"', "'")
# Markdown-image fallback: ![alt](... /assets/diagrams/NAME.svg ...)
IMG_RE = re.compile(
    r"!\[([^\]]*)\]\([^)]*?/assets/diagrams/([A-Za-z0-9._-]+)\.svg[^)]*\)"
)


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def _tokens(text: str):
    """Yield (file, alt, caption) references in document order, both the
    excalidraw.html include form and the markdown-image form."""
    events = []
    for m in INCLUDE_RE.finditer(text):
        attrs = dict(ATTR_RE.findall(m.group(1)))
        f = attrs.get("file")
        if f:
            events.append((m.start(), f, _norm(attrs.get("alt", "")),
                           _norm(attrs.get("caption", ""))))
    for m in IMG_RE.finditer(text):
        events.append((m.start(), m.group(2), _norm(m.group(1)), ""))
    events.sort(key=lambda e: e[0])
    for _, f, alt, caption in events:
        yield f, alt, caption


def harvest(docs_dir: Path):
    figures = []
    seen = set()
    for md in sorted(docs_dir.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        for f, alt, caption in _tokens(text):
            if f in seen:
                continue
            seen.add(f)
            figures.append({"file": f, "alt": alt, "caption": caption})
    return figures


PAGE_HEAD = """---
layout: default
title: Diagrams
description: "Every figure from the book on one page, with its editable Excalidraw source."
permalink: /diagrams/
---

<style>
  .diagram-gallery {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(28rem, 1fr));
    gap: 2rem;
    margin-top: 2rem;
  }}
  .diagram-gallery .excalidraw-embed {{ margin: 0; }}
  @media (max-width: 40rem) {{
    .diagram-gallery {{ grid-template-columns: 1fr; }}
  }}
</style>

<section class="section">
  <div class="container">
    <span class="hero__eyebrow">Diagrams</span>
    <h1>Every figure, on one page.</h1>
    <p class="hero__lead">
      The {count} diagrams from {title}, in reading order. Each one renders
      inline here and ships a paired <code>.excalidraw</code> source you can
      open on excalidraw.com and edit.
    </p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="diagram-gallery">
"""

PAGE_FOOT = """    </div>
  </div>
</section>
"""


def render(figures, title):
    parts = [PAGE_HEAD.format(count=len(figures), title=title)]
    for fig in figures:
        alt = _attr_safe(fig["alt"])
        caption = _attr_safe(fig["caption"])
        parts.append(
            '      {%- include excalidraw.html '
            f'file="{fig["file"]}" '
            f'alt="{alt}" '
            f'caption="{caption}" '
            "-%}\n"
        )
    parts.append(PAGE_FOOT)
    return "".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("repo")
    ap.add_argument("--title", default="this book")
    ap.add_argument("--docs", default="_docs")
    args = ap.parse_args()
    repo = Path(args.repo)
    docs_dir = repo / args.docs
    if not docs_dir.is_dir():
        sys.exit(f"no docs dir: {docs_dir}")
    figures = harvest(docs_dir)
    if not figures:
        sys.exit(f"no excalidraw includes found under {docs_dir}")
    out = repo / "diagrams.html"
    out.write_text(render(figures, args.title), encoding="utf-8")
    print(f"wrote {out} with {len(figures)} figures")


if __name__ == "__main__":
    main()
