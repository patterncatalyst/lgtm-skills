// deck-helpers.js — design system & helpers for the REST deck
// Carries the visual conventions from the existing Python deck:
//   - 13.333 x 7.5 LAYOUT_WIDE
//   - Eyebrow 12pt bold red EE0000, charSpacing 4
//   - Title 30pt Overpass SemiBold #151515
//   - Content 17pt Red Hat Text #242424
//   - Code box fill #151515, code 11pt Red Hat Mono, fg #E6E6E6, comments #8FB98F
//   - Section dividers: bg #AB0000 with section-panel.png on left and white logo
//   - Caption 13pt italic #5A5A5A; page number 10pt #8A8A8A

"use strict";

const PptxGenJS = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const PNG = process.env.DECK_PNG || "./png";
const ASSETS = process.env.DECK_ASSETS || "./assets";
const THEME_PATH = process.env.DECK_THEME || null;
const PRODUCT_LOGO = process.env.DECK_PRODUCT_LOGO || null;
const PRODUCT_LOGO_PLACEMENT = process.env.DECK_PRODUCT_LOGO_PLACEMENT || "cover";

const COLOR = {
  red:        "EE0000",
  redDark:    "AB0000",
  redDeep:    "B71C1C",
  ink:        "151515",
  body:       "242424",
  caption:    "5A5A5A",
  pageNum:    "8A8A8A",
  grid:       "D2D2D2",
  panel:      "F4F4F4",
  codeBg:     "151515",
  codeFg:     "E6E6E6",
  codeComment:"8FB98F",
  codeKey:    "FFC36C",
  codeStr:    "E2CFA2",
  codeDecor:  "97C0FF",
  white:      "FFFFFF",
  rule:       "EE0000",
  // accent palette for callouts
  svc:        "0066CC",
  data:       "6A1B9A",
  platform:   "006E6E",
  govern:     "B36B00",
  amber:      "FFA000",
  // perf callout accent
  perfBg:     "FFF7E6",
  perfBorder: "B36B00",
};

const FONT = {
  title:   "Red Hat Display",
  titleFb: "Calibri",
  body:    "Red Hat Text",
  bodyFb:  "Calibri",
  mono:    "Red Hat Mono",
  monoFb:  "Consolas",
};

// --- Theme loading ---
// If DECK_THEME points to a JSON file, read it and merge overrides into the
// layout constants. The theme JSON format is defined in
// skills/lgtm-presentation-templates/SKILL.md.
let THEME = null;

function loadTheme(themePath) {
  if (!themePath) return null;
  const resolved = path.resolve(themePath);
  if (!fs.existsSync(resolved)) {
    console.warn(`[deck-helpers] theme not found: ${resolved}, using defaults`);
    return null;
  }
  const raw = fs.readFileSync(resolved, "utf-8");
  const theme = JSON.parse(raw);
  console.log(`[deck-helpers] loaded theme: "${theme.name}"`);
  return theme;
}

THEME = loadTheme(THEME_PATH);

function themeVal(key, fallback) {
  if (THEME && THEME.overrides && THEME.overrides[key] !== undefined) {
    return THEME.overrides[key];
  }
  return fallback;
}

// Apply color overrides from theme
if (THEME && THEME.overrides && THEME.overrides.colors) {
  Object.assign(COLOR, THEME.overrides.colors);
}

// Apply font overrides from theme
if (THEME && THEME.overrides && THEME.overrides.fonts) {
  Object.assign(FONT, THEME.overrides.fonts);
}

// Slide dimensions in inches (LAYOUT_WIDE)
const W = 13.333;
const H = 7.5;

// ----- helpers -----
function newDeck() {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "Designing Cloud-Native REST APIs — Python";
  pres.author = "Robert Sedor";
  pres.company = "Red Hat";
  return pres;
}

// Footer: red Hat-style page number + small logo on every content slide.
function addFooter(slide, pageNum) {
  // page number (bottom-left)
  slide.addText(String(pageNum), {
    x: themeVal("pageNumX", 0.62), y: themeVal("pageNumY", 6.96), w: 1.0, h: 0.30,
    fontFace: FONT.body, fontSize: 10, color: COLOR.pageNum,
    align: "left", valign: "middle",
  });
  // Red Hat color logo, bottom-right — present on every content slide
  // (the cover and section dividers carry their own logo separately).
  try {
    slide.addImage({
      path: `${ASSETS}/logo-candidate-2.png`,
      x: themeVal("logoX", 11.55),
      y: themeVal("logoY", 6.95),
      w: themeVal("logoW", 1.13),
      h: themeVal("logoH", 0.27),
    });
  } catch (e) { /* ok if missing */ }

  // Accent rules — drawn if the theme enables them
  if (themeVal("accentRules", false)) {
    const ruleColor = COLOR.rule || COLOR.red;
    const topY = themeVal("topRuleY", 0.97);
    const bottomY = themeVal("bottomRuleY", 7.0);
    const ruleX = themeVal("ruleX", 0.49);
    // top accent rule
    slide.addShape("line", {
      x: ruleX, y: 0, w: 0.0, h: topY,
      line: { color: ruleColor, width: 1.0 },
    });
    // bottom accent rule
    slide.addShape("line", {
      x: ruleX, y: bottomY, w: 0.0, h: H - bottomY,
      line: { color: ruleColor, width: 1.0 },
    });
  }
}

