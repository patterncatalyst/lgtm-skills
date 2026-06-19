# Chapter template & depth standard

## Skeleton

```markdown
---
title: "Chapter title"
order: NN
part: Part name                   # MUST equal a _parts part_name exactly
description: "One or two sentences. Quote the whole value if it contains a colon."
duration: 30 minutes
---

<One-paragraph hook: what this chapter builds and the one new idea it teaches,
in continuity with the previous chapter.>

The code is in `examples/NN-name/`. The run script there builds/sets up and
runs it; its `README.md` covers what it does and how to drive it.

{% raw %}{% include excalidraw.html file="diagram-name" alt="…" caption="Figure NN.1 — …" %}{% endraw %}

## <Concept section(s)>
<Explain the mechanism / trade-off the chapter is about. Prose, with small
focused code excerpts where they clarify.>

## How the code works
<THE DEPTH STANDARD — see below.>

## Build, run, observe
```bash
cd examples/NN-name && ./demo.sh
```
<What to run; what output/behavior to expect; where to see the result.>

## Cross-check (optional but encouraged)
<Run an independent tool or method beside the reader's build and explain why
agreement confirms correctness. Skip only when no independent check exists.>

## What you learned
- <2–4 bullets: the new mechanic, the key call(s)/decision(s), the trade-off.>

<One-sentence teaser of the next chapter (by name; no roadmap link).>

---

*Verification status: <span class="status status--unverified">unverified</span>.
<The highest-risk things to confirm on a real run.>*
```

## The depth standard (the important part)

The goal of every hands-on chapter is that a reader could **write the code
themselves**. So the "How the code works" section walks the *real* code and
explains what it is doing, call by call — not "here's what it does, run it." For
each chapter, cover the equivalents of:

1. **The data structures and why each one.** Show the real declarations. Explain
   the *choice* — why this collection/type/abstraction and not another, what
   each one is responsible for, and how they fit together.
2. **The core logic, in full.** Not stubs. Walk each meaningful call or step and
   say *why* it is there: what its arguments mean, what it returns, what
   invariant or constraint it satisfies, and what would go wrong if it were
   omitted or done differently.
3. **The wiring / entry point, in full.** How the pieces are loaded, configured,
   connected, and driven — the setup calls, the main loop or handler, the
   inputs and outputs, and any framework/library calls that make it run.
4. **Document, don't hide, the fragile bits.** Hardcoded values, simplifying
   assumptions, ordering/format conventions, environment requirements — call
   them out plainly and point to the chapter (by name) that addresses them
   properly, if any.

The test of the section: a reader who has never seen this code could retype it
and understand every line, not just paste and run it.

### A worked fragment (illustrative, language-neutral)

```text
// Two structures, two jobs:
//   PENDING  — keyed by request id, holds in-flight state so we can
//              correlate the start of work with its completion.
//   RESULTS  — an append-only buffer of completed records to report.
```

Then prose at the right level: "We key `PENDING` by request id because that id
is unique per in-flight request, so it lets us match a completion back to the
start that produced it; we stash the start there and report nothing until the
completion arrives, at which point we move the finished record into `RESULTS`."
— that sentence-by-sentence *why* is the level of explanation every important
line gets. Swap in the real types, calls, and constraints for your stack; keep
the explanatory depth.
