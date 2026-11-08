# Before and after

Real rewrites from the sibling repositories, plus the cases the user flagged
by hand on the datamesh-quarkus 201 deck. Use them to calibrate: the target is
the "after" column, not something more formal than it.

Sources:

- `datamesh-reference-arch-quarkus` f24ab09, *docs: professionalize the decks
  and site for an engineering audience*. 153 files, chapters, both decks,
  READMEs, demo narration.
- `datamesh-reference-arch-python` 9c9f752, *remove "honest" phrasing*.
- User review of the datamesh-quarkus 201 deck, October 2026.

Most "after" cells are quoted from the commits. Where the committed text
still carried a tic, or the case came from the deck review, the cell shows the
rewrite this skill prescribes.

## Confessional register

| Before | After |
|--------|-------|
| "The honest slide. Not every organization needs a mesh." | "This is the fitness slide. Not every organization needs a mesh." |
| "And the honest caveat: the mesh earns its complexity in organizations with many domains…" | "An important caveat: the mesh pays off in organizations with many domains…" |
| eyebrow: "An honest caveat" | eyebrow: "Choosing a pattern" |
| "This reactor does not build that catalog yet. That's worth stating plainly rather than gesturing at a diagram that implies otherwise." | "This project does not build that catalog yet. This is a current limitation, not something a diagram leaves implied." |
| "Figure 4.2 is honest about drawing ⑤–⑧ as the target shape of federated governance, not a claim about code that runs today." | "Figure 4.2 marks ⑤–⑧ as the target shape, not code that runs today." |
| "mTLS for free from the service mesh" | "mTLS provided by the service mesh" |
| "…idempotency and exception propagation, not saga compensation — stated plainly rather than implied." | "…idempotency and exception propagation, not saga compensation." |

## Meta-narration

| Before | After |
|--------|-------|
| "Before any commands, it's worth being precise about what a data mesh actually is — because the term gets attached to a lot of things it isn't. This chapter is a working grounding in the idea and its four principles, enough to make the rest of the tutorial make sense." | "This chapter defines what a data mesh is, precisely, since the term gets attached to a lot of things it isn't, and works through the four principles it rests on." |
| "The analogy that lands hardest is microservices. The parallel is worth taking seriously rather than treating as a slogan." | "The closest analogy is microservices." |
| "One distinction underlies everything and is worth stating plainly, because blurring it is itself a common mistake." | "One distinction underlies everything, and blurring it is a common mistake." |
| "Design decision worth noticing: the push happens AFTER the transaction commits." | "The push happens after the transaction commits." |
| "The thing to land: the domain services were NOT changed to support GraphQL." | "The domain services were not changed to support GraphQL." |
| sub: "…policy — the vocabulary the rest of this deck uses by name." | sub: "…policy." |

## Editorial padding and rhetorical flourish

User review of the gRPC HTTP/3 blog post, October 2026. A sentence that is
strong until a trailing kicker pads it for rhythm, or a lead-in that
throat-clears before the content.

| Before | After |
|--------|-------|
| "Then it builds a demo that proves exactly what it can prove and not one inch more." | "then builds a demo that keeps the two transports strictly separate." |
| "This is head-of-line blocking, and the thing worth naming precisely is that it is a transport-level block." | "This is head-of-line blocking, and it is a transport-level block." |
| "All three are real improvements. Notice what they have in common: every one is a fix for something TCP got wrong." | "All three are real improvements, and every one fixes something TCP got wrong." |
| "One more discipline is worth copying. QUIC rides on UDP, and UDP is blocked between containers…" | "QUIC rides on UDP, and UDP is blocked between containers…" |
| "When it runs, it says exactly what it did, and refuses to claim more:" | "When it runs, it reports what it did and names what it did not do:" |

## Defensive contrast and emphasis

