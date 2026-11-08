// deck-helpers.js: the conference theme, a dark navy and teal look for talks
// that are not Red Hat presentations (DevNexus and other conferences).
//
// Generalised from the "Taming the JVM" Quarkus optimization deck:
//   - 10 x 5.625 in canvas (LAYOUT_16x9)
//   - navy body 0A1628, darker title band 08111F, cards 122040
//   - teal 00BCD4 titles and cover bars, blue 1E6FC8 tag box and footer band
//   - accent sequence blue, teal, amber, red, green, purple
//   - one open font family (Carlito) for titles and body, an open mono for code
//
// Branding is a parameter, never baked in: call brand({...}) once at the top of
// deck.js. With no brand call the deck carries no logo and no company marks.

"use strict";

const PptxGenJS = require("pptxgenjs");
const fs = require("fs");

const PNG = process.env.DECK_PNG || "./png";
const ASSETS = process.env.DECK_ASSETS || "./assets";

// Canvas (LAYOUT_16x9). Every coordinate below is in inches on this canvas.
const W = 10;
const H = 5.625;

const COLOR = {
  // surfaces
  bg:        "0A1628",   // dark body
  band:      "08111F",   // title band, cover footer strip, divider body
  card:      "122040",   // stat cards, table rows, accent rows
  cardLine:  "1E3A5F",   // card and grid strokes on dark
  codeBg:    "0D2137",
  lightBg:   "EBF0F7",   // light body variant
  lightCard: "FFFFFF",
  lightLine: "E0E8F0",
  // text
  text:      "ECF0F1",   // body text on dark
  muted:     "90A4AE",   // captions, sublabels
  ink:       "1A2B3C",   // body text on light
  inkMuted:  "546E7A",
  codeFg:    "A8D8EA",
  codeComment: "6E8CA0",
  mint:      "00E5C3",   // reference callout text
  white:     "FFFFFF",
  // accents
  teal:      "00BCD4",
  blue:      "1E6FC8",
  amber:     "F5A623",
  red:       "E84855",
  green:     "27AE60",
  purple:    "7C3AED",
};

// The rotating accent sequence used by numbered cards, agenda tiles, charts.
const SEQ = [COLOR.blue, COLOR.teal, COLOR.amber, COLOR.red, COLOR.green, COLOR.purple];

// Open fonts only. Carlito (SIL OFL, Fedora package google-carlito-fonts) is
// metric-compatible with the face the source deck was drafted in, so line
// breaks match. Source Code Pro (SIL OFL, adobe-source-code-pro-fonts) for code.
const FONT = {
  title: "Carlito",
  body:  "Carlito",
  mono:  "Source Code Pro",
};

// ----- brand slots ------------------------------------------------------------
// accent:      title and cover accent (default teal)
// band:        tag box and footer band colour (default blue)
// footer:      footer band text, e.g. "Talk title · DevNexus 2027"
// logo:        path to a PNG shown at the right of the footer band (null = none)
// logoAspect:  width / height of that logo (the helper sizes it to the band)
// event:       { name, date, logo } shown on the cover and closing slides
// speaker:     { name, role, handle, url } shown on the cover and about slide
// url:         repo or site URL shown on the cover strip and closing slide
const BRAND = {
  accent: COLOR.teal,
  band: COLOR.blue,
  footer: "",
  logo: null,
  logoAspect: 3,
  event: { name: "", date: "", logo: null },
  speaker: { name: "", role: "", handle: "", url: "" },
  url: "",
};

function brand(opts = {}) {
  for (const [k, v] of Object.entries(opts)) {
    if (v && typeof v === "object" && !Array.isArray(v) && BRAND[k] && typeof BRAND[k] === "object") {
      BRAND[k] = { ...BRAND[k], ...v };
    } else {
      BRAND[k] = v;
    }
  }
  return BRAND;
}

// ----- deck and slide registry ------------------------------------------------
let PRES = null;
const SLIDES = [];

function newDeck(meta = {}) {
  PRES = new PptxGenJS();
  PRES.layout = "LAYOUT_16x9";
  PRES.title = meta.title || "";
  PRES.author = meta.author || BRAND.speaker.name || "";
  PRES.company = meta.company || "";
  PRES.subject = meta.subject || "";
  return PRES;
}

function exists(p) { try { return !!p && fs.existsSync(p); } catch (e) { return false; } }

function register(slide, kind) {
  SLIDES.push({ slide, kind, notes: false });
  slide._confIndex = SLIDES.length;
  return slide;
}

