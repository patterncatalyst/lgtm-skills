# Per-surface rules

Each surface has a different reader and a different time budget. A chapter
paragraph gets read. A slide gets a glance while someone is talking. A diagram
label gets half a glance.

## Prose (chapters, READMEs, appendices)

- Open a chapter or section with the concrete failure the thing prevents, then
  a one-line definition, then cover it. That framing is substance, not
  warm-up: the reader needs the problem a pattern solves before the mechanics,
  or the mechanics have nothing to attach to. What to cut is empty
  throat-clearing ("names follow us everywhere") and abstract framing ("the
  forces it resolves"), not the problem. Pattern content follows the terse
  pattern register in SKILL.md.
- Explain through code callouts, not re-narration. Keep a listing small and key
  the explanation to `#A`/`#B` callouts; do not follow it with a paragraph that
  re-describes each identifier. The code shows the mechanism; the prose adds only
  what the code can't show.
- Don't reference a concept you have not introduced. If a sentence leans on an
  idea ("the bug the pattern avoids"), that idea has to appear earlier, or the
  reference comes out.
- Length serves the point. A word-count floor is a target, not a gate: stop when
  the section is complete, never pad to a number, and never cut substance to fit
  under one.
- Explain a subtle mechanism by example first: a few lines of real code (or a
  tiny before/after) that make the gotcha visible, then the rule behind it. A
  short snippet beats paragraphs describing the same behavior.
- Close a chapter by paying off the learning objectives: a short "what you can do
  now" list, each item naming a capability and the concrete artifact that
  delivered it (the class, the test, the decision). Not a chapter summary.
- One idea per sentence. Split any sentence with two em dashes or a
  semicolon-and-dash combination.
- Enumerations of four or more parallel items go in a list or table, not a
  comma run.
- Explain a concept the first time it appears, in one clause, then use it:
  "`Uni<T>`, Mutiny's lazy single-value type". Do not explain it twice.
- Use the general noun in explanation ("Kubernetes", "the message broker") and
  the literal name in instructions ("run `minikube addons enable registry`").
- Cross-reference by section name or number, never "the roadmap", "the PRD",
  or a `_plans/` path.
- Limits and gaps are facts. Write them as facts ("Not built yet: lineage
  ingestion"), not as confessions ("to be honest, we haven't…").

## Slide titles

- Title: a noun phrase naming the concept, 2–5 words, no trailing period.
  **gRPC typed contracts**, **Contract evolution**, **Event-driven autoscaling**.
- Subtitle: the claim or qualifier, sentence case, under ~8 words.
  *Generated at build time.*
- Never a file name, script name, or command as the title. Put it in an 8pt
  footnote at the bottom of the slide as a reference.
- Never a synthetic parallel construction ("Nine capabilities, nine real
  services", "One query, two protocols, zero glue"). Say what the slide shows.
- Section dividers: section name plus one plain subtitle. No promise
  ("…not a toy snippet").

## Bullets

- Bold the subject noun at the start: **graphql-gateway** resolves `order` over
  REST and `stock` over gRPC.
- One line each where possible; two at most. A bullet that needs three lines is
  a speaker note.
- Leave visible spacing between bullets (paragraph spacing, not a blank bullet).
- Parallel grammar within a list: all fragments or all sentences.
- Any term a capable engineer from a neighboring stack might not know (Uni,
  Panache, KEDA ScaledObject) gets a clause of explanation in the bullet or a
  glossary entry, not nothing.
- No sub-bullet that only restates the parent.

## Captions

- `Figure N.x: <what the figure shows>`. A noun phrase, not a sentence about
  the figure ("This figure illustrates…").
- The caption states what to read off the figure if it is not obvious, in one
  sentence: "Each arrow is a Kafka topic; dashed arrows are planned."
- Alt text describes the content for a reader who cannot see it; the caption
  interprets it. They are different strings.

## Speaker notes

Notes are for the presenter, so they can be denser and more direct than slides.
They are also the place for what was cut from the slide body.

- Lead with what the slide shows, then "What to show:" for a demo slide, then
  the fallback if the demo fails.
- Logistics (infra tier, fallback transcript, timing) go here, never on the
  slide body.
- No coaching of the presenter's delivery ("pause here for effect", "the thing
  to land"). If a point matters, the note states the point.
- Same voice rules as prose. Notes get exported and read.

## Diagram labels

- Box labels: the component's real name, then at most one short detail line.
- Arrow labels: the protocol or the event name (`gRPC CheckStock`,
  `order.placed`), not a description of the arrow.
- Title and subtitle follow the slide-title rules.
- No sentences inside boxes. A note band carries at most three short lines.
- When a label changes, regenerate both the SVG and the `.excalidraw` from the
  spec (`lgtm-diagram-generator`); never hand-edit one of the pair.

## Glossary

- **Term**: definition in one sentence, two at most. Bold the term, plain
  definition.
- Define by what the thing does in this system, then the general meaning if it
  differs.
- Link to the chapter where the term matters; do not restate the chapter.
- Alphabetical. No paragraph-length entries; a term that needs a paragraph
  needs a section.

  > **Data product**: A dataset a domain team publishes for other teams, with
  > an owner, a schema contract, and an SLA.

## Demo-script narration

Echoed narration in `demo-*.sh` is reader-facing (attendees watch it scroll).
Same rules as speaker notes. Comments in the script are developer-facing:
they can be terser, but no tracking codes and no confessional register.

## Build / run / observe (hands-on chapters)

The reader is about to run something. Tell them what it proves before they run
it, so they can watch it happen, not just read that it passed.

- Open with what the run demonstrates and why, tied to the chapter's claims
  ("both forms run the steps in the same order, and both produce the same
  result"). Not "the example is standalone-testable from its own directory",
  which says nothing about what happens or why.
- Then the command, then what each test or group shows, as a short list, each
  item naming the claim it proves. Not one dumped paragraph listing every case.
- Name the check that proves the chapter's core guarantee as such.
- Keep the recorded output verbatim; the prose around it interprets it.

## AI sidebar (the per-chapter callout for working with an LLM)

The sidebar turns the chapter's knowledge into leverage over the tool the reader
actually uses (Claude, ChatGPT). State the problem, then hand them a prompt they
can paste. The model is the "🤖 Explore with your agent" box in the CRC tutorial
(`openshift-local-on-fedora` ch05): a short problem, a ready-to-run prompt,
nothing more.

- State the problem in one or two sentences: what you get if you aren't specific.
  "Ask for a new country and the model returns a subclass, because that's how
  most examples are written; when the rules are three functions, that's a file
  you don't need."
- Give a ready-to-run sample prompt, as a nested `>` quote, that bakes the
  chapter's decision rule in, so the reader pastes it and gets the right form.
- Close with at most one line of review action ("if the reply is a subclass with
  no reason given, ask for the value form"). No editorializing, no second essay.
- Mention the model's default tendency only as the reason to steer, in a clause.
- One `<blockquote class="ai-sidebar" markdown="1">` per pattern chapter.

## Site chrome (footer, homepage, part index, stubs)

- Footer columns link to reader content only: outline, bibliography, the
  reference sites, the repository and its issue tracker.
- No "Build & iteration plan", "Coverage matrix" or roadmap links, and no
  "see the roadmap for which iteration delivers it" in stubs. A stub says the
  chapter has not shipped yet; nothing more.
- No iteration labels (`r01`, `S7`, "Wave B") or step numbers on the homepage,
  part-index cards or the examples index.
- `_plans/` stays in the repository for the build, rendered nowhere:
  `plans: { output: false }`.

## Framework behaviour (rule 13)

| Write this | Not this |
|---|---|
| "Introspection is turned off with graphql-java's `Introspection.enabledJvmWide(false)`." | "SmallRye's `no-introspection` leaves `__type` answering, so we…" |
| "Both stacks answer 200; the draft recommends 4xx here, so clients read the body." | "Quarkus breaks the draft's mandatory status rule." |
| "SmallRye batches per field; Strawberry shares one loader per key." | "SmallRye can't share a loader across fields." |
| "The translator gives both refusals the contract's messages." | "Quarkus security exceptions come back as `\"message\": null`." |