| Before | After |
|--------|-------|
| sub: "Nine capabilities, each demonstrated by a real endpoint or route already running in this reactor — not a toy snippet." | sub: "Each capability runs as an endpoint or route in this build." |
| title: "Nine capabilities, nine real services" | title: "Nine capabilities demonstrated" |
| "order-service IS this picture" | "order-service is this picture" |
| "Panache: the entity IS the repository" | "Panache: the entity is the repository" |
| "inventory-service answers the SAME stock table through two execution models" | "inventory-service answers the same stock table through two execution models" |
| "…exercised under genuine concurrent load, not just asserted in prose" | "…under concurrent load" |
| "The code shown here is real, pinned to the `r1.0` tag: [`Caddyfile`](…), …" (source footer) | "The files shown here: [`Caddyfile`](…), …" (the pinned ref stays in the link URL) |
| "the four principles map onto Kubernetes primitives unusually cleanly — cleanly enough that it stops feeling like a translation exercise and starts feeling like the primitives were waiting for it" | "the four principles map onto Kubernetes primitives cleanly, so implementing a mesh on Kubernetes is less a translation exercise than a direct fit" |

## School framing and environment nouns

| Before | After |
|--------|-------|
| title: "The capstone — a data mesh on minikube" | title: "Final project: a data mesh on Kubernetes" |
| "a learning reactor", "a teaching cluster" | "a reference project", "a local cluster" |
| `capstone.order.v1` (Avro namespace), `02-capstone-data-mesh.svg` | unchanged: identifiers |
| "a minikube substrate" in an architecture explanation | "a Kubernetes cluster"; `minikube addons enable registry` in a command stays |

## Slide structure

| Before | After |
|--------|-------|
| title: "demo-grpc.sh — a typed contract, generated at build time" | title: **gRPC typed contracts**; subtitle: *Generated at build time*; footnote (8pt): `demos/demo-grpc.sh` |
| A "Presenter cue · infra tier · fallback" block on the slide body | Moved to speaker notes under "What to show:" |
| Slide titled "Key design decisions" listing internal decision IDs | Cut from the deck; the decisions live in the docs site |
| Comma-run enumeration of six parts in one paragraph | A table or a list, one part per row |
| "Reactive: the gRPC handler, a Uni<CheckStockResponse>…" with no explanation of Uni | One clause: "Uni, Mutiny's single-value async type, so the handler returns before the lookup completes" |

## Internal leakage

| Before | After |
|--------|-------|
| "(CAP-003 per-service ownership)" in a README | "(each service owns its own schema)" |
| "`_plans/reconciliation.md` tracks where the two diverge" | "A reconciliation document tracks where the two diverge" |
| "this reactor's own planning notes track catalog work — the OpenMetadata ingestion and lineage demos — as not yet started" | "The OpenMetadata ingestion and lineage work is planned but not yet built here." |

## Sermon and self-validation

User review of `csharp-design-patterns` chapter 12 (Template Method), November
2026. Prose that narrates the act of understanding, or rates its own point,
instead of stating the fact.

| Before | After |
|--------|-------|
| "the reason matters precisely because it recurs anywhere a record carries a collection behind an interface type" | "the reason shows up anywhere a record carries a collection behind an interface type" |
| "The fix is not a smarter assertion on the whole record; it's recognizing that a record's default equality and a collection-aware assertion library answer different questions, and picking the one whose comparison matches the claim…" | "So the test compares fields, not whole records. Default record equality asks whether the members are the same objects. `Assert.Equal` on two sequences asks whether the elements match. The parity test claims the two forms produce the same field values, so it uses the check that compares values." |
| "So the test compares fields, not whole records, and that's the right call." | "So the test compares fields, not whole records." |
| "the test suite proves that guarantee for each form rather than taking it on faith" | "the test suite checks each one" |
| "the delegate form never asks the type system to mint a new class for data that is, in every sense that matters here, a configuration value" | "the delegate form never asks the type system to mint a new class for what is really a configuration value" |
| "the comparison here is which one costs less for a specific shape of variation, not which is newer or more fashionable" | (cut; state the comparison and stop) |

## Problem before mechanism