// Footer band: brand-coloured strip, footer text centred, page number and an
// optional logo on the right, both inside the band so nothing overlaps it.
function addFooter(slide, num, opts = {}) {
  const y = 5.42, h = 0.205;
  slide.addShape("rect", { x: 0, y, w: W, h, fill: { color: BRAND.band }, line: { type: "none" } });
  if (BRAND.footer) {
    slide.addText(BRAND.footer, { x: 1.2, y, w: 7.6, h, margin: 0,
      fontFace: FONT.body, fontSize: 9, color: COLOR.text, align: "center", valign: "middle" });
  }
  let right = 9.8;
  if (num != null && !opts.noNumber) {
    slide.addText(String(num), { x: right - 0.5, y, w: 0.5, h, margin: 0,
      fontFace: FONT.body, fontSize: 9, bold: true, color: COLOR.text, align: "right", valign: "middle" });
    right -= 0.6;
  }
  if (exists(BRAND.logo)) {
    const lh = 0.15, lw = lh * (BRAND.logoAspect || 3);
    slide.addImage({ path: BRAND.logo, x: right - lw, y: y + (h - lh) / 2, w: lw, h: lh });
  }
}

// A content slide: title band, tag box, footer band, page number.
//   light: true switches the body to the light variant (text-heavy, diagrams)
function contentSlide(pres, title, tag, opts = {}) {
  const s = register(pres.addSlide(), "content");
  s.background = { color: opts.light ? COLOR.lightBg : COLOR.bg };
  s._light = !!opts.light;
  s.addShape("rect", { x: 0, y: 0, w: W, h: 0.7, fill: { color: COLOR.band }, line: { type: "none" } });
  s.addText(title, { x: 0.4, y: 0, w: tag ? 7.5 : 9.2, h: 0.7, margin: 0,
    fontFace: FONT.title, fontSize: opts.titleSize ?? 20, bold: true, color: BRAND.accent,
    align: "left", valign: "middle", fit: "shrink" });
  if (tag) {
    s.addText(tag, { x: 8.0, y: 0.08, w: 1.8, h: 0.55, margin: [0, 8, 4, 0],
      fill: { color: BRAND.band }, fontFace: FONT.body, fontSize: 10, color: COLOR.text,
      align: "right", valign: "bottom" });
  }
  addFooter(s, SLIDES.length);
  return s;
}

// Colours that flip with the light/dark body.
function tone(slide) {
  return slide._light
    ? { text: COLOR.ink, muted: COLOR.inkMuted, card: COLOR.lightCard, line: COLOR.lightLine, head: COLOR.blue }
    : { text: COLOR.text, muted: COLOR.muted, card: COLOR.card, line: COLOR.cardLine, head: BRAND.accent };
}

const SHADOW = () => ({ type: "outer", color: "000000", blur: 3, offset: 1.5, angle: 45, opacity: 0.30 });

// ----- cover ------------------------------------------------------------------
// Dark cover: teal left bar and top rule, two outline circles, eyebrow, title,
// tech line, amber rule, credits line, speaker and event block, URL strip.
function addCover(pres, o = {}) {
  const s = register(pres.addSlide(), "cover");
  s.background = { color: COLOR.bg };
  s.addShape("rect", { x: 0, y: 0, w: 0.25, h: H, fill: { color: BRAND.accent }, line: { type: "none" } });
  s.addShape("rect", { x: 0, y: 0, w: W, h: 0.12, fill: { color: BRAND.accent }, line: { type: "none" } });
  s.addShape("ellipse", { x: 7.5, y: 3.2, w: 3.5, h: 3.5, fill: { color: COLOR.bg, transparency: 100 },
    line: { color: BRAND.band, width: 1.5 } });
  s.addShape("ellipse", { x: 8.2, y: 0.4, w: 2.2, h: 2.2, fill: { color: COLOR.bg, transparency: 100 },
    line: { color: BRAND.accent, width: 1.5 } });
  if (o.eyebrow) s.addText(o.eyebrow.toUpperCase(), { x: 0.5, y: 0.6, w: 7.5, h: 0.45, margin: 0,
    fontFace: FONT.title, fontSize: 14, bold: true, color: BRAND.accent, charSpacing: 1, valign: "middle" });
  s.addText(o.title || "", { x: 0.5, y: 1.1, w: 7.6, h: 1.75, margin: 0,
    fontFace: FONT.title, fontSize: o.titleSize ?? 38, bold: true, color: COLOR.text, valign: "middle", fit: "shrink" });
  if (o.techLine) s.addText(o.techLine, { x: 0.5, y: 2.9, w: 7.4, h: 0.4, margin: 0,
    fontFace: FONT.body, fontSize: 13, color: COLOR.muted, valign: "top" });
  s.addShape("rect", { x: 0.5, y: 3.42, w: 4.5, h: 0.03, fill: { color: COLOR.amber }, line: { type: "none" } });
  if (o.credits) s.addText(o.credits, { x: 0.5, y: 3.52, w: 7.4, h: 0.32, margin: 0,
    fontFace: FONT.body, fontSize: 12, italic: true, color: COLOR.amber, valign: "middle" });
  const sp = BRAND.speaker, ev = BRAND.event;
  const who = [sp.name, sp.role].filter(Boolean).join("  ·  ");
  const where = [ev.name, ev.date].filter(Boolean).join("  ·  ");
  const runs = [];
  if (who) runs.push({ text: who, options: { bold: true, color: COLOR.text, breakLine: true } });
  if (sp.handle) runs.push({ text: sp.handle, options: { color: COLOR.muted, breakLine: true } });
  if (where) runs.push({ text: where, options: { color: COLOR.muted } });
  if (runs.length) s.addText(runs, { x: 0.5, y: 3.95, w: 6.5, h: 0.95, margin: 0,
    fontFace: FONT.body, fontSize: 12, valign: "top", lineSpacingMultiple: 1.1 });
  if (exists(ev.logo)) s.addImage({ path: ev.logo, x: 7.9, y: 4.25, w: 1.6, h: 0.53, sizing: { type: "contain", w: 1.6, h: 0.53 } });
  s.addShape("rect", { x: 0, y: 5.3, w: W, h: 0.325, fill: { color: COLOR.band }, line: { type: "none" } });
  const strip = o.url ?? BRAND.url;
  if (strip) s.addText(strip, { x: 0.4, y: 5.3, w: 9.2, h: 0.325, margin: 0,
    fontFace: FONT.body, fontSize: 10, color: COLOR.muted, align: "center", valign: "middle" });
  if (o.rev) s.addText(o.rev, { x: 8.6, y: 5.3, w: 1.2, h: 0.325, margin: 0,
    fontFace: FONT.mono, fontSize: 9, color: COLOR.muted, align: "right", valign: "middle" });
  return s;
}

