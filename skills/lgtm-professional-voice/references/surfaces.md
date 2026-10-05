# Per-surface rules

Each surface has a different reader and a different time budget. A chapter
paragraph gets read. A slide gets a glance while someone is talking. A diagram
label gets half a glance.

## Prose (chapters, READMEs, appendices)

- Open a chapter with what it covers in one sentence, then start covering it.
  No warm-up paragraph about why the topic matters.
- One idea per sentence. Split any sentence with two em dashes or a
  semicolon-and-dash combination.
- Enumerations of four or more parallel items go in a list or table, not a
  comma run.
- Explain a concept the first time it appears, in one clause, then use it:
  "`Uni<T>`, Mutiny's lazy single-value type". Do not explain it twice.
- Use the general noun in explanation ("Kubernetes", "the message broker") and
  the literal name in instructions ("run `minikube tunnel`").
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

- `Figure N.x — <what the figure shows>`. A noun phrase, not a sentence about
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

- **Term** — definition in one sentence, two at most. Bold the term, plain
  definition.
- Define by what the thing does in this system, then the general meaning if it
  differs.
- Link to the chapter where the term matters; do not restate the chapter.
- Alphabetical. No paragraph-length entries; a term that needs a paragraph
  needs a section.

  > **Data product** — A dataset a domain team publishes for other teams, with
  > an owner, a schema contract, and an SLA.

## Demo-script narration

Echoed narration in `demo-*.sh` is reader-facing (attendees watch it scroll).
Same rules as speaker notes. Comments in the script are developer-facing:
they can be terser, but no tracking codes and no confessional register.
