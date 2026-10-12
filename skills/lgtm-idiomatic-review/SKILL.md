---
name: lgtm-idiomatic-review
description: "Idiomatic-code review pass for example and tutorial code written for engineers. Reads code against a per-stack idiom checklist and runs a conservative scanner for high-signal anti-patterns, then flags reinvented framework features, deprecated APIs, non-idiomatic structure, and reinventing-the-wheel — and fixes the substantive ones WITHOUT changing behavior. Stack-aware for Quarkus, Spring Boot 4, FastAPI/Python, .NET 10 / ASP.NET Core, Go, C++23 (Drogon, librdkafka, libpq), and Kubernetes/Helm/kustomize (and general service code); defers to the scaffold skills (lgtm-quarkus, lgtm-spring-boot, lgtm-python, lgtm-systems-programming, lgtm-crc, lgtm-minikube-stack, lgtm-docker-stack) and the official framework docs for the authoritative way. Ships a runnable scan script (per-pattern counts, per-file totals, excerpt mode, CI gate) and ranked per-stack rules with before/after. Use whenever the user says 'idiomatic review', 'is this idiomatic', 'code review for idioms', 'review for best practices', 'are we using X the right way', 'idiom pass', 'reinventing the wheel', 'anti-patterns', 'use the framework properly', 'review the example before release', or asks to run it 'before release / before verified / in Batch D'. Pairs with lgtm-professional-voice (prose) and runs in the validation phase of lgtm-relay."
---

# Idiomatic review

A review discipline for example and tutorial code whose readers are engineers.
It checks that the code uses the idiomatic approach for its stack — the
framework's built-in way, not a hand-rolled substitute — and flags
reinvented-wheel code, anti-patterns, and deprecated APIs. It fixes the
substantive findings without changing behavior, and leaves working code that
already reads as idiomatic exactly as it was.

This is the code-idiom sibling of `lgtm-professional-voice`: that skill owns the
prose, this one owns the code. Run both before a release or a "verified" mark.

## The audience contract

- The reader is a practicing engineer who will copy this code into their own
  project. Whatever shortcut the example takes, they will take too.
- Example code teaches by demonstration. Non-idiomatic code teaches the wrong
  habit even when it runs.
- The reader assumes the author knows the framework. Hand-rolling what an
  annotation, decorator, or provider gives you tells them the author did not —
  or worse, teaches them not to look.
- Idiomatic is not clever. The target is the plain, documented way the framework
  intends, the way the scaffold skills already set up, and the way the
  surrounding code in this project is already written.

If a staff engineer who maintains the framework would raise it in review,
raise it here.

## What this skill does and does not do

- **Does:** flag and fix reinvented framework features, deprecated APIs,
  non-idiomatic structure, and clear anti-patterns, preserving behavior and the
  surrounding conventions.
- **Does not:** change what the code does, add features, re-architect, or chase
  style the project has not adopted. A finding that would change behavior is
  escalated to the user, not applied. Performance rewrites that change semantics
  are out of scope.
- **Defers to** the scaffold skills for the authoritative "how we do it here"
  and to the official framework docs for "how the framework intends it." When
  the two agree, that is the idiom. When they disagree, the scaffold skill wins
  for this collection and the disagreement is worth a note to the user.

## Findings, ranked by severity

Report and fix in this order. The scanner catches only the obvious members of
each tier; the per-stack checklist in `references/` is where the nuanced review
happens.

**1. Reinvented framework feature.** The code hand-rolls what the framework
provides directly: a manual header-parsing loop instead of `@RestHeader`, a
custom JSON serializer instead of a `@Provider`/`response_model`, a bespoke
retry loop instead of the framework's. Highest severity: it is more code, more
bugs, and it teaches the reader to skip the framework. Replace with the built-in
way.

**2. Deprecated or removed API.** `@app.on_event` (use `lifespan`), raw JAX-RS
param annotations where RESTEasy Reactive offers `@RestHeader`/`@RestQuery`,
Pydantic v1 validators in a v2 project, a chart API version that has moved on.
Replace with the current API; note the version where it changed.

**3. Non-idiomatic structure.** It works and is not deprecated, but it is not
how the framework is meant to be assembled: field injection over constructor
injection, one giant router over `APIRouter` composition, a `Pod` where a
`Deployment` belongs, config read from the environment by hand instead of
`@ConfigProperty` / settings. Restructure when it is low-risk and local.