// ----- dividers ---------------------------------------------------------------
// Section divider: dark, coloured left bar, eyebrow code, large title, subtitle.
function addSectionDivider(pres, code, title, subtitle, o = {}) {
  const s = register(pres.addSlide(), "divider");
  const c = o.color || BRAND.accent;
  s.background = { color: COLOR.band };
  s.addShape("rect", { x: 0, y: 0, w: 0.25, h: H, fill: { color: c }, line: { type: "none" } });
  s.addShape("ellipse", { x: 7.3, y: 2.6, w: 3.6, h: 3.6, fill: { color: COLOR.band, transparency: 100 },
    line: { color: COLOR.cardLine, width: 1.25 } });
  if (code) s.addText(code, { x: 0.6, y: 1.35, w: 8, h: 0.5, margin: 0,
    fontFace: FONT.title, fontSize: 14, bold: true, color: c, charSpacing: 2, valign: "middle" });
  s.addText(title, { x: 0.6, y: 1.9, w: 7.6, h: 1.6, margin: 0,
    fontFace: FONT.title, fontSize: 40, bold: true, color: COLOR.text, valign: "top", fit: "shrink" });
  if (subtitle) s.addText(subtitle, { x: 0.6, y: 3.6, w: 7.4, h: 0.6, margin: 0,
    fontFace: FONT.body, fontSize: 15, italic: true, color: COLOR.muted, valign: "top" });
  addFooter(s, SLIDES.length);
  return s;
}

// Demo divider: red bar, "DEMO 01" eyebrow, title, "What you'll see" bullets,
// and an optional command chip on the right.
function addDemoDivider(pres, code, title, bullets = [], command, o = {}) {
  const s = register(pres.addSlide(), "demo");
  const c = o.color || COLOR.red;
  s.background = { color: COLOR.band };
  s.addShape("rect", { x: 0, y: 0, w: 0.25, h: H, fill: { color: c }, line: { type: "none" } });
  s.addText(code, { x: 0.5, y: 0.45, w: 9, h: 0.45, margin: 0,
    fontFace: FONT.title, fontSize: 14, bold: true, color: c, valign: "middle" });
  s.addText(title, { x: 0.5, y: 0.95, w: 6.0, h: 1.6, margin: 0,
    fontFace: FONT.title, fontSize: 38, bold: true, color: COLOR.text, valign: "middle", fit: "shrink" });
  if (bullets.length) {
    s.addText(o.seeLabel || "What you'll see:", { x: 0.5, y: 2.75, w: 6, h: 0.32, margin: 0,
      fontFace: FONT.title, fontSize: 14, bold: true, color: c, valign: "middle" });
    addBullets(s, bullets, { x: 0.5, y: 3.15, w: 5.8, h: 2.15, fontSize: 13 });
  }
  if (command) s.addText(command, { x: 6.5, y: 3.3, w: 3.2, h: 0.8, margin: 6,
    fill: { color: COLOR.card }, fontFace: FONT.mono, fontSize: 12, color: c, align: "center", valign: "middle" });
  addFooter(s, SLIDES.length);
  return s;
}

