// deck.template.js: a working conference deck skeleton. Copy to deck.js and
// grow it slide by slide. One slide of every kind the theme offers.
//
// Build:  npm install pptxgenjs@4.0.1   (local to the deck dir, never global)
//         node deck.js
// Paths:  deck-helpers.js reads DECK_ASSETS (./assets) and DECK_PNG (./png).

"use strict";

const {
  COLOR, ASSETS,
  brand, newDeck, contentSlide,
  addCover, addSectionDivider, addDemoDivider, addClosing,
  addBullets, addHeading, addLead, addTwoCol, addStatCards, addAccentRows,
  addAgendaGrid, addTakeaways, addTable, addCodeBlock, addCallout, addTip,
  addComparison, addDiagram, addChart, addSpeaker, addTakeAway,
  addNotes, writeDeck,
} = require("./deck-helpers.js");

// Output filename: bump the major on a new section, .x on a fix. Keep REV in step.
const REV = "r01.0";
const OUT = `./my-conference-talk-${REV}.pptx`;

// ---- Brand slots: the conference's or the speaker's, never a vendor's by default.
brand({
  footer: "Talk title  ·  Event 2027",
  logo: `${ASSETS}/logo-placeholder.png`,   // null for no footer logo
  logoAspect: 3,
  // accent: "00BCD4", band: "1E6FC8",       // override per event if wanted
  speaker: { name: "Speaker Name", role: "Role, Organisation", handle: "@handle", url: "example.dev" },
  event: { name: "Event 2027", date: "City, Month 2027", logo: null },
  url: "github.com/your-org/your-talk",
});

const pres = newDeck({ title: "Talk title", subject: "Conference talk" });

// ---- Cover -------------------------------------------------------------------
{
  const s = addCover(pres, {
    eyebrow: "Short hook",
    title: "A specific talk title\non two lines",
    techLine: "Stack A 1.2  •  Runtime B 25  •  Tool C  •  Tool D",
    credits: "Based on: Author, Book Title  |  Author, Another Book",
    rev: REV,
  });
  addNotes(s, "Speaker notes are required on every slide, the cover included. Open with the problem the room has, then the promise of the talk.");
}

// ---- About the speaker ---------------------------------------------------------
{
  const s = contentSlide(pres, "About me", "Speaker");
  addSpeaker(s, { photo: null, bio: [
    "One line on what you build today.",
    "One line on why you can speak to this topic.",
    "One line on where the audience can find your work.",
  ] });
  addNotes(s, "Keep this under a minute. The audience came for the topic.");
}

// ---- Agenda ------------------------------------------------------------------
{
  const s = contentSlide(pres, "Agenda", "Overview", { light: true });
  addAgendaGrid(s, [
    "The problem in numbers", "How the platform sees the runtime",
    "Sizing from the container limit", "Tuning the collector",
    "Startup and warm-up", "Observability first",
    { num: "Bonus", text: "Deep dives for Q&A", color: COLOR.red },
  ]);
  addNotes(s, "Point at the grid, do not read it. Name the two sections that carry the live demos.");
}

// ---- Stat cards + accent rows ----------------------------------------------------
{
  const s = contentSlide(pres, "Why this is hard", "The problem");
  addStatCards(s, [
    { value: "60%", label: "of services over-request memory", color: COLOR.red },
    { value: "2-5s", label: "typical cold start", color: COLOR.amber },
    { value: "3x", label: "waste from poor bin-packing", color: COLOR.red },
    { value: "$$$", label: "spent on idle capacity", color: COLOR.amber },
  ]);
  s.addText("Common failure patterns:", { x: 0.4, y: 2.3, w: 9, h: 0.35, margin: 0,
    fontFace: "Carlito", fontSize: 14, bold: true, color: COLOR.text });
  addAccentRows(s, [
    { label: "Limits ignored", text: "The runtime sizes itself from the host instead of the container." },
    { label: "OOM kills", text: "The pod dies mid-request when the limit is reached." },
    { label: "Scale-out lag", text: "Slow start delays new replicas during a burst." },
  ]);
  addNotes(s, "Each number comes from a measured run; say where it came from and credit the source in the notes.");
}

// ---- Section divider -------------------------------------------------------------
{
  const s = addSectionDivider(pres, "SECTION 01", "Sizing from the\ncontainer limit", "Read the limit, then size the heap from it.");
  addNotes(s, "Set up the section: what the audience will be able to do by the end of it.");
}

// ---- Bullets (light) + code ----------------------------------------------------
{
  const s = contentSlide(pres, "Bullets beside code", "Section 01", { light: true });
  addHeading(s, "What changes", { w: 4.45 });
  addBullets(s, [
    "Each bullet makes one complete point.",
    "Cross-reference by concept, never by slide number.",
    { text: "A sub-point carries detail.", sub: true },
  ], { y: 1.35, w: 4.45, h: 2.9, fontSize: 13 });
  addCodeBlock(s, [
    "# Comments render in the comment colour",
    "resources:",
    "  limits:",
    "    memory: 512Mi",
    "env:",
    "  - name: JAVA_TOOL_OPTIONS",
    "    value: -XX:MaxRAMPercentage=75",
  ], { x: 5.15, y: 0.95, w: 4.45, h: 3.3 });
  addCallout(s, "Reference: Author, Book Title, chapter on memory. Credit every source the slide leans on.");
  addNotes(s, "The slide shows the code; the notes teach it.");
}