The section described what the code was and how it behaved, with no statement of
the problem the pattern prevents. Lead with the domain failure, then the
one-line definition. Terse-register pairs: `terse-register.md`.

| Before | After |
|--------|-------|
| "Why this matters" opening straight into the customs example ("A customs declaration for an international shipment goes through the same three moves…") with no definition | "Every country's customs declaration goes through the same three moves, and a new country must not reorder them. **Template Method** fixes the order of the steps in one place and lets the content of each step vary." (the failure, then the definition, then the example) |
| section lead: "`CustomsDeclarationBuilder` is an abstract class with exactly one public member, `Build`, and three protected abstract members…" | "The inheritance form puts the sequence in a base class and makes it unreachable from below. That is where the pattern's one guarantee lives: no subclass, now or later, can change the order." (then the class) |

## Code callouts over re-narration

A paragraph re-listing in prose what a figure and the code already show. Trim to
one concrete case plus a pointer to the figure.

| Before | After |
|--------|-------|
| A paragraph spelling out all three countries' fields, formulas, and thresholds in full prose | "`UnitedStatesDeclarationBuilder`, for one, requires an Importer of Record and an HTS code, charges 2.5 percent of declared value, and flags a shipment once its value exceeds 2500.00 USD. Germany and Japan differ only in their fields, formulas, and thresholds, which Figure 12.2 lays out side by side." |
| code block followed by a paragraph re-describing the constructor, the method, and each abstract member | the same block with `#A`/`#B` callouts, one short line per callout, and the paragraph removed |

## Build / run / observe

| Before | After |
|--------|-------|
| "The example is standalone-testable from its own directory, with no container in the loop:" then a single paragraph listing every test case | "The chapter makes two claims: both forms run the steps in the same fixed order, and both produce the same declaration for the same shipment. The suite lets you watch those hold rather than trust the prose." then the command, then a three-item list, each tying a test group to the claim it proves |

## AI sidebar

The sidebar states the problem, then hands the reader a prompt to paste. Model:
the "🤖 Explore with your agent" box in the CRC tutorial (ch05).

| Before | After |
|--------|-------|
| "Asked to add a new country, a generated answer often reaches for a new sealed subclass… a model defaults to inheritance by habit. Check a generated subclass against the four reasons…" (describes the AI, then a checklist) | A one-line problem, then a ready-to-run prompt: "Add Canada to the customs declarations. Use a `DeclarationSteps` value on `CountrySteps` rather than a new subclass, unless Canada's rules need shared base behavior, state across steps, or a type something else pattern-matches on. If you use a subclass, say which." then one review line. |
| "Put this chapter's decision rule in the prompt, not just in the review…" (prose prompt-then-review, still editorializing) | same problem plus the quoted sample prompt above; drop the essay |

## Explaining a mechanism by example

`csharp-design-patterns` ch12, November 2026. A subtle rule (a record's generated
equality uses reference equality for an interface-typed collection member)
explained in four dense paragraphs. Lead with a minimal illustration instead.

| Before | After |
|--------|-------|
| Four paragraphs of prose: "`EqualityComparer<IReadOnlyList<string>>.Default` falls back to reference equality on whatever array or list backs the interface reference… two different array instances behind the same interface type…" | A 4-line snippet first: two `string[]` with the same contents, `a == b` is `false`, `a.SequenceEqual(b)` is `true`. Then: "the record's generated `Equals` uses the first check; xUnit's `Assert.Equal` on two sequences uses the second." |

## Closing on the objective payoff

The chapter stated five learning objectives at the top and ended on the
bibliography, never confirming the reader reached them.

| Before | After |
|--------|-------|
| (no closing section; chapter ends on "For deeper coverage") | a **Where this leaves you** list: "You can now: write the inheritance form (`CustomsDeclarationBuilder`'s non-virtual `Build` + three abstract steps); write the delegate form (`DeclarationSteps` + `DeclarationEngine.Build`); add a country as a value and name the trade; explain why the parity test compares fields, not whole records." Each item names the capability and the artifact, not a summary. |