// ----- body helpers -----------------------------------------------------------
// Round bullets. Items: string | {text, sub:true} | {text, options}.
function addBullets(slide, items, o = {}) {
  const t = tone(slide);
  const runs = items.map((it) => {
    const obj = typeof it === "string" ? { text: it } : it;
    return { text: obj.text, options: {
      bullet: obj.sub ? { code: "25E6", indent: 14 } : { code: "25CF", indent: 14 },
      indentLevel: obj.sub ? 1 : 0, breakLine: true, paraSpaceAfter: 5,
      color: obj.muted ? t.muted : t.text, italic: !!obj.muted, ...(obj.options || {}) } };
  });
  slide.addText(runs, { x: o.x ?? 0.4, y: o.y ?? 0.95, w: o.w ?? 9.2, h: o.h ?? 4.3,
    fontFace: FONT.body, fontSize: o.fontSize ?? 15, color: t.text, valign: "top", margin: 2,
    lineSpacingMultiple: 1.05, fit: "shrink" });
}

// Sub-heading in the accent blue (light) or brand accent (dark).
function addHeading(slide, text, o = {}) {
  const t = tone(slide);
  slide.addText(text, { x: o.x ?? 0.4, y: o.y ?? 0.85, w: o.w ?? 9.2, h: o.h ?? 0.4, margin: 0,
    fontFace: FONT.title, fontSize: o.fontSize ?? 16, bold: true, color: o.color || t.head, valign: "middle" });
}

// Italic lead line under the title band.
function addLead(slide, text, o = {}) {
  const t = tone(slide);
  slide.addText(text, { x: o.x ?? 0.4, y: o.y ?? 0.8, w: o.w ?? 9.2, h: o.h ?? 0.35, margin: 0,
    fontFace: FONT.body, fontSize: o.fontSize ?? 13, italic: true, color: t.muted, valign: "middle" });
}

// Two columns, each with an optional heading.
function addTwoCol(slide, left, right, o = {}) {
  const y = o.y ?? 0.85, h = o.h ?? 4.4;
  [[left, 0.4], [right, 5.15]].forEach(([col, x]) => {
    let top = y;
    if (col.heading) { addHeading(slide, col.heading, { x, y: top, w: 4.45, color: col.color }); top += 0.5; }
    addBullets(slide, col.items || [], { x, y: top, w: 4.45, h: h - (top - y), fontSize: o.fontSize ?? 13 });
  });
}

// Big-number stat cards. stats: [{value, label, color}], 2 to 4 cards.
function addStatCards(slide, stats, o = {}) {
  const t = tone(slide);
  const y = o.y ?? 0.85, h = o.h ?? 1.3, gap = 0.17;
  const n = stats.length, w = (9.3 - gap * (n - 1)) / n;
  stats.forEach((st, i) => {
    const x = 0.35 + i * (w + gap);
    const c = st.color || SEQ[(i + 3) % SEQ.length];
    slide.addShape("rect", { x, y, w, h, fill: { color: slide._light ? COLOR.lightCard : COLOR.card },
      line: { color: t.line, width: 0.5 }, shadow: SHADOW() });
    slide.addText(st.value, { x, y: y + 0.08, w, h: h * 0.55, margin: 0,
      fontFace: FONT.title, fontSize: o.valueSize ?? 36, bold: true, color: c, align: "center", valign: "middle", fit: "shrink" });
    slide.addText(st.label, { x: x + 0.1, y: y + h * 0.6, w: w - 0.2, h: h * 0.38, margin: 0,
      fontFace: FONT.body, fontSize: 11, color: t.muted, align: "center", valign: "top" });
  });
}

// Rows with a coloured left bar: [{label, text, color}].
function addAccentRows(slide, rows, o = {}) {
  const t = tone(slide);
  const y0 = o.y ?? 2.8, rh = o.rowH ?? 0.44, gap = o.gap ?? 0.06, lw = o.labelW ?? 2.5;
  rows.forEach((r, i) => {
    const y = y0 + i * (rh + gap), c = r.color || COLOR.red;
    slide.addShape("rect", { x: 0.35, y, w: 9.3, h: rh, fill: { color: t.card }, line: { type: "none" } });
    slide.addShape("rect", { x: 0.35, y, w: 0.06, h: rh, fill: { color: c }, line: { type: "none" } });
    slide.addText(r.label, { x: 0.52, y, w: lw - 0.1, h: rh, margin: 0,
      fontFace: FONT.body, fontSize: 11, bold: true, color: c, valign: "middle" });
    slide.addText(r.text, { x: 0.35 + lw + 0.2, y, w: 9.3 - lw - 0.3, h: rh, margin: 0,
      fontFace: FONT.body, fontSize: 10.5, color: t.text, valign: "middle", fit: "shrink" });
  });
}