// ---- Full code slide ---------------------------------------------------------------
{
  const s = contentSlide(pres, "A full code slide", "Section 01");
  addCodeBlock(s, [
    "// The block shrinks the font to fit and warns below 8 pt",
    "@GET",
    "@Path(\"/orders/{id}\")",
    "public Order get(@PathParam(\"id\") String id) {",
    "    return repository.findById(id);",
    "}",
  ], { h: 3.6 });
  addTip(s, "Tip: keep one idea per code slide; split a block that needs less than 8 pt.", { y: 4.75 });
  addNotes(s, "Walk the code top to bottom; name the one line that matters.");
}

// ---- Diagram ---------------------------------------------------------------------
{
  const s = contentSlide(pres, "A diagram slide", "Section 01", { light: true });
  addDiagram(s, `${ASSETS}/sample-diagram.png`, { caption: "Light figures sit on a white panel, fitted to their own aspect." });
  addNotes(s, "Describe the figure left to right; the notes carry what the picture cannot.");
}

// ---- Table ---------------------------------------------------------------------
{
  const s = contentSlide(pres, "A comparison table", "Section 02");
  addLead(s, "Choosing the right option for the workload");
  addTable(s, ["Option", "Pause model", "Overhead", "Best for", "Flags"], [
    ["Option A", "Short", "Medium", "General-purpose services", "-XX:+UseG1GC"],
    ["Option B", "Sub-millisecond", "Higher", "Latency-sensitive APIs", "-XX:+UseZGC"],
    ["Option C", "Stop-the-world", "Lowest", "Batch jobs, small heaps", "-XX:+UseSerialGC"],
  ], { colW: [1.3, 1.5, 1.1, 3.0, 2.4], monoCols: [4], rowH: 0.62 });
  addTip(s, "Tip: measure the p99 pause before switching.", { y: 4.85 });
  addNotes(s, "Read across one row, then let the audience read the rest.");
}

// ---- Comparison ------------------------------------------------------------------
{
  const s = contentSlide(pres, "Before and after", "Section 02");
  addComparison(s,
    { title: "Before", items: ["Hard-coded heap size", "Breaks when the limit changes", "Host RAM drives sizing"] },
    { title: "After", items: ["Percentage of the limit", "Follows a resize with no rebuild", "The container limit drives sizing"] });
  addNotes(s, "Left is the anti-pattern, right is the fix. Pause on the right column.");
}

// ---- Two columns ---------------------------------------------------------------
{
  const s = contentSlide(pres, "Two columns with headings", "Section 02", { light: true });
  addTwoCol(s,
    { heading: "Requests", items: ["What the scheduler reserves", "Drives bin-packing", "Set from measured p99"] },
    { heading: "Limits", items: ["What the kernel enforces", "Drives OOM kills", "Set with headroom above requests"], color: COLOR.green });
  addNotes(s, "Requests and limits do different jobs. The left column feeds the scheduler, the right column feeds the kernel.");
}

// ---- Chart ---------------------------------------------------------------------
{
  const s = contentSlide(pres, "Startup time by configuration", "Section 02");
  addChart(s, "bar", [{ name: "Startup (s)", labels: ["Baseline", "CDS", "AOT cache"], values: [4.2, 2.9, 1.6] }],
    { format: "0.0", colors: [COLOR.teal] });
  addNotes(s, "State the hardware class and the run count in the notes, never on the slide.");
}

// ---- Demo divider ----------------------------------------------------------------
{
  const s = addDemoDivider(pres, "DEMO 01", "Sizing from\nthe limit", [
    "Run without container awareness and watch the heap claim host RAM.",
    "Run with a percentage and watch it follow the limit.",
  ], "podman run  →  kubectl apply");
  addNotes(s, "Five minutes. If the demo fails, the recorded output is in the repo.");
}

// ---- Takeaways -----------------------------------------------------------------
{
  const s = contentSlide(pres, "Key takeaways", "Summary", { light: true });
  addTakeaways(s, [
    "Size from the container limit, never from the host.",
    "Measure before tuning; every change needs a number.",
    "Pick the collector for the latency target.",
    "Cache what startup repeats.",
    "Autoscale on load, not on CPU spikes the collector causes.",
  ]);
  addNotes(s, "One sentence per takeaway, then go to the close.");
}

// ---- Take it with you (QR codes) ----------------------------------------------------
{
  const s = contentSlide(pres, "Take it with you", "Scan to explore", { light: true });
  addTakeAway(s, [
    { img: `${ASSETS}/qr-placeholder.png`, title: "The repo", caption: "Slides, demos and the tuning labs.", url: "github.com/your-org/your-talk" },
    { img: `${ASSETS}/qr-placeholder.png`, title: "Feedback", caption: "Rate the session in the event app.", url: "example.dev/feedback" },
  ]);
  addNotes(s, "Leave this up while questions start.");
}

// ---- Closing -------------------------------------------------------------------
{
  const s = addClosing(pres, {
    resources: [
      { title: "Book Title", detail: "Author Name  |  Publisher Year" },
      { title: "Another Book", detail: "Author Name  |  Publisher Year" },
    ],
    links: ["Demo repo:  github.com/your-org/your-talk", "Guide:  example.dev/guide",
            "Docs:  example.dev/docs", "Dashboards:  example.dev/dash"],
    footnote: "Slides and demos are in the repo above. Feedback and PRs welcome.",
  });
  addNotes(s, "Thank the organisers and the audience. Every book used in the talk appears on this slide.");
}

writeDeck(pres, OUT).catch((e) => { console.error(e.message); process.exit(1); });
