# Deck builder reference (`deck.js` + `deck-helpers.js`)

## Structure of `deck.js`

```js
const { brand, newDeck, contentSlide, addCover, addNotes, writeDeck, ... } = require("./deck-helpers.js");

const REV = "r01.0";
const OUT = `./my-talk-${REV}.pptx`;

brand({ footer: "Talk title  ·  DevNexus 2027", logo: null,
        speaker: { name: "...", role: "...", handle: "..." },
        event: { name: "DevNexus 2027", date: "Atlanta, April 2027" },
        url: "github.com/org/talk" });

const pres = newDeck({ title: "Talk title" });

{ const s = addCover(pres, { eyebrow: "...", title: "...", rev: REV }); addNotes(s, "..."); }
{ const s = contentSlide(pres, "Title", "Tag"); addBullets(s, [...]); addNotes(s, "..."); }

writeDeck(pres, OUT).catch((e) => { console.error(e.message); process.exit(1); });
```

`deck-helpers.js` keeps a registry of every slide it creates; the page number comes
from it and `writeDeck` uses it to refuse a deck with a slide that has no notes. Create
every slide through a helper (`contentSlide`, `addCover`, `addSectionDivider`,
`addDemoDivider`, `addClosing`), never `pres.addSlide()` directly.

Paths come from the environment, defaults shown: `DECK_ASSETS` (`./assets`),
`DECK_PNG` (`./png`).

## Slide constructors (take `pres`, return the slide)

- **`addCover(pres, {eyebrow, title, techLine, credits, url, rev, titleSize})`**:
  `title` may contain `\n`. Speaker and event come from the brand slots.
- **`contentSlide(pres, title, tag, {light, titleSize})`**: title band, tag box,
  footer band, page number. `tag` is a short section label ("Section 03", "Overview");
  omit it to widen the title. `light: true` for the light body.
- **`addSectionDivider(pres, code, title, subtitle, {color})`**.
- **`addDemoDivider(pres, code, title, bullets, command, {color, seeLabel})`**.
- **`addClosing(pres, {title, resources:[{title, detail, color}], links:[...], question, footnote, thanks})`**:
  list every book used in the talk in `resources` or `links`.

## Body helpers (take the slide)

Colours flip automatically between the dark and light body.

- **`addBullets(s, items, {x, y, w, h, fontSize})`**: items are strings or
  `{text, sub, muted, options}`. Default region y 0.95, 9.2 × 4.3, 15 pt, shrinks to fit.
- **`addHeading(s, text, {x, y, w, color})`** and **`addLead(s, text)`** (italic line
  under the band).
- **`addTwoCol(s, {heading, items, color}, {heading, items, color}, {fontSize})`**.
- **`addStatCards(s, [{value, label, color}], {y, h, valueSize})`**: 2 to 4 cards.
- **`addAccentRows(s, [{label, text, color}], {y, rowH, labelW})`**: failure
  patterns, ROI lines, definitions.
- **`addAgendaGrid(s, items)`**: two columns of numbered tiles; `{num: "Bonus"}`
  for a labelled tile. Use on a light slide.
- **`addTakeaways(s, [text])`**: numbered circles on white cards; light slide; up to 7.
- **`addTable(s, header, rows, {colW, rowH, monoCols, fontSize, y})`**: `colW` sums
  to 9.3; `monoCols` lists columns set in the code face (flags, commands).
- **`addCodeBlock(s, lines, {x, y, w, h, fontSize, border})`**: `#` and `//` lines
  in the comment colour. The size shrinks to fit the box by line count and longest
  line; below 8 pt it prints `WARN slide N`, which means split the slide.
- **`addCallout(s, text, {y, h, color})`**: reference or quote box, mint text.
- **`addTip(s, text, {y, color})`**: amber one-liner at the bottom.
- **`addComparison(s, {title, items, color}, {title, items, color})`**: before and
  after panels with "VS"; height follows the longer list.
- **`addDiagram(s, pngNameOrPath, {x, y, w, h, caption, panel})`**: reads the PNG
  header and fits the frame to the image's own aspect, centred in the box, on a
  white panel (`panel: false` to drop it). pptxgenjs `contain` sizing alone stretches
  the picture to the box, so never pass the box size straight to `addImage`.
- **`addCaption(s, text, y)`**: italic muted line, default y 5.08.
- **`addChart(s, "bar"|"line"|"pie"|"doughnut", series, {format, colors, barDir, title, extra})`**:
  native chart, themed; `series` is pptxgenjs `[{name, labels, values}]`. Prefer a
  chart over stat cards when the audience needs the shape, not one number.
- **`addSpeaker(s, {photo, bio})`**: photo optional (round crop with an accent ring).
- **`addTakeAway(s, [{img, title, caption, url}])`**: QR or cover cards on a light
  slide. Generate QR PNGs with a maintained open-source library (for example the
  `qrcode` npm package, installed locally) and keep them in `assets/`.

## Layout tips

- Keep one idea per slide. A stat slide is cards plus at most five accent rows.
- Code beside bullets: bullets at x 0.4, w 4.45; code at x 5.15, w 4.45.
- A table with five or more columns needs `fontSize` 9 to 10 and a tuned `colW`.
- Long titles shrink to fit the band; prefer a shorter title over a two-line band.
- Numbers on slides come from measured runs; the method goes in the notes.

## Versioning

`<talk>-rNN.x.pptx`. A new section bumps the major (`r02.0`); a review fix bumps
`.x` (`r01.1`). `REV` drives both the file name and the cover marker. Retire the
superseded file once the new one ships.

## QA

See the QA workflow in `SKILL.md`: build, convert with LibreOffice using a private
profile, render with `pdftoppm -png -r 60`, view every page (a `magick montage`
contact sheet first, then single pages where something looks off), count the notes
slides, then run the voice scan.
