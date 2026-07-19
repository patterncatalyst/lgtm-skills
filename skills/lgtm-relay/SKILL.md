---
name: lgtm-relay
description: "Three-phase model relay for non-trivial work: Opus plans, Sonnet 5 executes, Opus validates. Delegates each phase to a subagent with an explicit model override so the tier is guaranteed regardless of the session model, and gates on user review of the plan before any code is written. Use whenever a task is large enough to deserve a plan — multi-file changes, new features, refactors, migrations, scaffolding a project, authoring a chapter or deck — and ALWAYS when the user says 'ultracode' or 'ultraplan', or asks to 'use the relay', 'plan then build', 'plan with Opus and build with Sonnet', or 'validate that with Opus'. The other lgtm-* skills call into this one for their multi-step operations. Skip it for one-line edits, single-file tweaks, lookups, and conversational answers."
---

# LGTM Relay Skill

Route each phase of a task to the model tier that fits it. Opus is the expensive,
careful reasoner — use it where a wrong call is costly and hard to detect later
(planning, validation). Sonnet 5 is fast and strong at bounded, well-specified
work — use it where the plan already removed the ambiguity (execution).

The relay exists because the failure mode of one-model-does-everything is
asymmetric: a bad plan wastes the whole execution, and an unverified execution
ships a defect. Both ends deserve the stronger model. The middle usually doesn't.

## Tier map

| Phase | Model | Subagent | Job |
|-------|-------|----------|-----|
| 1. Plan | `opus` | `Plan` | Decompose, pick the approach, define acceptance criteria |
| 2. Execute | `sonnet` | `general-purpose` (or a skill-specific type) | Write the code/content to the plan |
| 3. Validate | `opus` | `general-purpose` | Adversarially check the result against the criteria |

## Why phases are delegated, not run inline

A skill cannot change the session model. Running the plan in the main loop gets
you whatever model the session happens to be on — Sonnet, Haiku, anything. So
**every phase goes through the `Agent` tool with an explicit `model` override**.
That is what makes the tier guaranteed rather than incidental.

Run the phase agents with `run_in_background: false`. Each phase's output is the
next phase's input; there is nothing to do while one is running.

## When to use

- Multi-file changes, new features, refactors, migrations.
- Scaffolding a project, site, deck, or stack from one of the other `lgtm-*` skills.
- Anything where "what should we build" is a real question, not a given.
- **Always** when the user invokes `ultracode` or `ultraplan` (see below).

## When not to use

Skip the relay — the overhead exceeds the benefit — for:

- One-line or single-file edits with an obvious shape.
- Lookups, explanations, and conversational answers.
- Mechanical find-and-replace where the plan would just restate the request.

Say you're skipping it and why, in one clause. Don't relay a typo fix.

---

## Phase 1 — Plan (Opus)

```
Agent(
  subagent_type: "Plan",
  model: "opus",
  run_in_background: false,
  prompt: <task + relevant file paths + constraints + "return the plan schema below">
)
```

Require the plan back in this shape — later phases depend on it:

- **Approach** — the chosen strategy and, in one line each, what was rejected and why.
- **Steps** — ordered, each naming the files it touches and whether it depends on a prior step.
- **Acceptance criteria** — checkable statements, not vibes. "`gen-catalog.py` lists 9 skills"
  not "the catalog is updated".
- **Risks** — what could silently go wrong, and how it would be detected.

### Gate on the plan

Show the user the approach, the steps, and the acceptance criteria before
execution starts. This is the cheapest possible point to correct course — a wrong
assumption caught here costs one plan, caught after execution it costs the whole
build. Proceed on approval, or on an explicit standing "don't ask me between
phases".

If the user is not present (scheduled run, autonomous loop), skip the gate,
proceed, and report the plan alongside the result.

## Phase 2 — Execute (Sonnet 5)

One agent per **independent** step. Send independent agents in a single message
so they run concurrently; chain dependent steps in sequence.

```
Agent(
  subagent_type: "general-purpose",
  model: "sonnet",
  run_in_background: false,
  prompt: <the step + its acceptance criteria + the file paths + "report what you
           changed and any criterion you could not meet">
)
```

Each executor gets the criteria for **its own step only**, plus whatever context
the step needs. Do not paste the whole plan into every agent — irrelevant steps
invite scope creep.

If two steps touch the same files, either sequence them or run them with
`isolation: "worktree"`. Parallel agents editing one file will clobber each other.

Executors report their own work; that report is a claim, not evidence. Phase 3
exists precisely because self-reported success is unreliable.

## Phase 3 — Validate (Opus)

```
Agent(
  subagent_type: "general-purpose",
  model: "opus",
  run_in_background: false,
  prompt: <"Verify this work against these acceptance criteria. Read the actual
           diff and run the checks — do not trust the executor's summary. For each
           criterion: met / not met / not checkable, with the evidence.">
)
```

Give the validator the criteria and the file paths — **not** the executor's
self-assessment, which only anchors it toward agreeing.

The validator should read the real diff, run the tests or build, and report per
criterion. "Looks right" is not a verdict.

### On failure