// Agenda tiles: two columns of white cards with a coloured number block.
// items: [{num, text, color}] or strings (numbered 01, 02, ...).
function addAgendaGrid(slide, items, o = {}) {
  const rows = Math.ceil(items.length / 2);
  const y0 = o.y ?? 0.95, gapY = 0.12, h = Math.min(0.75, (4.35 - gapY * (rows - 1)) / rows);
  items.forEach((it, i) => {
    const obj = typeof it === "string" ? { text: it } : it;
    const col = i % 2, row = Math.floor(i / 2);
    const x = col === 0 ? 0.35 : 5.15, y = y0 + row * (h + gapY), w = 4.5;
    const c = obj.color || SEQ[i % SEQ.length];
    slide.addShape("rect", { x, y, w, h, fill: { color: COLOR.lightCard }, line: { color: COLOR.lightLine, width: 0.5 }, shadow: SHADOW() });
    slide.addText(obj.num ?? String(i + 1).padStart(2, "0"), { x, y, w: 0.55, h, margin: 0,
      fill: { color: c }, fontFace: FONT.title, fontSize: obj.num && obj.num.length > 3 ? 10 : 15, bold: true,
      color: COLOR.white, align: "center", valign: "middle" });
    slide.addText(obj.text, { x: x + 0.65, y, w: w - 0.75, h, margin: 0,
      fontFace: FONT.body, fontSize: 12, bold: true, color: COLOR.ink, valign: "middle", fit: "shrink" });
  });
}

// Numbered takeaways: white cards, coloured number circles. Use on a light slide.
function addTakeaways(slide, items, o = {}) {
  const y0 = o.y ?? 0.88, gap = 0.08;
  const h = Math.min(0.57, (4.45 - gap * (items.length - 1)) / items.length);
  items.forEach((text, i) => {
    const y = y0 + i * (h + gap), c = SEQ[i % SEQ.length], d = Math.min(0.38, h - 0.12);
    slide.addShape("rect", { x: 0.35, y, w: 9.3, h, fill: { color: COLOR.lightCard }, line: { color: COLOR.lightLine, width: 0.5 }, shadow: SHADOW() });
    slide.addShape("ellipse", { x: 0.45, y: y + (h - d) / 2, w: d, h: d, fill: { color: c }, line: { type: "none" } });
    slide.addText(String(i + 1), { x: 0.45, y: y + (h - d) / 2, w: d, h: d, margin: 0,
      fontFace: FONT.title, fontSize: 13, bold: true, color: COLOR.white, align: "center", valign: "middle" });
    slide.addText(text, { x: 0.95, y, w: 8.6, h, margin: 0,
      fontFace: FONT.body, fontSize: 12, color: COLOR.ink, valign: "middle", fit: "shrink" });
  });
}

// Table: blue header row, card-coloured rows, accent first column.
// header: [..], rows: [[..], ..]. opts.colW sums to 9.3; opts.monoCols marks
// columns rendered in the mono face (flags, commands).
function addTable(slide, header, rows, o = {}) {
  const t = tone(slide);
  const mono = new Set(o.monoCols || []);
  const fs = o.fontSize ?? 10;
  const head = header.map((h) => ({ text: h, options: { bold: true, color: COLOR.white, fill: { color: BRAND.band },
    fontFace: FONT.body, fontSize: fs, align: "center", valign: "middle" } }));
  const body = rows.map((r) => r.map((cell, j) => ({ text: cell, options: {
    fill: { color: t.card }, valign: "middle",
    align: j === 0 ? "center" : (o.align || "left"),
    bold: j === 0, color: j === 0 ? (slide._light ? COLOR.blue : BRAND.accent) : t.text,
    fontFace: mono.has(j) ? FONT.mono : FONT.body, fontSize: mono.has(j) ? fs - 1 : fs } })));
  slide.addTable([head, ...body], { x: o.x ?? 0.35, y: o.y ?? 1.2, w: o.w ?? 9.3,
    colW: o.colW, rowH: o.rowH ?? 0.4, margin: 4,
    border: { type: "solid", color: slide._light ? COLOR.lightBg : COLOR.bg, pt: 2 } });
}

// Code block: dark box with an accent border. Lines starting # or // render
// in the comment colour. The font shrinks to fit the box; a warning names any
// block that would need less than 8 pt, so the slide gets split instead.
function addCodeBlock(slide, lines, o = {}) {
  const x = o.x ?? 0.4, y = o.y ?? 0.95, w = o.w ?? 9.2, h = o.h ?? 4.3;
  slide.addShape("rect", { x, y, w, h, fill: { color: COLOR.codeBg }, line: { color: o.border || BRAND.accent, width: 1.5 } });
  const want = o.fontSize ?? 11;
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const byH = ((h - 0.2) * 72) / (1.18 * lines.length);
  const byW = ((w - 0.3) * 72) / (0.6 * longest);
  const size = Math.max(7, Math.min(want, Math.floor(byH * 2) / 2, Math.floor(byW * 2) / 2));
  if (size < 8) console.warn(`WARN slide ${slide._confIndex}: code block needs ${size}pt; split it`);
  const runs = lines.map((ln) => {
    const tr = ln.trimStart();
    const comment = tr.startsWith("#") || tr.startsWith("//");
    return { text: ln, options: { breakLine: true, color: comment ? COLOR.codeComment : COLOR.codeFg, italic: comment } };
  });
  slide.addText(runs, { x: x + 0.12, y: y + 0.08, w: w - 0.24, h: h - 0.16, margin: 0,
    fontFace: FONT.mono, fontSize: size, valign: "top", lineSpacingMultiple: 1.0, paraSpaceAfter: 0 });
}

