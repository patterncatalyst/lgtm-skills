# Commit message convention

This project uses **Conventional Commits** with a small fixed set of types.
PRs should match the convention; CI doesn't enforce it (yet) but reviewers will
ask you to amend if it doesn't.

## Format

```
<type>(<scope>): <short summary>

<optional body, wrap at 72 chars>

<optional trailers, e.g. Fixes: #123>
```

- **`<type>`** — from the table below.
- **`<scope>`** — optional, but **expected on `docs:` and `demo:` commits**. Use
  `§0…§15` for section work matching the `_docs/NN-*.md` files, `demo-NN` for
  example work matching `examples/NN-*/` directories, `rNN.x` (or `rNN`) for
  release-iteration work matching the `name_rNN.x.tar.gz` artifact and `rNN.x`
  tag, or omit when the change spans many areas with no single focus.
- **`<short summary>`** — one line, imperative mood, ≤ 72 chars, no trailing
  period.
- **body** — optional but encouraged for anything beyond a typo fix. Wrap at
  72 chars.

## Types

| Type        | When to use                                                                                   |
|-------------|-----------------------------------------------------------------------------------------------|
| `docs:`     | Tutorial prose under `_docs/`, README, PRD, plan updates                                       |
| `site:`     | Jekyll layouts, includes, CSS, page structure under `_layouts/` `_includes/` `assets/`         |
| `demo:`     | Anything inside `examples/NN-*/` (manifests, helm values, `demo.sh`)                            |
| `ci:`       | `.github/workflows/`, helper scripts and test scripts under `scripts/`                          |
| `chore:`    | Routine maintenance (dependency bumps, `.gitignore`, file moves, iteration archive housekeeping)|
| `fix:`      | Bug fix in any of the above; always pair with the scope of the bug                             |
| `feat:`     | New capability; always pair with the scope where it lands                                       |
| `refactor:` | Reorganization without behaviour change                                                         |
| `style:`    | Formatting only, no logic change                                                               |

## Examples

```
docs(§6): expand kubectl section with imperative dry-run patterns
fix(demo-06): NodePort service-type missing in deployment manifest
site: align card grid to three columns on viewports >= 1024px
chore: archive r03 — §1 prerequisites + iteration plan
docs(r27): mark OpenMetadata deploy verified; §17 deploy walkthrough
feat(demo-12): KEDA HTTP add-on demo with hey-driven scaling
```

## Subject-line cheat sheet

- "Add", "Drop", "Rename", "Move" — imperative verbs are right.
- "Added", "Dropped" — past tense is wrong; reword.
- "Updates docs" — vague; say what about the docs.
- "WIP" — fine on a feature branch, but squash before merge.

## When to split a commit

Each commit should leave the tree in a working state. If a single change touches
multiple types (e.g. you fixed a demo bug and expanded the prose around it),
prefer two commits:

```
fix(demo-09): chart values missing serviceAccount block
docs(§9): explain why minikube needs the serviceAccount override
```

over a single mixed-type commit. The exception: when the doc change explains the
fix and they share rationale; then bundle them and say so in the body.

## Release-sync commits

When landing a downloaded `name_rNN.x.tar.gz` build (see SKILL.md §2), **scope the
commit to the release iteration** — `rNN.x`, or `rNN` for iteration-wide work —
and summarize what landed:

```
docs(r27): mark deploy verified; §17 walkthrough; CAP-022 secret wiring
chore(r3.1): archive prior iteration; bump pinned deps
```

If the synced change is concentrated in one section or demo, you may scope it
there instead (`docs(§17): …`, `fix(demo-06): …`).