Feed the specific failures back to a Sonnet executor and re-validate. Cap at
**two** repair rounds — a third means the plan was wrong, not the execution.
Stop and take it back to the user, or to a fresh Phase 1 with what you learned.

Report failures faithfully. A criterion the validator could not check is
reported as unchecked, never as met.

---

## Nesting: subagents that spawn subagents

Default to a **flat relay**: the main loop orchestrates, phase agents do the work,
depth stops at one. Fan out *wider* at the top before you nest deeper — ten
parallel executors under the main loop are easier to steer, and cheaper to
re-run, than three executors each hiding their own private tree.

Nest only when a plan step is genuinely a sub-project — "build the whole
observability layer" — that deserves its own plan/execute/validate cycle. Then:

**1. Inheritance is the trap.** An `Agent` call that omits `model` inherits the
caller's model. A Sonnet executor that spawns its own validator without a
`model` override gets a *Sonnet* validator, and the relay's whole point quietly
evaporates. Every nested call states its tier explicitly:

```
# in the prompt you hand the sub-orchestrator:
"Spawn your validation agent with model: 'opus' explicitly.
 Do NOT omit the model parameter — omitting it inherits Sonnet from you."
```

**2. Pick a nesting-capable type.** `Plan` and `Explore` have no `Agent` tool and
cannot spawn anything. A step that needs to sub-delegate must run as
`general-purpose` (or `claude`).

**3. Promote the sub-orchestrator, don't demote the tier.** The agent that *plans
and delegates* a sub-project is doing planning work — give it `model: "opus"`
and let it spawn Sonnet executors beneath it. A Sonnet agent deciding how to
decompose a sub-project is the relay inverted.

```
main loop  ──▶  Plan (opus)
           ──▶  sub-orchestrator (opus, general-purpose)
                     ├─▶ executor (sonnet)   ← explicit model, every call
                     ├─▶ executor (sonnet)
                     └─▶ validator (opus)
           ──▶  Validate (opus)
```

**4. Cap depth at two.** Main loop → sub-orchestrator → executor. Past that you
have no visibility into what a grandchild is doing, its failures reach you
third-hand as summaries-of-summaries, and cost compounds silently. If the work
needs more depth than that, it needs a `Workflow` script instead — deterministic
phases beat deep improvised trees. Note `workflow()` itself nests only one level;
a workflow cannot call a workflow that calls a workflow.

**5. Contract the boundary.** A sub-orchestrator returns the same shape as any
executor: what it changed, per-criterion status, what it could not meet. It
absorbs its own repair rounds; it does not surface its internal churn upward. But
it must not *launder* failures either — an unmet criterion propagates up as unmet,
however many agents sat between it and you.

## ultracode and ultraplan

When the user invokes either, the relay is **mandatory**, not optional:

- **`ultraplan`** — the planning phase escalates: spawn several independent Opus
  planners with different framings (risk-first, simplest-thing-first,
  user-outcome-first), then have one more Opus pass judge them and synthesize a
  winner, grafting the best ideas from the runners-up. Execution and validation
  proceed as normal. Use it when the solution space is genuinely wide.

- **`ultracode`** — orchestration moves into a `Workflow` script (the user's
  "ultracode" is itself the opt-in that authorizes it). The tier map does not
  change; it moves onto `agent()` calls:

  ```js
  phase('Plan')
  const plan = await agent(planPrompt, {model: 'opus', schema: PLAN_SCHEMA})

  phase('Execute')                                    // pipeline, not parallel:
  const built = await pipeline(plan.steps,            // each step validates as
    s => agent(s.prompt, {model: 'sonnet', phase: 'Execute'}),
    (r, s) => agent(verifyPrompt(s), {model: 'opus', phase: 'Validate'}))
  ```

  Under `ultracode` the plan gate is dropped — the workflow runs unattended.
  Report the plan with the results instead.

## Use from the other lgtm-* skills

The content and infrastructure skills own *what* good output looks like; this
skill owns *how the work gets routed*. They compose:

| Skill | What the relay wraps |
|-------|----------------------|
| `lgtm-jekyll` | Scaffolding a site — plan the structure, build in parallel, validate nav/layout wiring. |
| `lgtm-tutorial` | Authoring a chapter + its runnable example; packaging an iteration. |
| `lgtm-presentation` | Deck outline (Opus) → slide construction (Sonnet) → brand/consistency pass (Opus). |
| `lgtm-podman-stack` / `lgtm-minikube-stack` | Component selection and wiring, then per-component setup, then a bring-up check. |
| `lgtm-diagram-generator` | Only for a *set* of diagrams that must stay uniform; a single figure doesn't need it. |
| `lgtm-git` | Not wrapped — git operations are single-step and already scripted. |

Two rules when composing:

1. **The other skill's conventions go in the prompt.** A Sonnet executor building
   a Jekyll chapter needs `lgtm-jekyll`'s structure rules in its prompt — a
   subagent does not inherit the parent's loaded skills.
2. **`lgtm-caveman` survives the relay.** If compressed style is on, it applies to
   what *you* report to the user. Subagent prompts stay explicit and normal — the
   style is for the human, and compressing an agent's instructions loses precision
   where it's most expensive.