// Reference / insight callout: dark box with mint text (sources, quotes).
function addCallout(slide, text, o = {}) {
  const x = o.x ?? 0.4, y = o.y ?? 4.5, w = o.w ?? 9.2, h = o.h ?? 0.75;
  slide.addShape("rect", { x, y, w, h, fill: { color: COLOR.bg }, line: { color: COLOR.cardLine, width: 0.5 }, shadow: SHADOW() });
  slide.addText(text, { x: x + 0.2, y, w: w - 0.3, h, margin: 0,
    fontFace: FONT.body, fontSize: o.fontSize ?? 11, color: o.color || COLOR.mint, valign: "middle", fit: "shrink" });
}

// Tip line in amber at the bottom of a dark slide.
function addTip(slide, text, o = {}) {
  slide.addText(text, { x: 0.4, y: o.y ?? 5.0, w: 9.2, h: 0.36, margin: 0,
    fontFace: FONT.body, fontSize: 11, color: o.color || COLOR.amber, valign: "middle", fit: "shrink" });
}

// Before/after comparison: two bordered panels with a "VS" between them.
// left/right: {title, items, color}
function addComparison(slide, left, right, o = {}) {
  const t = tone(slide);
  const most = Math.max((left.items || []).length, (right.items || []).length);
  const y = o.y ?? 0.95, h = o.h ?? Math.min(4.3, 0.8 + 0.4 * most), w = 4.2;
  [[left, 0.4, COLOR.red], [right, 5.4, COLOR.green]].forEach(([p, x, dc]) => {
    const c = p.color || dc;
    slide.addShape("rect", { x, y, w, h, fill: { color: t.card }, line: { color: c, width: 1.5 } });
    slide.addShape("rect", { x, y, w, h: 0.45, fill: { color: c }, line: { type: "none" } });
    slide.addText(p.title, { x: x + 0.15, y, w: w - 0.3, h: 0.45, margin: 0,
      fontFace: FONT.title, fontSize: 14, bold: true, color: COLOR.white, valign: "middle" });
    addBullets(slide, p.items || [], { x: x + 0.1, y: y + 0.55, w: w - 0.2, h: h - 0.65, fontSize: o.fontSize ?? 12 });
  });
  slide.addText("VS", { x: 4.6, y: y + h / 2 - 0.3, w: 0.8, h: 0.6, margin: 0,
    fontFace: FONT.title, fontSize: 20, bold: true, color: t.muted, align: "center", valign: "middle" });
}

// Diagram: embeds png/<name>.png fitted to the PNG's own aspect inside the box
// and centred there. pptxgenjs "contain" sizing alone stretches the picture to
// the box, so the helper reads the width and height from the PNG IHDR header.
// Light-themed figures sit on a white panel, as in the source deck.
function addDiagram(slide, pngName, o = {}) {
  const x = o.x ?? 0.4, y = o.y ?? 0.85, w = o.w ?? 9.2, h = o.h ?? 4.45;
  if (o.panel !== false) slide.addShape("rect", { x, y, w, h, fill: { color: COLOR.white }, line: { color: COLOR.lightLine, width: 0.5 } });
  const file = pngName.endsWith(".png") ? pngName : `${PNG}/${pngName}.png`;
  const head = fs.readFileSync(file);
  const pw = head.readUInt32BE(16), ph = head.readUInt32BE(20);
  const pad = o.panel === false ? 0 : 0.1;
  const bw = w - 2 * pad, bh = h - 2 * pad;
  const scale = Math.min(bw / pw, bh / ph);
  const fw = pw * scale, fh = ph * scale;
  slide.addImage({ path: file, x: x + pad + (bw - fw) / 2, y: y + pad + (bh - fh) / 2, w: fw, h: fh });
  if (o.caption) addCaption(slide, o.caption);
}

function addCaption(slide, text, y) {
  const t = tone(slide);
  slide.addText(text, { x: 0.4, y: y ?? 5.08, w: 9.2, h: 0.3, margin: 0,
    fontFace: FONT.body, fontSize: 10, italic: true, color: t.muted, align: "center", valign: "middle" });
}

