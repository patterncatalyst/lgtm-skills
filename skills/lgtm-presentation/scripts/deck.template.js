// deck.template.js — minimal Red Hat-branded deck skeleton.
// Copy to deck.js, then grow it slide-by-slide.
//
// Build:  export NODE_PATH=$(npm root -g) && node deck.js
// Paths:  deck-helpers.js reads DECK_ASSETS (./assets) and DECK_PNG (./png).

"use strict";

const H = require("./deck-helpers.js");
const {
  COLOR, FONT, W, ASSETS,
  newDeck, addFooter, addContentTitle, addBullets, addTwoColBullets,
  addStatusTable, addCaption, addCodeSlide, addDiagramSlide, addSectionDivider, addNotes,
} = H;

// Output filename — bump the major on a new section, .x on a fix.
const OUT = "/mnt/user-data/outputs/my-redhat-deck-r01.0.pptx";
const REV = "r01.0";

const pres = newDeck();
let pageNum = 0;

function S() {                       // new content slide with footer (page no. + logo)
  const s = pres.addSlide(); pageNum += 1; addFooter(s, pageNum); return s;
}
function divider(code, title, subtitle, notes) {   // section divider slide
  const s = pres.addSlide(); pageNum += 1; addSectionDivider(s, code, title, subtitle); addNotes(s, notes);
}

// ---- Cover (custom layout; mirrors the series cover) -------------------------
{
  const s = pres.addSlide();
  pageNum += 1;
  s.background = { color: COLOR.white };
  try { s.addImage({ path: `${ASSETS}/cover-panel.png`, x: 0, y: 0, w: W, h: 7.5 }); } catch (e) {}
  s.addText("YOUR EYEBROW", { x: 6.00, y: 1.98, w: 6.90, h: 0.34,
    fontFace: FONT.title, fontSize: 14, bold: true, color: COLOR.red, charSpacing: 6, align: "left", valign: "middle" });
  s.addText([{ text: "Deck title,", options: { breakLine: true } }, { text: "done right" }], {
    x: 5.95, y: 2.42, w: 6.95, h: 2.00, fontFace: FONT.title, fontSize: 54, bold: true, color: COLOR.ink, align: "left", valign: "top" });
  s.addText("Subtitle goes here.", { x: 6.00, y: 4.65, w: 6.70, h: 0.90,
    fontFace: FONT.body, fontSize: 18, italic: true, color: COLOR.caption, align: "left", valign: "top" });
  s.addText(REV, { x: 11.85, y: 5.85, w: 0.95, h: 0.30, fontFace: FONT.mono, fontSize: 11, color: COLOR.caption, align: "right", valign: "middle" });
  try { s.addImage({ path: `${ASSETS}/logo-candidate-2.png`, x: 11.10, y: 6.80, w: 1.55, h: 0.37 }); } catch (e) {}
  addNotes(s, "Speaker notes are required on every slide, including the cover.");
}

// ---- A content slide with bullets --------------------------------------------
{
  const s = S();
  addContentTitle(s, "SECTION · TOPIC", "A clear, specific slide title");
  addBullets(s, [
    "Each bullet is a full, self-contained point — not a fragment.",
    "Cross-reference concepts by name (\u201cthe caching section\u201d), never by slide number.",
  ], { fontSize: 17 });
  addCaption(s, "An optional caption sits at the bottom of the slide.");
  addNotes(s, "Thick speaker notes go here — they are the script and the source text for any companion examples.");
}

// ---- A 3-column reference table (tune colW so column 1 never wraps) ----------
{
  const s = S();
  addContentTitle(s, "SECTION · REFERENCE", "A reference table");
  addStatusTable(s, [
    { code: "200", name: "OK",       purpose: "Succeeded; body carries the representation." },
    { code: "201", name: "Created",  purpose: "A resource was created; set Location to point at it." },
  ], { colW: [1.10, 2.40, 8.59] });   // widen col 1 for long labels, e.g. [2.80, 3.60, 5.69]
  addNotes(s, "Use addStatusTable for any code|name|purpose reference. Pass opts.colW for non-status first columns.");
}

// ---- A dark code slide (keep caption to ONE line; fontSize 10 if dense) -------
{
  const s = S();
  addCodeSlide(s, "SECTION · CODE", "A code example", "python · FastAPI",
    [
      "# Comments starting with # or // render green.",
      "@app.get('/orders/{id}')",
      "async def get_order(id: str):",
      "    return await repo.get(id)",
    ],
    "One-line caption sits cleanly below the dark box.");
  addNotes(s, "Explain the code in the notes; the slide shows it, the notes teach it.");
}

// ---- A section divider -------------------------------------------------------
divider("01", "Next Section", "An optional italic subtitle.",
  "Divider speaker notes: set up what this section covers.");

// ---- Closing -----------------------------------------------------------------
{
  const s = S();
  addContentTitle(s, "CLOSING", "Wrap it up");
  addBullets(s, ["Recap the arc.", "Point to where to go deeper."], { fontSize: 17 });
  addNotes(s, "Closing notes.");
}

pres.writeFile({ fileName: OUT })
  .then(p => console.log("WROTE", p))
  .catch(e => { console.error(e); process.exit(1); });
