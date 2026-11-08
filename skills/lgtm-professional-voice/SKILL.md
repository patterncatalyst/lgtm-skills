---
name: lgtm-professional-voice
description: "Voice pass for technical books, tutorial sites, workshops, slide decks, READMEs and speaker notes written for engineers. Write like the enterprise-integration-patterns-with-camel and cloud-native-design-patterns books: get to the point, show the code, say the trade-off, stop. Ships a scan script for banned tics (confessional and defensive phrasing, meta-narration, self-reference, generated-text tells, em dashes, leaked internal codes) with a CI gate. Use whenever the user says 'tone pass', 'voice pass', 'reword', 'too wordy', 'too philosophical', 'make it terse', 'tighten the prose', 'sounds artificial', 'sounds AI-written', 'review the wording', or asks to clean up a chapter, deck or workshop before release. Also use when drafting new content."
---

# Professional voice

Write like the two best books in the catalogue,
`enterprise-integration-patterns-with-camel` and `cloud-native-design-patterns`.
Open one of their chapters before drafting and match it. They state the
problem, define the pattern in one sentence, show the code, give the trade-offs
in a table or a short list, and stop.

The reader is a practising engineer. They read to get a fact, a mechanism or a
decision, and anything else costs them time.

## The model: Geewax

J.J. Geewax's *API Design Patterns* sets the sentence structure and tone: plain
declarative sentences, a concrete example before the abstraction, a motivating
problem before the mechanism, and trade-offs stated as trade-offs. When in
doubt, write the sentence a senior engineer would say in a design review.

## Write it this way

- **Get to the point.** Lead with the problem, then the answer. About 2,000
  words is the target for a chapter, and 2,500 the most. It's never a floor
  or a gate: a chapter that's complete in fewer words stays that way. Never pad
  to reach a length.
- **Code first.** A short listing beats a paragraph describing it. Prose adds
  what the code can't show: the problem, the choice, the trade-off.
- **Tables and short lists for comparisons**, parameters and "use it when".
- **At least one figure per chapter.** A diagram is better than a paragraph of
  walk-through.
- **Contractions**, varied sentence length, British or American spelling as the
  project sets.
- **Explain a term once**, in one clause, on first use.

## Cut these

- **Self-reference.** "The book", "this chapter", "the suite", "the example
  shows", "the test confirms". Say the fact. "VS Code and PyCharm both work,
  and the book never asks for an editor-only action" becomes "Use VS Code or
  PyCharm."
- **Test narration.** Don't name tests in prose and don't describe what a test
  asserts. The tests live in the example; the prose states the behaviour.
- **Code narration.** Don't follow a listing with a paragraph that re-describes
  it line by line.
- **Philosophy.** Sentences about "forces", "decisions" or "the design" that
  name no concrete thing. Sentences that narrate understanding ("it's noticing
  that…").
- **Confessional and defensive phrasing.** "Honest", "real X, not a toy",
  "genuinely", "deliberately". State the positive half.
- **Meta-narration and wind-ups.** "Here is the part that matters:", "Worth
  noting:", "Notice that…".
- **Filler and hedges.** "In order to", "actually", "really", "very", and
  trailing kickers that restate the sentence for rhythm.
- **Rhetorical triads** written for cadence. A real list of three stays.
- **Generated-text tells.** *Delve*, *seamless*, *leverage*, *load-bearing*,
  and every em dash (recast with a comma, colon or new sentence).
- **School framing.** "Capstone" (say "final project"), "homework", "simply",
  "easy".
- **Internal artifacts** in reader-facing text or figures: tracking codes, phase
  labels, `_plans/` paths, release markers, "the roadmap".
- **Issue-tracker writing.** No framework bug reports or workaround stories in
  chapters; state the technique as the design.

## Surfaces

| Surface | Rule |
| --- | --- |
| Slide title | 2 to 5 word noun phrase naming the concept; the claim goes in the subtitle. |
| Bullets | Bold the subject noun; one line, two at most. |
| Speaker notes | What the slide shows, then what to show. No delivery coaching. |
| Captions | `Figure N.x: <what it shows>`. |
| Diagram labels | Component and event names; no sentences in boxes. |
| Build, run, observe | The command, then one or two sentences on what the run shows. No pasted inventory of test names. |
| AI sidebar | `**Specifying <thing>.**`, one sentence on what a vague request leaves open, then a quoted prompt the reader can paste, naming the example's own types and the chapter's decisions, then one line on how to check the reply (the test command or what to look for). Never a description of what assistants tend to do. |

## Do not change

Code, inline code, commands, flags, file names, URLs, identifiers, recorded
output, quoted error messages, quoted third-party text, proper nouns, and
planning documents unless asked.

## Procedure

1. **Scan** for banned tics. The tree is read-only to the script:

   ```bash
   S=~/.claude/skills/lgtm-professional-voice/scripts/scan.sh
   $S --tier ban path/to/repo          # rewrite-by-default hits
   $S --hits all --tier ban path/to/repo
   $S --tier ban --fail .              # CI gate: exit 1 on any hit
   ```

   Scan the repo root, not only `_docs/`: landing pages and site chrome hold
   tics too. The full phrase list is in `references/phrase-list.md`.
2. **Read it aloud** next to a chapter of the Camel or cloud-native book. A
   sentence that would sound odd in a design review gets rewritten.
3. **Rewrite by deletion first.** The sentence without the tic is usually the
   sentence you want. Then read the paragraph for choppy fragments.
4. **Re-scan and rebuild** what the edit touched (deck, diagram, site), and look
   at the result.

Keep the process light: one writer, one pass, the scan at 0 ban-tier, the build
green. Don't add review rounds, waivers or invariant checks to a voice pass.