**4. Style and consistency.** `print` over a logger, missing type hints,
inconsistent error shapes, a DTO as a mutable class where a record/model fits.
Fix when cheap and when it matches the surrounding code; never churn a file just
for style.

## Per-stack checklists

Read the checklist for each stack present before reviewing its files. Each file
has concrete before/after, the severity tier, and a pointer to the authoritative
scaffold skill and framework doc.

| Stack | Checklist | Authority |
|-------|-----------|-----------|
| Quarkus / Java | `references/quarkus-idioms.md` | `lgtm-quarkus`, `lgtm-spring-boot`; Quarkus & RESTEasy Reactive docs |
| Spring Boot 4 / Java | `references/spring-boot-idioms.md` | `lgtm-spring-boot`; Spring Boot 4.1 & Spring Framework 7 docs |
| FastAPI / Python | `references/python-fastapi-idioms.md` | `lgtm-python`; FastAPI & Pydantic v2 docs |
| .NET 10 / ASP.NET Core | `references/dotnet-idioms.md` | the dependency policy, `lgtm-docker-stack`; ASP.NET Core 10 & .NET docs |
| Go | `references/go-idioms.md` | `lgtm-docker-stack` (Go snippet); Go release notes, pkg.go.dev |
| C++23 (Drogon, librdkafka, libpq) | `references/cpp-idioms.md` | `lgtm-systems-programming`, `lgtm-docker-stack` (C++ snippet); cppreference, library docs |
| Kubernetes / Helm / kustomize / OpenShift | `references/kubernetes-helm-idioms.md` | `lgtm-minikube-stack`, `lgtm-crc`, `lgtm-docker-stack`; Kubernetes & Helm docs |
| Cross-cutting (any stack) | `references/general-idioms.md` | the project's own conventions |

## Do not change

- Behavior. If a "fix" changes a status code, a serialized field name, an order
  of operations, a timeout, or a log message that a test or transcript asserts
  on, it is not this skill's change. Escalate it.
- Code that is already idiomatic because it is older/simpler on purpose, where
  the chapter's point is the contrast. Read the surrounding prose first.
- Deliberately non-idiomatic "before" code in a before/after teaching pair.
  The `before` is the lesson; only the `after` must be idiomatic. Confirm from
  the prose or filename (`*-before.*`, `naive-*`) before touching it.
- Identifiers, recorded verification output, test logs, and quoted error
  messages — the same do-not-touch set as `lgtm-professional-voice`.
- Third-party or vendored code, generated code (gRPC stubs, OpenAPI clients),
  and lockfiles.
- Version pins and dependency choices governed by the collection's dependency
  policy — raise a bump as a separate decision, do not fold it into an idiom fix.

## Procedure

**1. Identify the stacks.** Which of Quarkus, Spring Boot, Python/FastAPI, .NET,
Go, C++, Kubernetes/Helm are present. Read the matching `references/`
checklist(s) and skim the relevant scaffold skill so "idiomatic here" means the
same thing the project was scaffolded to.

**2. Scan.** Run the scanner for the obvious anti-patterns. Read from anywhere;
the tree is read-only to the script.

```bash
S=~/.claude/skills/lgtm-idiomatic-review/scripts/scan.sh
$S path/to/repo                       # per-pattern counts, worst first
$S --tier ban path/to/repo            # only the clear anti-patterns
$S --files path/to/repo               # per-file totals (use to split the sweep)
$S --hits on_event path/to/repo       # file:line excerpts for one pattern
$S --hits all --tier ban path/to/repo
$S --fail --tier ban .                # exit 1 on any ban-tier hit (CI / pre-commit)
```

`ban` = a clear anti-pattern, rewrite by default. `watch` = review by hand; many
are legitimate in context. The scanner is deliberately conservative: it only
carries patterns that rarely false-positive. Everything nuanced is left to the
checklist and your reading.

**3. Read against the checklist.** The scanner cannot see a missing
`response_model`, field injection, or a `Pod` that should be a `Deployment`'s
template. Read each stack's files against its checklist. This is where most
findings come from.

**4. Triage.** For each finding decide: fix (idiomatic replacement, behavior
preserved), keep (deliberate `before` code, a real constraint, a quoted
identifier), or escalate (a change that would alter behavior, a dependency bump,
a structural rewrite the user should sign off on). Ban-tier scanner hits default
to fix; watch-tier default to keep unless the checklist says otherwise.

