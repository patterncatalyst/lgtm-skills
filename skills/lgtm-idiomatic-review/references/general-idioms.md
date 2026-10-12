# General idioms (cross-cutting)

Stack-independent findings. These apply to any service code in the collection and
back up the per-stack checklists. Authority: the project's own conventions and
the scaffold skills.

## Don't reinvent the standard library or framework (reinvented)

Before accepting a hand-written utility, ask whether the language or framework
already ships it. Common reinventions in example code:

- A hand-rolled retry/backoff loop where the HTTP client, messaging library, or
  a resilience extension (SmallRye Fault Tolerance, tenacity) provides one.
- A custom JSON (de)serializer where the framework's mapper and a model/record
  already cover it.
- Manual environment parsing where a typed config object exists
  (`@ConfigProperty` / `@ConfigMapping`, a Pydantic `BaseSettings`).
- A bespoke date/UUID/base64/hashing helper that duplicates `java.time`,
  `java.util.UUID`, `datetime`, `uuid`, `hashlib`, or `base64`.
- A hand-written connection pool where the driver or framework pools already.

The fix is to delete the reinvention and call the built-in. If the built-in does
not quite fit, that is worth a one-line note explaining why, not a silent
reimplementation.

## Match the surrounding conventions (structure)

Idiomatic in a given project means "like the code already around it." Before
changing anything, read a neighboring, already-reviewed file and follow its
choices: injection style, error shape, naming, test layout, logging. A fix that
makes one file "more correct" but inconsistent with its ten siblings is churn.
Consistency across the example set is itself a teaching goal.

## One consistent error shape (structure)

Pick one error representation and use it everywhere. This collection standardizes
on RFC 9457 `application/problem+json`:

- Quarkus: one `@ServerExceptionMapper`/`ExceptionMapper` set producing a
  `ProblemDetail` body.
- FastAPI: `HTTPException` plus a registered handler producing the same shape.

Mixed error shapes — a plain string here, an ad hoc `{"error": ...}` dict there,
a `ProblemDetail` somewhere else — are a finding even when each one works. The
reader cannot tell which is the pattern to copy.

## Don't duplicate logic a shared harness already provides (reinvented)

Tutorial repos usually have a shared test harness, a `lib.sh`, a `verify.sh`, or
a common fixtures module. Code that re-implements wait-for-ready, container
startup, HTTP polling, or seed-data loading that the harness already exposes is a
reinvention. Call the shared helper. If the helper is missing a capability, add
it to the helper, do not fork it inline — this is the "create a shared utility"
rule, and it keeps a fix in one place.

## Keep behavior identical when fixing an idiom (procedure)

Every fix in this skill is behavior-preserving. Before committing a change,
confirm the inputs, outputs, status codes, serialized field names, ordering, and
any value a test or recorded transcript asserts on are unchanged. If the
idiomatic form would change any of these, it is a behavior change — escalate it
to the user as a separate decision rather than folding it into an idiom pass.
