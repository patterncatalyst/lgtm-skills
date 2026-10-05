---
name: lgtm-professional-voice
description: "Professional-voice pass for technical tutorial sites, workshops, slide decks, READMEs, and speaker notes written for engineers. Scans a tree for verbal tics, confessional and defensive phrasing, meta-narration, school framing, generated-text tells, filename slide titles, and leaked internal codes, then rewrites them to a succinct peer-to-peer register without touching code, commands, identifiers, or recorded output. Ships a runnable scan script (per-pattern counts, per-file totals for splitting a sweep, excerpt mode, CI gate) and a ranked rule list with before/after examples from real cleanup commits. Use whenever the user says 'make it sound professional', 'tone pass', 'voice pass', 'reword', 'too wordy', 'tighten the prose', 'sounds artificial', 'sounds AI-written', 'reads like a kid wrote it', 'review the site/deck for wording', 'the audience is engineers', or asks to clean up a chapter, deck, or workshop before release. Also use when drafting new content for these projects, so the tics never land."
---

# Professional voice

A rewrite discipline for technical content whose readers are engineers. It
removes the habits that make prose read as padded, defensive, or
machine-written, and leaves the technical content exactly as it was.

## The audience contract

- The reader is a practicing engineer, often senior, often at the level of the
  people who built the tools being described.
- They read to get a fact, a mechanism, or a decision. Anything else costs them
  time.
- They assume the code is real and the author is competent. Defending either
  raises the doubt it was meant to remove.
- They do not need encouragement, reassurance, or a narrator.
- Succinct is not curt. Explain every concept a capable engineer from a
  neighboring stack might not know, once, in one clause.

If a sentence would sound odd said aloud to a staff engineer in a design
review, rewrite it.

## Rules, ranked

Ranked by how often each one cost a review round in the sibling projects.
Full phrase list with rewrites: `references/phrase-list.md`. Calibration
examples from real commits: `references/before-after.md`.

**1. No confessional register.** The work is not "honest", the summary is not
"stated plainly", nothing is "not hidden". Calling one part honest implies the
rest is not.
"to be honest, the catalog isn't built yet" → "The catalog is not built yet."
Exception: *lie* for a machine reporting a wrong value ("the mtime can lie")
is technical idiom; keep it. Test: person or process as subject, rewrite;
machine reporting a value, keep. (Same rule as `lgtm-tutorial`.)

**2. No defensive contrast.** Drop "real X, not a toy Y", "genuine", "not just
asserted", "deliberately". State the positive half.
"a real endpoint already running — not a toy snippet" → "a running endpoint".
Keep *deliberately* once per chapter at most, where a reader would otherwise
assume a mistake, and give the reason.

**3. No meta-narration.** The text talks about the subject, not about itself.
"Design decision worth noticing: the push happens after the commit" → "The
push happens after the commit." Cut "the thing to land", "worth stating", "the
vocabulary the rest of this deck uses by name", "this slide walks through".

**4. No school framing.** Readers are professionals, not students.
"capstone" → "full project example". "homework" → "exercise". Cut "simply",
"obviously", "easy", "don't worry".

**5. Titles name the concept.** No file names, no synthetic parallel
constructions.
"demo-grpc.sh — a typed contract, generated at build time" → title **gRPC
typed contracts**, subtitle *Generated at build time*, `demo-grpc.sh` as an
8pt footnote.
"Nine capabilities, nine real services" → "Nine capabilities demonstrated".

**6. General nouns in explanation, literal names in instructions.**
"the minikube substrate" → "the Kubernetes cluster". `minikube tunnel` in a
command stays.

**7. No generated-text tells.** *load-bearing*, *earns its place*, *delve*,
*seamless*, *leverage*, stacked em dashes, "isn't X — it's Y" used as a reflex.
Each one alone is harmless. Together they mark the text as machine-written,
and engineers stop trusting it.

**8. No emphasis by typography.** ALL-CAPS words (NOT, IS, SAME, AFTER) and
exclamation marks go. Put the important word at the end of the sentence.

**9. Cut hedges and filler.** "in order to" → "to". "somewhat slower" → "12%
slower". "actually", "really", "very": delete unless the sentence breaks
without them.

**10. Internal artifacts stay internal.** Tracking codes (`DRQ-006`, `CAP-003`),
phase labels, `_plans/` paths, and "the roadmap" do not appear in
reader-facing text. State the decision itself.

**11. Explain once, then use.** Every non-obvious term gets one clause on first
use: "`Uni<T>`, Mutiny's lazy single-value type". Not zero, not two.

**12. Structure beats run-ons.** Four or more parallel items become a list or
table. A sentence with two em dashes becomes two sentences.

## Per surface

Prose, slide titles, bullets, captions, speaker notes, diagram labels,
glossary, and demo narration each have their own rules in
`references/surfaces.md`. The short version:

| Surface | Rule |
|---------|------|
| Slide title | 2–5 word noun phrase naming the concept. Claim goes in the subtitle. |
| Bullets | Bold the subject noun (**graphql-gateway** …). One line, two at most. Visible spacing between bullets. |
| Slide body | No presenter logistics (infra tier, fallback, cue). Those go in notes. |
| Presenter-irrelevant slides | "Key design decisions", wiring tables, README-grade detail: cut, or move to the docs site. |
| Speaker notes | What the slide shows, then "What to show:", then the fallback. No delivery coaching. |
| Captions | `Figure N.x — <what it shows>`. Not "This figure illustrates…". |
| Diagram labels | Component names and protocol/event names. No sentences in boxes. |
| Glossary | **Term** — one-sentence definition. No walls of text. |