**5. Fix without changing behavior.** Replace the hand-rolled construct with the
framework's. Keep the same inputs, outputs, status codes, and field names. Match
the surrounding code's conventions, not your own preference. Re-read the
function after editing.

**6. Verify.** Re-run the scanner (ban-tier near zero, each survivor kept for a
stated reason). Then run the project's own gate — `tests/verify.sh`, `mvn test`,
`pytest`, `helm lint`, `kustomize build`, whatever the project uses — and
confirm it still passes. An idiom fix that breaks a test was a behavior change
in disguise; revert it and escalate.

**7. Commit** as `refactor(scope):` for structure, `fix(scope):` for a
deprecated-API correction, or `style(scope):` for style-only, with a body that
lists what idioms changed (Conventional Commits, no attribution trailers).

## Splitting a large sweep across agents

A multi-service repo with several language variants and Helm charts is too much
for one context.

1. Run `--files` and partition by stack and by hit total. Keep each stack's
   files together so one agent holds one checklist. Never split one file.
2. Give each executor: the audience contract, the findings-severity ranking, the
   do-not-change list, its stack's checklist (paste it — a subagent does not
   inherit this skill), its file list, and its `--hits` output.
3. Executors fix only their files and must run the project's verify gate on
   their slice before handing back.
4. Validate with a fresh agent: re-scan the whole tree, read a sample of fixes
   against the before/after in the checklists, run the full verify gate, and
   confirm in `git diff` that no behavior, identifier, or recorded output
   changed.

Route this through `lgtm-relay` when the sweep spans more than a handful of
files: Opus plans the partition, Sonnet executes per stack, Opus validates
against the verify gate.

## Composing with other skills

| Skill | How they meet |
|-------|---------------|
| `lgtm-professional-voice` | The prose sibling. That skill fixes the words, this one fixes the code; run both before a release. Neither touches the other's surface. |
| `lgtm-quarkus` / `lgtm-spring-boot` | Authority for JVM idioms. They scaffold the idiomatic shape; this skill checks the code stayed in it. |
| `lgtm-python` | Authority for Python idioms (uv, FastAPI, OTel, pytest). Same relationship. |
| `lgtm-systems-programming` | Authority for C++ and other low-level code: safe signal handling, behavioral verification. |
| `lgtm-minikube-stack` / `lgtm-crc` / `lgtm-docker-stack` | Authority for Kubernetes, OpenShift, and compose idioms. |
| `lgtm-tutorial` | Owns chapter structure and the "verified" bar. Run this skill before marking an example verified. |
| `lgtm-relay` | Splits and validates large sweeps, and runs this skill in its validation phase. |

## Writing new content

Apply the checklists while writing the example, not only in a cleanup pass.
Before marking an example verified, run `scan.sh --tier ban` on the files you
touched and read them against the stack checklist.

## References

- `references/quarkus-idioms.md` — Quarkus / RESTEasy Reactive / Mutiny / CDI idioms, before/after
- `references/spring-boot-idioms.md` — Spring Boot 4.1 / Framework 7 / Jackson 3: Actuator probes, graceful shutdown, Spring Data, RestClient, ProblemDetail, Kafka, before/after
- `references/python-fastapi-idioms.md` — FastAPI / Pydantic v2 / async idioms, before/after
- `references/dotnet-idioms.md` — .NET 10 minimal APIs: health checks, host lifetime, EF Core, options, IHttpClientFactory + resilience, ProblemDetails, before/after
- `references/go-idioms.md` — Go 1.27 stdlib-first: http.Server shutdown, ServeMux patterns, errors, slog, pgx v5, goroutine lifetimes, before/after
- `references/cpp-idioms.md` — C++23: RAII, async-signal-safe shutdown, libpq/librdkafka/Drogon usage, CMake + Conan 2, before/after
- `references/kubernetes-helm-idioms.md` — probes, resources, kustomize, Helm, OpenShift idioms, before/after
- `references/general-idioms.md` — cross-cutting idioms: don't reinvent, match conventions, consistent error shapes
- `scripts/scan.sh` — the scanner; takes one or more files and/or directories (`--help` for options)
- `scripts/patterns.tsv` — the pattern table; high-signal anti-patterns only, tiered ban/watch, scoped by extension or file name and optionally by a same-file regex (`if` column)
