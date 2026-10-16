---
name: lgtm-issue-reporting
description: "Report a bug or a gap to an upstream open-source project in the house format: prove it on a clean minimal app, re-run it on the current release line, the next line's beta and a locally built `main`, search for duplicates, publish a reproducer module whose test asserts the expected behaviour (red today, green when fixed) with passing control tests, then write an issue body with fixed sections (Describe the bug, Reproducer, Expected behavior, Variants tried, Suggested fix, Workaround, Environment) and file it only after the user says so. Covers Maven/Quarkus and Python/pytest reproducer layouts, the version-override switches, the duplicate-search script, and how to link the filed issue back into the project that hit the bug. Use whenever the user says 'file an issue', 'report this upstream', 'open a bug on <project>', 'write up the issue', 'draft the upstream issue', 'make a reproducer', 'is this a framework bug', 'check the beta/main before we file', or when a workaround for a third-party library bug is about to land in project code."
---

# Upstream issue reporting

A maintainer reads an issue with one question: can I see this fail in five minutes? Everything here
serves that. A report is a claim; the reproducer is the evidence. The format below is the one
used for smallrye/smallrye-graphql#2733 and #2734. Keep it, so every report from these projects
reads the same way and is just as easy to act on.

## The non-negotiables

1. **Prove it outside your project.** Write a fresh, minimal app that has only the library under test and
   one class. Never use a copy of the project that hit the bug: its customizations are suspects too. If it
   doesn't fail in the minimal app, it isn't an upstream bug yet.
2. **Re-run it before you call it current.** Test at least:
   - the release line the project pins;
   - the next line's latest published pre-release, if there is one;
   - `main`, built locally from source.

   A bug that only exists on an old line is a version bump, not an issue. Check the published
   artifacts (Maven Central, PyPI), not just the GitHub release page, because tags often get
   there before artifacts do.
3. **Search for duplicates first.** Run `scripts/find-duplicates.sh <owner/repo> "<term>" …` with
   the error text, the API name and the feature name. If an open issue covers the same ground,
   don't open a parallel one. Either comment on it with your reproducer, or file a narrower issue
   that links it and says what it adds (see "Related issues" below).
4. **The reproducer asserts the expected behaviour.** Its bug tests fail today and pass once the
   bug is fixed. Every module also has at least one control test that passes today, to show the
   app is wired correctly and the failure is the bug and not the setup.
5. **Every claim in the body is observed.**
   - Quote output byte for byte from your own runs.
   - Cite source lines (`File.java:164–167` on `main` at a named commit) only after reading them.
   - Label anything a teammate or subagent observed but you didn't re-run as such, or re-run it.
6. **File only when the user says so.** Opening an issue, creating a public repo and pushing are all
   outward-facing. Draft everything locally, show the user the title and the gist, then publish on
   their go-ahead.

## Workflow

1. **Minimal app.** Use a scratch directory (`mktemp -d` or the session scratchpad). Use the
   project's pinned versions and the newest stable build tool. Write one class that exhibits the
   bug and one control that doesn't.
2. **Observe.** Run it, and record the requests and responses (or test output) exactly. When
   something doesn't fire, find out why before you blame the library. For example, a framework
   event that is off by default, such as SmallRye's `quarkus.smallrye-graphql.events.enabled`,
   looks exactly like a bug until you enable it.
3. **Read the source.** Find the lines responsible on `main` and quote them with paths and line
   numbers. The cause and the suggested fix come from this step, not from a guess.
4. **Version matrix.**
   - Re-run on the pinned line and on the next pre-release line.
   - Build `main` locally: install only the modules you need, skip tests and the format and lint
     plugins, and pin the snapshot over the BOM. The Maven layout in
     `references/reproducer-layouts.md` has a ready profile for this.
   - Record the commit, and how far it is from the latest tag (`gh api repos/O/R/compare/TAG...SHA`).
5. **Duplicates.** Run `scripts/find-duplicates.sh`, and read any open hit in full, comments
   included.