function addProductLogo(slide, opts = {}) {
  const logoPath = opts.path || PRODUCT_LOGO;
  if (!logoPath) return;

  // Explicit position — use on any slide at any location
  if (opts.x !== undefined) {
    try {
      slide.addImage({
        path: logoPath,
        x: opts.x, y: opts.y, w: opts.w, h: opts.h,
        sizing: { type: "contain", w: opts.w, h: opts.h },
      });
    } catch (e) { /* ok if missing */ }
    return;
  }

  // Named placement — falls back to theme-configured positions
  const placement = opts.placement || PRODUCT_LOGO_PLACEMENT;
  const logoConf = (THEME && THEME.overrides && THEME.overrides.productLogo) || {};

  const positions = {
    cover: {
      x: logoConf.coverX ?? 0.62,
      y: logoConf.coverY ?? 5.5,
      w: logoConf.coverW ?? 2.0,
      h: logoConf.coverH ?? 0.5,
    },
    footer: {
      x: logoConf.footerX ?? 10.0,
      y: logoConf.footerY ?? 6.95,
      w: logoConf.footerW ?? 0.8,
      h: logoConf.footerH ?? 0.27,
    },
    topRight: {
      x: logoConf.topRightX ?? 11.5,
      y: logoConf.topRightY ?? 0.35,
      w: logoConf.topRightW ?? 1.5,
      h: logoConf.topRightH ?? 0.4,
    },
  };

  const pos = positions[placement] || positions.cover;
  try {
    slide.addImage({
      path: logoPath,
      x: pos.x, y: pos.y, w: pos.w, h: pos.h,
      sizing: { type: "contain", w: pos.w, h: pos.h },
    });
  } catch (e) { /* ok if missing */ }
}

function addContentTitle(slide, eyebrow, title, opts = {}) {
  const titleX = themeVal("titleX", 0.62);
  const titleW = opts.w ?? themeVal("titleW", 12.09);
  const titleY = themeVal("titleY", 0.74);
  const eyebrowY = titleY - 0.32;
  slide.addText(eyebrow, {
    x: titleX, y: eyebrowY, w: opts.eyebrowW ?? titleW, h: 0.32,
    fontFace: FONT.title, fontSize: 12, bold: true, color: COLOR.red,
    charSpacing: 4,
    align: "left", valign: "middle",
  });
  slide.addText(title, {
    x: titleX, y: titleY, w: titleW, h: opts.h ?? 1.10,
    fontFace: FONT.title, fontSize: opts.fontSize ?? 30, bold: true, color: COLOR.ink,
    align: "left", valign: "top",
  });
}

function addBullets(slide, lines, opts = {}) {
  const x = opts.x ?? themeVal("bulletsX", 0.62);
  const y = opts.y ?? themeVal("bulletsY", 1.85);
  const w = opts.w ?? 12.09;
  const h = opts.h ?? 4.85;
  const fontSize = opts.fontSize ?? 17;
  const indentSize = 8;
  const bulletCode = _bulletCode();
  const subBulletCode = themeVal("bulletStyle", "round") === "triangle" ? "25B7" : "25E6";
  const items = lines.map((ln) => {
    if (typeof ln === "string") {
      return { text: ln, options: { bullet: { code: bulletCode }, paraSpaceAfter: 6, breakLine: true } };
    }
    return {
      text: ln.text,
      options: {
        bullet: ln.sub ? { indent: indentSize, code: subBulletCode } : { code: bulletCode },
        paraSpaceAfter: 4,
        breakLine: true,
        indentLevel: ln.sub ? 1 : 0,
        ...(ln.options || {}),
      },
    };
  });
  slide.addText(items, {
    x, y, w, h,
    fontFace: FONT.body, fontSize, color: COLOR.body,
    align: "left", valign: "top",
    paraSpaceAfter: 6,
    lineSpacingMultiple: 1.15,
  });
}