// Native chart in the theme. type: "bar" | "line" | "pie" | "doughnut".
// data: pptxgenjs series [{name, labels, values}].
function addChart(slide, type, data, o = {}) {
  const t = tone(slide);
  const map = { bar: PRES.charts.BAR, line: PRES.charts.LINE, pie: PRES.charts.PIE, doughnut: PRES.charts.DOUGHNUT };
  slide.addChart(map[type] || PRES.charts.BAR, data, {
    x: o.x ?? 0.4, y: o.y ?? 0.95, w: o.w ?? 9.2, h: o.h ?? 4.3,
    barDir: o.barDir || "col", chartColors: o.colors || SEQ,
    plotArea: { fill: { color: slide._light ? COLOR.lightCard : COLOR.card } },
    catAxisLabelColor: t.muted, valAxisLabelColor: t.muted,
    catAxisLabelFontFace: FONT.body, valAxisLabelFontFace: FONT.body,
    catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
    catAxisLineShow: false, valAxisLineShow: false,
    valGridLine: { color: t.line, size: 0.5 }, catGridLine: { style: "none" },
    showLegend: data.length > 1, legendPos: "b", legendColor: t.text, legendFontFace: FONT.body, legendFontSize: 10,
    showValue: o.showValue ?? true, dataLabelColor: t.text, dataLabelFontFace: FONT.body, dataLabelFontSize: 10,
    dataLabelFormatCode: o.format, valAxisLabelFormatCode: o.format,
    showTitle: !!o.title, title: o.title, titleColor: t.text, titleFontFace: FONT.title, titleFontSize: 12,
    ...(o.extra || {}),
  });
}

// About the speaker: photo (optional), name, role, bio bullets, links.
function addSpeaker(slide, o = {}) {
  const sp = BRAND.speaker, t = tone(slide);
  let x = 0.4;
  if (exists(o.photo)) {
    slide.addImage({ path: o.photo, x: 0.5, y: 1.05, w: 2.2, h: 2.2, rounding: true });
    slide.addShape("ellipse", { x: 0.5, y: 1.05, w: 2.2, h: 2.2, fill: { color: COLOR.bg, transparency: 100 }, line: { color: BRAND.accent, width: 2 } });
    x = 3.1;
  }
  slide.addText(sp.name || "", { x, y: 0.95, w: 9.6 - x, h: 0.55, margin: 0,
    fontFace: FONT.title, fontSize: 26, bold: true, color: t.text, valign: "middle" });
  slide.addText(sp.role || "", { x, y: 1.5, w: 9.6 - x, h: 0.35, margin: 0,
    fontFace: FONT.body, fontSize: 14, color: BRAND.accent, valign: "middle" });
  addBullets(slide, o.bio || [], { x, y: 2.0, w: 9.6 - x, h: 2.4, fontSize: 13 });
  const links = [sp.handle, sp.url].filter(Boolean).join("   ·   ");
  if (links) slide.addText(links, { x, y: 4.55, w: 9.6 - x, h: 0.4, margin: 0,
    fontFace: FONT.mono, fontSize: 11, color: t.muted, valign: "middle" });
}

// One take-away card at x, width w: image, title, caption, url.
function drawCard(slide, c, x, w) {
  const t = tone(slide), size = 2.2;
  const pos = { x: x + (w - size) / 2, y: 1.0, w: size, h: size };
  if (c.data) slide.addImage({ data: c.data, ...pos });
  else if (exists(c.img)) slide.addImage({ path: c.img, ...pos });
  slide.addText(c.title, { x, y: 3.3, w, h: 0.4, margin: 0, fontFace: FONT.title, fontSize: 15, bold: true, color: t.text, align: "center" });
  if (c.caption) slide.addText(c.caption, { x: x + 0.2, y: 3.7, w: w - 0.4, h: 0.5, margin: 0, fontFace: FONT.body, fontSize: 11, italic: true, color: t.muted, align: "center", valign: "top" });
  if (c.url) slide.addText(c.url, { x: x + 0.1, y: 4.3, w: w - 0.2, h: 0.4, margin: 0, fontFace: FONT.mono, fontSize: 9, color: BRAND.accent, align: "center", valign: "top" });
}

// Take-it-with-you cards: [{img | data, title, caption, url}] (QR codes, covers).
function addTakeAway(slide, cards) {
  const w = 9.3 / cards.length;
  cards.forEach((c, i) => drawCard(slide, c, 0.35 + i * w, w));
}

// Loads the optional `qrcode` package (npm, MIT, installed per deck). Null when absent.
function loadQr() {
  try { return require("qrcode"); } catch (e) { return null; }
}

