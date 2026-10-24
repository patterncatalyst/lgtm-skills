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
assume a mistake, and give the reason. This includes "the code shown here is
real" in a source-credit footer: readers assume the code is real, so asserting
it raises the doubt. Link the files and move on. The pinned tag, ref, branch, or
commit belongs in the link URL, not restated in prose ("pinned to the `r1.0`
tag:" → just the linked file names).

**3. No meta-narration.** The text talks about the subject, not about itself.
"Design decision worth noticing: the push happens after the commit" → "The
push happens after the commit." Cut "the thing to land", "worth stating", "the
vocabulary the rest of this deck uses by name", "this slide walks through".

**4. No school framing.** Readers are professionals, not students.
"capstone" → "final project". "homework" → "exercise". Cut "simply",
"obviously", "easy", "don't worry".

**5. Titles name the concept.** No file names, no synthetic parallel
constructions.
"demo-grpc.sh — a typed contract, generated at build time" → title **gRPC
typed contracts**, subtitle *Generated at build time*, `demo-grpc.sh` as an
8pt footnote.
"Nine capabilities, nine real services" → "Nine capabilities demonstrated".

**6. General nouns in explanation, literal names in instructions.**
"the minikube substrate" → "the Kubernetes cluster". `minikube addons enable registry` in a
command stays.

**7. No generated-text tells.** *load-bearing*, *earns its place*, *delve*,
*seamless*, *leverage*, any em dash (see rule 12), "isn't X — it's Y" used as a reflex.
Each one alone is harmless. Together they mark the text as machine-written,
and engineers stop trusting it.

**8. No emphasis by typography.** ALL-CAPS words (NOT, IS, SAME, AFTER) and
exclamation marks go. Put the important word at the end of the sentence.

**9. Cut hedges, filler, and rhetorical padding.** Two failures. Single-word
hedges: "in order to" → "to", "somewhat slower" → "12% slower"; delete
"actually", "really", "very" unless the sentence breaks without them. And
phrase-level flourish that adds cadence or emphasis but no fact: a sentence can
be strong right up to a trailing kicker that only restates it for rhythm.
"proves exactly what it can prove and not one inch more" → "proves what it can".
Cut "and not one bit more", "full stop", "plain and simple", "make no mistake",
wind-ups like "Here is the part that matters:" and "the thing worth naming
precisely is that", connective throat-clearing like "Notice what they have in
common" and "One more discipline is worth copying", and anthropomorphic
flourishes ("the probe refuses to claim more"). Test: delete the clause or
lead-in; if the sentence loses no fact, it was padding. Do not pad a paragraph
or a sentence to reach a length; every clause must carry a fact, a mechanism, or
a decision, not just sound writerly.

**10. Internal artifacts stay internal.** Tracking codes (`DRQ-006`, `CAP-003`),
phase labels, `_plans/` paths, and "the roadmap" do not appear in
reader-facing text. State the decision itself.

**11. Explain once, then use.** Every non-obvious term gets one clause on first
use: "`Uni<T>`, Mutiny's lazy single-value type". Not zero, not two.

**12. No em dashes; structure beats run-ons.** Zero tolerance: never use `—`.
Where one joins a clause, recast with a comma, colon, semicolon, parentheses,
or a new sentence. In a figure caption the dash becomes a colon
(`Figure N.x: …`), keeping the number and title text. Four or more parallel items become a
list or table.

**15. Never use the rule of three.** No rhetorical triads or three-part
parallel cadence written for rhythm ("find it, understand it, and depend on
it"; "its own storage, its own API, its own contract"; "absolutely, totally,
completely"). A genuine factual enumeration that really has three items stays
(the three data-mesh structural pieces, an eight-item checklist). A triad built
for cadence gets cut to the one or two items that carry a fact. Tooling can't
detect this reliably; it is a read-aloud judgment.

**13. A tutorial is not an issue tracker.** Reader-facing text teaches the
technique; it does not report on the tools. Framework defects, "limitations",
upstream issue numbers, "reported upstream", workaround and spike narratives
("we tried X, it failed, so Y"), bypass and before/after attack stories, and
anything that reads as a security finding stay out of chapters, READMEs, code
comments, figure labels and test messages. State the technique as the design:
"the schema observer gives the argument the contract's type `[ID!]!`", not
"`@Id` fails at run time, so we patch the schema". Differences between two
stacks are teaching material; state them neutrally, never as one stack's bug.
Spec conformance stays as what the spec recommends and what the stack answers,
without "breaks", "violates" or "deviates". Bugs go upstream through
`lgtm-issue-reporting`; security findings go through the vendor's private
channel and never into prose.

**14. Site chrome is reader-facing.** The footer, homepage, part-index pages,
"coming soon" stubs and the examples index link only to reader content:
outline, chapters, examples, bibliography. No links to the iteration plan,
coverage matrix, glossary-as-plan or roadmap; no iteration labels or sequence
numbers. Keep the plans collection unrendered (`output: false` in
`_config.yml`), so an unlinked `/plans/...` URL cannot expose internal notes.

## House voice: write it this way

Removing tics leaves clean prose. These positives make it teachable and
followable. The model is J.J. Geewax's *API Design Patterns* for sentence
structure and tone, and Ibryam & Huß's *Kubernetes Patterns* for vocabulary and
precision. Draft new content this way, not just cleanup passes.

- **Example-first.** Lead a concept with a concrete thing in the project the
  reader can point at (a service, an endpoint, a method, a command), then name
  the abstraction. Not the reverse.
- **Before/after code pairs.** For a design decision that lives in code, show a
  naive first cut, then the correct version, with `#A`/`#B` callouts explaining
  why the order or the change matters. Only where the chapter already has that
  code; invent no APIs.
- **Contractions.** Write *it's*, *doesn't*, *isn't*, *can't*. The expanded
  forms read as stiff machine prose.
- **Vary sentence length.** Mix short sentences with longer ones; a short one
  after a long one lands the point. Uniform cadence reads as generated.
- **"And" and "But" can start a sentence** when it keeps the thread. Natural,
  not an error.
- **Natural transitions only.** A pointer to the next section is fine when it
  carries content. A formulaic one-liner between every section is padding; cut
  it.
- **Exact vocabulary.** Precise nouns, inline identifiers, few adjectives, no
  intensifier stacks. An everyday analogy can help a concept land, but the
  technical terms stay exact.
- **Bullets vary.** Don't give every bullet the same length and shape; that
  symmetry reads as filler. Lead each with its own fact.

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
| Captions | `Figure N.x: <what it shows>`. Not "This figure illustrates…". |
| Diagram labels | Component names and protocol/event names. No sentences in boxes. |
| Glossary | **Term**: one-sentence definition. No walls of text. |

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

**1b. Measure the house voice.** The patterns catch tics; they cannot see the
positives in "House voice" above. Run the measurements and read for them:

```bash
$S --stats path/to/repo         # per file: contractions, sentence-length spread, triads, em dashes
$S --stats-hits path/to/file.md # file:line for each expanded form and triad candidate
```

A file flagged `stiff: few contractions` gets its negations and "it is" forms
contracted where the sentence allows (keep "is not" where the stress is the point).
`uniform sentence length` means a p10-p90 spread under 10 words across 20+
sentences: break up the cadence. `check triads` lists candidates only; a list of
three real things (three languages, three percentiles) stays, a three-beat phrase
written for rhythm goes (rule 15). Then read each section against the house voice:
does it open on a concrete thing in the project before the abstraction (example
first), do before/after code pairs carry `#A`/`#B` callouts, and are the bullets
varied rather than symmetrical? Report the `--stats` table before and after.

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

**4b. Sweep the site chrome** (rule 14) as its own pass: `_includes/footer.html`,
`index.html`, `_layouts/part_index.html` and any stub layout, `_parts/*`,
`_example_pages/index.md`, `_docs/00-outline.md`, and the planned-chapter stubs.
Check `_config.yml` keeps `plans` at `output: false`, then build the site and
confirm no `/plans/` page or link exists in the output
(`grep -rl '/plans/' _site`).

**5. Commit** as `docs(site):` / `docs(deck):` / `docs:` with a body that
lists the categories changed (Conventional Commits, no attribution trailers).

## Splitting a large sweep across agents

A full site plus two decks is too much for one context.

1. Run `--files` and partition the list into roughly equal hit totals. Never
   split one file between two agents. Typical split: chapters 00–07, 08–15,
   16–21 + appendices, each deck builder alone, READMEs + demo narration.
2. Give each executor: the audience contract, the ranked rules, the house-voice
   section (paste it; the Geewax model), the do-not-change list, its file list,
   its `--hits` output and its `--stats-hits` output. A subagent
   does not inherit this skill. Paste the rules in.
3. Executors edit only their files. Decks and diagram specs are rebuilt by
   one agent at the end, since builders often share a helper library.
4. Validate with a fresh agent: re-scan the whole tree, compare the `--stats`
   table before and after, read a sample of rewritten paragraphs against
   `references/before-after.md` and the house-voice section, and confirm in
   `git diff` that no line inside a code block, command, or identifier changed.

Route this through `lgtm-relay` when the sweep spans more than a handful of
files: Opus plans the partition, Sonnet executes per partition, Opus validates.

## Composing with other skills

| Skill | How they meet |
|-------|---------------|
| `lgtm-tutorial` | Owns chapter structure and the depth standard; this skill owns the sentence-level voice. Its "honest/lie" rule is rule 1 here. Run a scan before releasing an iteration. |
| `lgtm-presentation` | Owns layout, brand, and builders. This skill sets title/subtitle/bullet wording and what belongs on the slide body versus the notes. Rebuild the deck after a pass. |
| `lgtm-jekyll` | Site scaffolding. No overlap beyond page titles and card blurbs, which follow the title rules. |
| `lgtm-diagram-generator` | Label wording follows the diagram-label rules; regenerate both files of the pair after an edit. |
| `lgtm-relay` | Splits and validates large sweeps (see above). |
| `lgtm-caveman` | Unrelated: caveman compresses Claude's chat replies. This skill governs published content. Never apply caveman style to content. |

## Writing new content

Apply the rules and the house voice while drafting, not only in a cleanup pass.
Before handing a chapter or deck back, run `scan.sh --tier ban` and
`scan.sh --stats` on the files you touched and fix what they find: a new chapter
should not come back `stiff` or with an em dash.

## References

- `references/phrase-list.md`: every scanned pattern, its tier, and its rewrite
- `references/before-after.md`: calibration examples from real cleanup commits
- `references/surfaces.md`: rules per surface: prose, titles, bullets, captions, notes, diagrams, glossary
- `scripts/scan.sh`: the scanner; takes one or more files and/or directories (`--help` for options)
- `scripts/patterns.tsv`: the pattern table; add project jargon in a separate file via `--patterns`
- `scripts/voice_stats.py`: the `--stats` measurements (contractions, sentence-length spread, triad candidates, em dashes)