function _bulletCode() {
  const style = themeVal("bulletStyle", "round");
  switch (style) {
    case "triangle": return "25B6";
    case "dash":     return "2014";
    default:         return "25CF";
  }
}

// Two-column bullets — matches the reference deck's agenda layout.
// `left` and `right` are arrays of strings (or {text, options} objects).
// `muted` indicates items to render in muted italic style (e.g. appendices).
function addTwoColBullets(slide, left, right, opts = {}) {
  const y = opts.y ?? themeVal("bulletsY", 1.85);
  const h = opts.h ?? 4.85;
  const fontSize = opts.fontSize ?? 17;
  const bulletCode = _bulletCode();

  function mk(items) {
    return items.map((ln) => {
      if (typeof ln === "string") {
        return { text: ln, options: { bullet: { code: bulletCode }, paraSpaceAfter: 8, breakLine: true } };
      }
      return {
        text: ln.text,
        options: {
          bullet: { code: bulletCode },
          paraSpaceAfter: 8,
          breakLine: true,
          italic: !!ln.muted,
          color: ln.muted ? COLOR.caption : COLOR.body,
          ...(ln.options || {}),
        },
      };
    });
  }

  slide.addText(mk(left), {
    x: 0.62, y, w: 6.00, h,
    fontFace: FONT.body, fontSize, color: COLOR.body,
    align: "left", valign: "top",
    paraSpaceAfter: 8, lineSpacingMultiple: 1.20,
  });
  slide.addText(mk(right), {
    x: 7.02, y, w: 6.00, h,
    fontFace: FONT.body, fontSize, color: COLOR.body,
    align: "left", valign: "top",
    paraSpaceAfter: 8, lineSpacingMultiple: 1.20,
  });
}

// Status-code table: 3-column layout — code | name | purpose
// Designed for the 2xx/4xx/5xx slides so the bullets-as-prose pattern can be retired.
function addStatusTable(slide, rows, opts = {}) {
  const y = opts.y ?? 1.85;
  const h = opts.h ?? (opts.withCallout ? 3.55 : 4.85);

  const tableRows = rows.map((r) => [
    {
      text: r.code,
      options: {
        bold: true, color: r.codeColor || COLOR.red,
        fontFace: FONT.mono, fontSize: 15,
        align: "left", valign: "middle",
      },
    },
    {
      text: r.name,
      options: {
        bold: true, color: COLOR.ink,
        fontFace: FONT.body, fontSize: 14,
        align: "left", valign: "middle",
      },
    },
    {
      text: r.purpose,
      options: {
        color: COLOR.body,
        fontFace: FONT.body, fontSize: 13,
        align: "left", valign: "middle",
      },
    },
  ]);

  slide.addTable(tableRows, {
    x: 0.62, y, w: 12.09, h,
    fontFace: FONT.body,
    color: COLOR.body,
    border: { type: "solid", color: COLOR.grid, pt: 0.5 },
    valign: "middle",
    // Default 3-column widths suit short status codes in column 1. Reference
    // tables (Appendix A/B) pass a wider colW so long labels (e.g. test-type
    // names, CLI names) don't wrap. Widths should sum to ~12.09 (the table w).
    colW: opts.colW ?? [1.10, 2.40, 8.59],
    rowH: opts.rowH ?? 0.45,
  });
}

function addCaption(slide, text, y) {
  slide.addText(text, {
    x: 0.62, y: y ?? 6.50, w: 12.09, h: 0.34,
    fontFace: FONT.body, fontSize: 13, italic: true, color: COLOR.caption,
    align: "center", valign: "middle",
  });
}

function addPerfCallout(slide, text, opts = {}) {
  // Distinctive "perf" sidebar — amber tint, left bar, eyebrow "⚡ PERFORMANCE"
  const x = opts.x ?? 0.62;
  const y = opts.y ?? 5.65;
  const w = opts.w ?? 12.09;
  const h = opts.h ?? 0.80;
  // background panel
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: COLOR.perfBg },
    line: { color: COLOR.perfBorder, width: 0 },
  });
  // left accent bar
  slide.addShape("rect", {
    x, y, w: 0.06, h,
    fill: { color: COLOR.perfBorder },
    line: { color: COLOR.perfBorder, width: 0 },
  });
  // eyebrow text + body, stacked
  slide.addText([
    { text: "⚡  PERFORMANCE", options: {
        fontFace: FONT.title, fontSize: 10, bold: true, color: COLOR.perfBorder,
        charSpacing: 3, breakLine: true,
    }},
    { text: text, options: {
        fontFace: FONT.body, fontSize: 13, color: COLOR.body,
    }},
  ], {
    x: x + 0.20, y: y + 0.04, w: w - 0.30, h: h - 0.08,
    align: "left", valign: "middle",
  });
}

