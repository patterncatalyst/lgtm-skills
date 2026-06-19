# Theming & component reference

All visual styling lives in `assets/site-template/assets/css/site.css`, driven by
`:root` tokens. **Change tokens, not rules.**

## Recolor (the one thing most people want)

The entire accent — buttons, links, the numbered chapter marker, chips, card
hovers, callout tint — comes from four tokens in the `:root` block:

```css
--accent:       #e8870c;   /* primary accent (links, buttons, the big number) */
--accent-hover: #b8650a;   /* ~15–20% darker, for hovers/active */
--accent-soft:  #fff3e0;   /* very light wash (chip/accent backgrounds) */
--bg-callout:   #fff8ef;   /* warm note/callout background */
```

Ready palettes:

| Vibe            | --accent  | --accent-hover | --accent-soft | --bg-callout |
|-----------------|-----------|----------------|---------------|--------------|
| Amber (default) | `#e8870c` | `#b8650a` | `#fff3e0` | `#fff8ef` |
| Indigo          | `#4f46e5` | `#3730a3` | `#eef2ff` | `#f5f7ff` |
| Teal            | `#0d9488` | `#0b7269` | `#e6fffb` | `#f0fdfa` |
| Crimson         | `#dc2626` | `#b01b1b` | `#fef2f2` | `#fff5f5` |
| Forest          | `#15803d` | `#106233` | `#ecfdf3` | `#f3fdf6` |

If you recolor the accent, also update the diagram engine's `accent`/`user`
style colors in `scripts/generate_diagram.py` so diagrams match (see
`diagram-engine.md`).

## Other tokens

- **Surfaces:** `--bg`, `--bg-soft`, `--bg-card`, `--bg-code` (dark code blocks),
  `--footer-bg`, `--border`, `--border-strong`.
- **Ink:** `--ink`, `--ink-muted`, `--ink-faint`, `--ink-on-dark`.
- **Type:** `--font-display`, `--font-body`, `--font-mono`. To swap fonts, change
  these *and* the Google Fonts `<link>` in `_layouts/default.html`.
- **Spacing:** `--space-1`…`--space-9`. **Radii/shadow:** `--radius-*`,
  `--shadow-*`. **Widths:** `--max-w` (page), `--max-w-prose` (reading column).

## Preserve these table rules (hard-won)

`site.css` already handles wide tables. Do **not** undo them:

- `table { table-layout: fixed; }` — columns share width; content wraps within its
  share so no single column balloons and squeezes its neighbours.
- `table :is(th, td) code { white-space: normal; overflow-wrap: anywhere; }` —
  placed *after* the global `:not(pre) > code { white-space: nowrap }` and with a
  leading `table` for higher specificity, so long inline code in a cell wraps.

Two anti-patterns that look like fixes but break layout: `white-space: nowrap` on
cell code (forces the table wider than the page → no column wraps), and
`overflow-wrap: anywhere` on `th, td` themselves (shrinks every column's
min-content to one character → columns collapse to one glyph per line).

## Component / class vocabulary

Compose pages from these (already styled):

- **Chrome:** `.site-header`/`__inner`, `.brand`/`__mark`, `.site-nav`;
  `.site-footer` with `.footer-grid`/`.footer-col`/`.footer-meta`.
- **Hero:** `.hero` › `.hero__eyebrow`, `__title`, `__lead`, `__cta` with
  `.btn.btn--primary`/`--secondary`. **Stats:** `.stats` › `.stat` ›
  `.stat__value`+`.stat__label`.
- **Cards:** `.cards` › `.card` › `.card__eyebrow`, `__title`, `__desc`, `__meta`
  (homepage Parts and each part page's Chapters).
- **Sections:** `.section`, `.section-tight`, `.section-heading`, `.section-sub`,
  `.container`, `.container-prose`.
- **Chapter (tutorial layout):** `.tutorial`/`__inner`, `.breadcrumb`
  (+`__sep`/`__current`), `.tutorial__header` with the big `.tutorial__num`,
  `.tutorial__chips` › `.chip`/`.chip--accent`, `.tutorial__body`, and `.pager`
  (`.pager__link--prev|--next`, `.pager__dir`, `.pager__title`).
- **Callouts:** `.callout` (+`.callout__title`) variants `--safe`/`--warn`/
  `--danger`, authored as raw HTML in markdown.
- **Diagram embed:** `.excalidraw-embed` (+`__caption`/`__links`), from the
  `excalidraw.html` include.
- **Code:** fenced blocks render dark with rouge classes already themed.