6. **Reproducer repo.**
   - Create one public repo per upstream project, holding many modules: `<owner>/<project>-reproducers`.
   - Add one module per bug, named after the symptom (`id-list-argument`, not `bug1`).
   - The README table maps each module to its bug and to its issue link (`_link added after filing_` until then).
   - Also include the run commands for every line in the matrix, the expected red/green counts, the
     inline symptom, and the license (match the upstream project's, e.g. Apache-2.0).
   - Use `clean` in every documented command, so switching lines never reuses stale classes.
7. **Issue body.**
   - Fill in `references/issue-template.md`. Keep the title as a single factual sentence: the
     symptom and its effect, with no "bug:" prefix and no adjectives.
   - Store the draft as `<project>/_plans/upstream/<slug>.md`, or wherever the project keeps plans,
     so it survives the session. Put the title on line 1 as `**Title:** …`, and derive
     `<slug>.body.md` (everything after line 1) for `--body-file`.
8. **Gate.** Show the user the title, the gist, the related issues and what will become public
   (repo, push, issue). Wait for a yes.
9. **Publish, in this order:**
   1. Create the repo and push it (`gh repo create … --public --source . --push`).
   2. Re-check the documented commands against a clean build.
   3. File the issue: `gh issue create -R O/R --title "…" --body-file <slug>.body.md`.
   4. Put the issue link into the reproducer README and push again.
   5. Confirm with `gh issue view`.
10. **Link back.**
   - In the project that hit the bug, link the issue wherever the workaround is explained (the
     README and code comments), and record the issue number in the project's plan or resume notes.
   - Add a removal note: when the issue is fixed, delete the workaround and re-verify.

## The body, section by section

The full skeleton is in `references/issue-template.md`.

| Section | What goes in it |
|---|---|
| **Describe the bug** | Two to five sentences: what the user does, what the library promises (schema, docs, spec), and what happens instead. Then the cause, if you read the source, with file and line. If the library's own docs or tests use the failing pattern, link them; that ends the debate over whether it should work. |
| **Reproducer** | A link to the module first, then the `git clone` and `mvn clean verify -pl <module>` (or `pytest`) lines for each line in the matrix, then the exact red/green counts, then the same code inline so the issue stands alone. |
| **Expected behavior** | Bullets, each one a test assertion stated in prose. |
| **Variants tried** | Optional. A table of declaration, result, and which run produced it. This cuts off "did you try X?" round trips. |
| **Suggested fix** | Optional, and only from reading the source. Name the method and the call that is missing. |
| **Workaround** | What an application can do today, or "None inside <project>" with what applications have to do instead. |
| **Environment** | A table: project version, framework version, engine version, and a row each for the pre-release and `main` at `<sha>`. Then JDK or Python, OS and run mode. End with `Related: #NNN` if anything relates. |

## Related issues

When an open issue already covers the area:

- **Same symptom, nothing to add** → comment on it with the reproducer link and your version matrix. Don't open a new issue.
- **A narrower, enabling fix that the broad request also needs** → file it. Open the body by naming the
  broad issue and saying what this one adds, for example: "This is narrower than #2321: forwarding the
  extensions would let applications use graphql-java's existing support today". End the Environment
  section with `Related: #NNN`.

## Tone

Use the register of `lgtm-professional-voice`: peer to peer, factual, no apologies, no "I think it might
possibly be". Don't call a design wrong. Show the behaviour and the contract it misses. Thank people in
follow-up comments, not in the report.

## Scripts and references

- `scripts/find-duplicates.sh <owner/repo> <term>…` searches open and closed issues for each term and
  prints `#N state title`, so you can scan for duplicates before drafting.
- `references/issue-template.md` is the body skeleton, with placeholders.
- `references/reproducer-layouts.md` covers the Maven/Quarkus multi-module layout (parent POM, version
  overrides, a snapshot-pinning profile, the `@QuarkusTest` pattern) and a Python/pytest layout (uv,
  versions pinned through `uv run --with`, a test-file pattern).