function addDiagramSlide(slide, eyebrow, title, pngName, caption, opts = {}) {
  addContentTitle(slide, eyebrow, title);
  const x = opts.x ?? 1.80;
  const y = opts.y ?? 1.75;
  const w = opts.w ?? 9.74;
  const h = opts.h ?? 4.75;
  slide.addImage({
    path: `${PNG}/${pngName}.png`,
    x, y, w, h,
    sizing: { type: "contain", w, h },
  });
  if (caption) addCaption(slide, caption);
}

// language eyebrow chip (right-aligned, above the code box)
function addLangChip(slide, label) {
  // Right-aligned, on the same vertical band as the title row
  slide.addText(label, {
    x: 8.62, y: 1.06, w: 4.09, h: 0.30,
    fontFace: FONT.mono, fontSize: 11, bold: true, color: COLOR.caption,
    charSpacing: 2,
    align: "right", valign: "middle",
  });
}

function addCodeSlide(slide, eyebrow, title, lang, codeLines, caption, opts = {}) {
  // If a language chip is present, narrow the title so it doesn't run under the chip.
  addContentTitle(slide, eyebrow, title, lang ? { w: 7.90 } : {});
  if (lang) addLangChip(slide, lang);
  // dark code box
  const x = opts.x ?? 0.62;
  const y = opts.y ?? 1.85;
  const w = opts.w ?? 12.09;
  const h = opts.h ?? 4.65;
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: COLOR.codeBg },
    line: { color: COLOR.codeBg, width: 0 },
  });
  // code text — render each line with simple syntax coloring (comments green)
  const items = codeLines.map((ln) => {
    const trimmed = ln.replace(/^\s+/, "");
    const isComment = trimmed.startsWith("#") || trimmed.startsWith("//");
    return {
      text: ln + "\n",
      options: {
        fontFace: FONT.mono,
        fontSize: opts.fontSize ?? 11,
        color: isComment ? COLOR.codeComment : COLOR.codeFg,
        breakLine: false,
      },
    };
  });
  slide.addText(items, {
    x: x + 0.20, y: y + 0.10, w: w - 0.40, h: h - 0.20,
    fontFace: FONT.mono, fontSize: opts.fontSize ?? 11, color: COLOR.codeFg,
    align: "left", valign: "top",
    paraSpaceAfter: 0,
    lineSpacingMultiple: 1.10,
  });
  if (caption) {
    // When the code box is taller than default, push the caption below it.
    const codeBottom = y + h;
    const captionY = codeBottom > 6.50 ? codeBottom + 0.06 : 6.50;
    addCaption(slide, caption, captionY);
  }
}

function addSectionDivider(slide, code, title, subtitle) {
  // background — solid red, matches Python deck
  slide.background = { color: COLOR.redDark };
  // section-panel.png covers full slide (textured red)
  try {
    slide.addImage({
      path: `${ASSETS}/section-panel.png`,
      x: 0, y: 0, w: W, h: H,
    });
  } catch (e) { /* ok if missing */ }
  // section code (e.g. "00")
  slide.addText(code, {
    x: 6.27, y: 2.32, w: 6.40, h: 0.50,
    fontFace: FONT.title, fontSize: 22, bold: true, color: COLOR.white,
    charSpacing: 6,
    align: "left", valign: "middle",
  });
  // title
  slide.addText(title, {
    x: 6.24, y: 2.84, w: 6.70, h: 1.60,
    fontFace: FONT.title, fontSize: 44, bold: true, color: COLOR.white,
    align: "left", valign: "top",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 6.27, y: 4.55, w: 6.60, h: 0.80,
      fontFace: FONT.body, fontSize: 16, italic: true, color: "FFD9D9",
      align: "left", valign: "top",
    });
  }
  // white logo bottom right
  try {
    slide.addImage({
      path: `${ASSETS}/redhat-logo-white.png`,
      x: 11.42, y: 6.88, w: 1.33, h: 0.31,
    });
  } catch (e) { /* ok */ }
}

function addNotes(slide, text) {
  slide.addNotes(text);
}

module.exports = {
  PptxGenJS, COLOR, FONT, W, H, PNG, ASSETS, THEME,
  newDeck, loadTheme, themeVal,
  addFooter, addProductLogo, addContentTitle, addBullets, addTwoColBullets,
  addStatusTable, addCaption, addPerfCallout,
  addDiagramSlide, addCodeSlide, addLangChip, addSectionDivider, addNotes,
};