## Do not change

- Code, code blocks, and inline `code`.
- Commands, flags, file and directory names, URLs, environment variables.
- Identifiers that contain a flagged word: `capstone.order.v1`,
  `02-capstone-data-mesh.svg`, a `--naive` flag. Renaming an identifier is a
  code change with its own commit, re-run, and re-recorded output.
- Recorded verification output, test logs, and transcripts quoted as evidence.
- Quoted error messages and quoted third-party text.
- Verification-status footers, except to fix voice in their prose lead-in.
- Proper nouns and product names, including Maven's and Vert.x's *reactor*.
- Planning documents (`_plans/`, decision logs) unless the user asks. They are
  internal, and some repos mark them read-only.

The scanner blanks fenced code and inline code in Markdown so most of these
never show up as hits. Deck sources (`.js`), diagram specs (`.py`), and SVGs
are scanned raw, so triage identifiers there by hand.

## Procedure

**1. Scan.** Run from anywhere; the tree is read-only to the script.

```bash
S=~/.claude/skills/lgtm-professional-voice/scripts/scan.sh
$S path/to/repo                      # per-pattern counts, worst first
$S --tier ban path/to/repo           # only the rewrite-by-default patterns
$S --files path/to/repo              # per-file totals (use to split the sweep)
$S --hits capstone path/to/repo      # file:line excerpts for one pattern
$S --hits all --tier ban path/to/repo
$S --ext +sh,yaml path/to/repo       # also scan demo narration and config comments
$S --patterns .voice-patterns.tsv .  # add project-specific jargon
$S --tier ban --fail .               # exit 1 on any ban-tier hit (CI / pre-commit)
```

Defaults: Markdown, HTML, AsciiDoc, text, JS, Python, and SVG; `_plans/`,
`node_modules`, `_site`, `target`, and similar are pruned.

**2. Triage.** For each hit decide: rewrite, keep (machine subject,
identifier, quoted evidence, or a real need), or escalate to the user (an
identifier rename, a slide cut, a section move). Ban-tier hits default to
rewrite; watch-tier hits default to keep unless the sentence fails the
audience contract.

**3. Rewrite.** Rewrite the sentence, not the word. Swapping "genuinely" for
"truly" fixes nothing. Usually the right edit is deletion: the sentence
without the tic is the sentence you want. Read the paragraph after editing;
a sweep that removes tics can leave choppy fragments behind.

**4. Re-scan.** Run the same command. Ban-tier counts should be near zero, with
each survivor kept for a stated reason. Rebuild what the edit touched (deck
`.pptx`, diagram SVG + Excalidraw pair, Jekyll build) and look at the result.
A rebuilt deck is how you catch a shortened title that now wraps badly.

**5. Commit** as `docs(site):` / `docs(deck):` / `docs:` with a body that
lists the categories changed (Conventional Commits, no attribution trailers).

## Splitting a large sweep across agents

A full site plus two decks is too much for one context.

1. Run `--files` and partition the list into roughly equal hit totals. Never
   split one file between two agents. Typical split: chapters 00–07, 08–15,
   16–21 + appendices, each deck builder alone, READMEs + demo narration.
2. Give each executor: the audience contract, the ranked rules, the
   do-not-change list, its file list, and its `--hits` output. A subagent
   does not inherit this skill. Paste the rules in.
3. Executors edit only their files. Decks and diagram specs are rebuilt by
   one agent at the end, since builders often share a helper library.
4. Validate with a fresh agent: re-scan the whole tree, read a sample of
   rewritten paragraphs against `references/before-after.md`, and confirm in
   `git diff` that no line inside a code block, command, or identifier changed.

Route this through `lgtm-relay` when the sweep spans more than a handful of
files: Opus plans the partition, Sonnet executes per partition, Opus validates.

## Composing with other skills

| Skill | How they meet |
|-------|---------------|
| `lgtm-tutorial` | Owns chapter structure and the depth standard; this skill owns the sentence-level voice. Its "honest/lie" rule is rule 1 here. Run a scan before packaging an iteration. |
| `lgtm-presentation` | Owns layout, brand, and builders. This skill sets title/subtitle/bullet wording and what belongs on the slide body versus the notes. Rebuild the deck after a pass. |
| `lgtm-jekyll` | Site scaffolding. No overlap beyond page titles and card blurbs, which follow the title rules. |
| `lgtm-diagram-generator` | Label wording follows the diagram-label rules; regenerate both files of the pair after an edit. |
| `lgtm-relay` | Splits and validates large sweeps (see above). |
| `lgtm-caveman` | Unrelated: caveman compresses Claude's chat replies. This skill governs published content. Never apply caveman style to content. |

## Writing new content

Apply the rules while drafting, not only in a cleanup pass. Before handing a
chapter or deck back, run `scan.sh --tier ban` on the files you touched and
fix what it finds.

## References

- `references/phrase-list.md` — every scanned pattern, its tier, and its rewrite
- `references/before-after.md` — calibration examples from real cleanup commits
- `references/surfaces.md` — rules per surface: prose, titles, bullets, captions, notes, diagrams, glossary
- `scripts/scan.sh` — the scanner; takes one or more files and/or directories (`--help` for options)
- `scripts/patterns.tsv` — the pattern table; add project jargon in a separate file via `--patterns`
