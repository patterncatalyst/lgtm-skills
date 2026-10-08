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

## Defensive contrast and emphasis

| Before | After |
|--------|-------|
| sub: "Nine capabilities, each demonstrated by a real endpoint or route already running in this reactor — not a toy snippet." | sub: "Each capability runs as an endpoint or route in this build." |
| title: "Nine capabilities, nine real services" | title: "Nine capabilities demonstrated" |
| "order-service IS this picture" | "order-service is this picture" |
| "Panache: the entity IS the repository" | "Panache: the entity is the repository" |
| "inventory-service answers the SAME stock table through two execution models" | "inventory-service answers the same stock table through two execution models" |
| "…exercised under genuine concurrent load, not just asserted in prose" | "…under concurrent load" |
| "the four principles map onto Kubernetes primitives unusually cleanly — cleanly enough that it stops feeling like a translation exercise and starts feeling like the primitives were waiting for it" | "the four principles map onto Kubernetes primitives cleanly, so implementing a mesh on Kubernetes is less a translation exercise than a direct fit" |

## School framing and environment nouns

| Before | After |
|--------|-------|
| title: "The capstone — a data mesh on minikube" | title: "Full project example: a data mesh on Kubernetes" |
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