// Renders a QR code for `url` in memory (PNG data URL, dark on white with a quiet
// zone) and returns a card for addTakeAway: {data, title, caption, url}.
// Without `qrcode` installed it warns and returns the placeholder image instead.
async function qrCard(url, label, opts = {}) {
  const QR = loadQr();
  const card = { title: label, caption: opts.caption, url: opts.display || url };
  if (!QR) {
    console.warn(`WARN qrCard: "qrcode" is not installed, using the placeholder for ${url}`);
    return { ...card, img: `${ASSETS}/qr-placeholder.png` };
  }
  card.data = await QR.toDataURL(url, {
    errorCorrectionLevel: opts.level || "M", margin: opts.margin ?? 2, width: opts.px || 600,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  return card;
}

// Convenience: build the QR cards and lay them out on `slide` in one call.
// items: [{url, label, caption, display}]. Place it on a light slide.
async function addQrCards(slide, items) {
  const cards = [];
  for (const it of items) cards.push(await qrCard(it.url, it.label, it));
  addTakeAway(slide, cards);
  return cards;
}

// Closing: resource cards on top, "Questions?" and a thank-you line below.
// resources: [{title, detail, color}]; links: ["label: url", ...]
function addClosing(pres, o = {}) {
  const s = register(pres.addSlide(), "closing");
  s.background = { color: COLOR.bg };
  s.addShape("rect", { x: 0, y: 0, w: W, h: 0.12, fill: { color: BRAND.accent }, line: { type: "none" } });
  s.addText(o.title || "Resources & Q&A", { x: 0.5, y: 0.3, w: 9, h: 0.6, margin: 0,
    fontFace: FONT.title, fontSize: 26, bold: true, color: COLOR.text, valign: "middle" });
  const res = o.resources || [];
  const cw = res.length ? (9.0 - 0.3 * (res.length - 1)) / res.length : 0;
  res.forEach((r, i) => {
    const x = 0.5 + i * (cw + 0.3), c = r.color || SEQ[i % SEQ.length];
    s.addShape("rect", { x, y: 1.05, w: cw, h: 0.95, fill: { color: c }, line: { color: BRAND.accent, width: 1 } });
    s.addText([{ text: r.title, options: { bold: true, fontSize: 12, breakLine: true } },
               { text: r.detail || "", options: { fontSize: 9.5 } }],
      { x: x + 0.15, y: 1.05, w: cw - 0.3, h: 0.95, margin: 0, fontFace: FONT.body, color: COLOR.white, valign: "middle" });
  });
  const links = o.links || [];
  links.forEach((l, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    s.addText(l, { x: 0.5 + col * 4.65, y: 2.15 + row * 0.42, w: 4.35, h: 0.36, margin: 4,
      fill: { color: COLOR.card }, fontFace: FONT.mono, fontSize: 9, color: COLOR.teal, valign: "middle", fit: "shrink" });
  });
  s.addText(o.question || "Questions?", { x: 0.5, y: 3.95, w: 5, h: 0.75, margin: 0,
    fontFace: FONT.title, fontSize: 34, bold: true, color: BRAND.accent, valign: "middle" });
  if (o.footnote) s.addText(o.footnote, { x: 0.5, y: 4.7, w: 5.5, h: 0.5, margin: 0,
    fontFace: FONT.body, fontSize: 11, color: COLOR.muted, valign: "top" });
  s.addShape("ellipse", { x: 6.9, y: 3.6, w: 3.4, h: 3.4, fill: { color: COLOR.bg, transparency: 100 }, line: { color: BRAND.accent, width: 1.25 } });
  s.addText(o.thanks || "Thank you!", { x: 6.2, y: 3.95, w: 3.5, h: 0.7, margin: 0,
    fontFace: FONT.title, fontSize: 26, bold: true, color: BRAND.accent, align: "center", valign: "middle" });
  const sp = BRAND.speaker;
  const sign = [sp.name, sp.handle].filter(Boolean).join("  ·  ");
  if (sign) s.addText(sign, { x: 6.2, y: 4.6, w: 3.5, h: 0.35, margin: 0,
    fontFace: FONT.body, fontSize: 11, color: COLOR.text, align: "center", valign: "middle" });
  s.addShape("rect", { x: 0, y: 5.42, w: W, h: 0.205, fill: { color: BRAND.accent }, line: { type: "none" } });
  return s;
}

// ----- notes and output -------------------------------------------------------
function addNotes(slide, text) {
  slide.addNotes(text);
  const rec = SLIDES.find((r) => r.slide === slide);
  if (rec && text && text.trim()) rec.notes = true;
}

// Writes the deck after checking that every slide carries speaker notes.
async function writeDeck(pres, out) {
  const missing = SLIDES.filter((r) => !r.notes).map((r) => r.slide._confIndex);
  if (missing.length) throw new Error(`slides without speaker notes: ${missing.join(", ")}`);
  const p = await pres.writeFile({ fileName: out });
  console.log(`WROTE ${p} (${SLIDES.length} slides, ${SLIDES.length} with notes)`);
  return p;
}

module.exports = {
  PptxGenJS, COLOR, SEQ, FONT, W, H, PNG, ASSETS, BRAND,
  brand, newDeck, contentSlide, addFooter,
  addCover, addSectionDivider, addDemoDivider, addClosing,
  addBullets, addHeading, addLead, addTwoCol, addStatCards, addAccentRows,
  addAgendaGrid, addTakeaways, addTable, addCodeBlock, addCallout, addTip,
  addComparison, addDiagram, addCaption, addChart, addSpeaker, addTakeAway,
  qrCard, addQrCards, addNotes, writeDeck,
};
