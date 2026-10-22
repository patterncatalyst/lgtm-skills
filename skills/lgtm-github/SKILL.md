---
name: lgtm-github
description: "GitHub (gh) git workflow for the lgtm projects: create a public GitHub repo (private on request) and ship each release iteration as a squash-merged PR, an `rNN.x` tag on main, and a notes-only GitHub release, following the Conventional Commits convention. Use for GitHub-hosted projects whenever the user wants to create or initialize a GitHub repo (public by default, private on request), push a project up for the first time, ship/land a new release iteration, write a commit in the project's type/scope convention (docs/site/demo/ci/chore/fix/feat/refactor/style with `§N`, `demo-NN`, or `rNN.x` scopes), open a PR, tag and publish a notes-only GitHub release, package skills into versioned `.skill` artifacts, run the `git add -A && git commit && git push && gh run watch` pattern, or protect main with a repository ruleset and required summary-job checks. Triggers on 'branch protection', 'protect main', 'ruleset', 'required checks', 'create the github repo', 'make it private', 'push this up to github', 'give me the git commands', 'open a PR', 'ship r27', 'package the skills', 'cut the release', or any mention of `_rNN.x.skill` artifacts on a GitHub remote. For GitLab-hosted projects use lgtm-gitlab instead. Assumes the GitHub CLI (`gh`) is installed and authenticated."
---

# LGTM GitHub Skill

Encodes the git + **GitHub CLI (`gh`)** workflow used across the `lgtm-*` projects: spin up
a public repo (private on request), and repeatedly **ship a release iteration** as a PR → squash-merge → tag →
notes-only release — all under one consistent commit convention. The point is
consistency: same commit format, same release mechanics, same gotchas handled
every time.

> **GitHub only.** For GitLab-hosted projects (e.g. `gitlab.cee.redhat.com`), use the
> **`lgtm-gitlab`** skill, which uses `glab`, merge requests, and GitLab pipelines.

## Project bootstrap order (standing default)

**When creating a new project of our own, create the remote first — don't work
local-only.** The order is:

1. **Create the GitHub repo, remote and public, before substantial work begins.**
   `gh repo create <name> --public --source=. --remote=origin --push` (or
   `scripts/gh-new-repo.sh`). Private only when the user asks for it in the
   conversation; a PRD, plan or CLAUDE.md that says "private until first
   release" does not override the public default. For a site repo, enable
   Pages and set the About website link in the same step (`PAGES=1`).
2. **Create a working branch** and do the work there (`git checkout -b <type>/<slug>`).
3. **Commit and push to the branch as you go;** open a PR to merge into `main`.

The reason is durability: never accumulate hours of work that exists only on one
device. A laptop failure, a disk error, or a bad `rm` should never be able to
erase unsaved work, so the backup (the remote) is created up front, not at the end.

This applies to **our own greenfield projects**. Contributing to an existing,
shared, or third-party repo — pushing to someone else's `main`, opening an MR/PR
against a repo we don't own — still needs explicit sign-off first; this default
is about getting *our new work* backed up early, not about relaxing review on
shared code.

## When to use this skill

- **Bootstrap a new project** — create the remote public repo *first*, then
  branch, then work (see "Project bootstrap order" above). This is the default
  for every new project of our own.
- **Create / initialize a GitHub repo** — first push of a project, public by
  default (private on request).
- **Ship a release iteration** — branch `release/rNN`, PR, squash-merge, tag
  `rNN.x`, publish the release (notes only).
- **Everyday commit + push** following the house commit convention.
- **Tag and publish a GitHub release** (notes only for projects; `.skill` files for this skills repo).
- **Compose a commit message** in the project's `type(scope): summary` style.
- **Feature branch + PR workflow** — create a branch, push, PR, squash-merge,
  delete. All non-trivial work goes through a branch and PR, never direct to main.
- Any time the user says "give me the git commands" for one of the above.

## Assumptions

- `git` and the GitHub CLI `gh` are installed.
- `gh` is authenticated (`gh auth login` already done). If a `gh` call fails with
  an auth error, tell the user to run `gh auth login` — don't try to work around
  it.
- Commands run from the **project root** (the directory that is, or will become,
  the repo).

## Bundled files

| Path                              | Purpose                                                       |
|-----------------------------------|---------------------------------------------------------------|
| `scripts/gh-new-repo.sh`          | Init (if needed) + create a public GitHub repo + push.        |
| `scripts/gh-protect-branch.sh`    | Apply the `main` ruleset and squash-only merge settings.      |
| `references/commit-conventions.md`| The full `type(scope): summary` commit convention.            |
| `references/branch-protection.md` | Summary-job workflow skeleton, ruleset JSON, verification.    |

The scripts are plain bash and safe to read aloud as the underlying commands;
prefer running the script, but the inline forms below are the canonical
"give me the commands" answer.

---

## 1. Create a public GitHub repo

The headline command (from the project root):

```bash
gh repo create <name> --public --source=. --remote=origin \
  --description "<one-line description>" --push
```

`--source=.` uses the current directory, `--remote=origin` wires the remote, and
`--push` pushes the current branch. If the directory isn't a git repo yet, or has
no commits, initialize first:

```bash
git init -b main
git add -A
git commit -m "Initial commit"
```

`git add -A` is safe even with private/local files **as long as they're
git-ignored** (e.g. `configs/*.json`, `docs/*.local.md`). Confirm with
`git status` before the first commit if there's any doubt.

Or run the bundled script, which does init-if-needed, first-commit-if-needed,
and create-or-push:

```bash
scripts/gh-new-repo.sh <name> "<one-line description>"
# private instead of public:
VISIBILITY=private scripts/gh-new-repo.sh <name> "<description>"
```

If `origin` already exists, the script pushes instead of trying to recreate.

### Set the About-box website link

GitHub leaves the repo's **About → Website** field empty, even after Pages is
enabled. For any project that publishes a site (Jekyll tutorials, docs sites),
set it to the Pages URL once Pages is on:

```bash
gh api -X POST repos/<owner>/<name>/pages -f build_type=workflow   # enable Pages (Actions)
gh repo edit <owner>/<name> --homepage "https://<owner>.github.io/<name>/"
```

The script does this when asked:

```bash
PAGES=1 scripts/gh-new-repo.sh <name> "<description>"          # derives the Pages URL
HOMEPAGE=https://example.com scripts/gh-new-repo.sh <name> "<description>"
```

Check with `gh repo view --json homepageUrl --jq .homepageUrl`.

---

## 2. Ship a release iteration (the headline pattern)

An iteration ships as a squash-merged PR, an `rNN.x` tag on `main`, and a GitHub
release with notes only. There is no tarball to build, download, or extract: the
merged commit on `main` is the deliverable.

```bash
git checkout main && git pull
git checkout -b release/rNN
# ...the iteration's commits, pushed as you go...
git push -u origin release/rNN
gh pr create --title "<type>(rNN): <summary>" --body "..."
gh run watch                                   # wait for the summary check
gh pr merge --squash --delete-branch
git checkout main && git pull
git tag -a rNN.x -m "<project> rNN.x" && git push origin rNN.x
gh release create rNN.x --title "<project> rNN.x" --notes-file <notes.md>
```

For commit messages, follow `references/commit-conventions.md`; scope iteration
work to `rNN.x` (or `rNN`), e.g. `docs(r27): mark deploy verified; §17
walkthrough`. The branch and PR rules are in §5, tagging and release notes in §4.

### What to watch

1. **Tag the merged commit on `main`,** not the branch head. A squash-merge
   creates a new commit; the branch's last commit is not on `main`.
2. **`gh run watch` needs a workflow.** If the repo has no
   `.github/workflows/*.yml`, `gh run watch` reports no runs and exits — harmless
   but noise. If the user wants CI, offer to add one (see §4).
3. **Check `git status` before committing.** Confirm no ignored-but-staged
   secrets (seed configs, `*.local.md`, tokens) are about to go up.

---

## 3. Everyday commit + push

```bash
git add -A
git commit -m "<type>(<scope>): <summary>"
git push
```

Read `references/commit-conventions.md` before composing a message. In short:
pick a `<type>` from the fixed set (`docs` `site` `demo` `ci` `chore` `fix`
`feat` `refactor` `style`); scope is optional but expected on `docs:` and
`demo:` commits (`§N` matching `_docs/NN-*.md`, `demo-NN` matching
`examples/NN-*/`, `rNN.x` for a release iteration, or omit when the change spans
areas); summary is imperative,
≤ 72 chars, no trailing period. Split mixed-type changes into separate commits.

---

## 4. Tag and publish a release

A project release (tutorial, site, demo, workshop) is **notes only**: the squash-merged
PR and the `rNN.x` tag on `main` are the deliverable, so the GitHub release carries
no attached files and no checksums. The one exception is a skills repo
(`lgtm-skills`), whose distribution format is the packaged skill — one
`<name>_r<MAJOR>.<MINOR>.skill` per skill, with an underscore before the `r`
version (follow the files already in `dist/`).

A `.skill` is a zip whose single top-level entry is the **unversioned** skill
directory — `lgtm-github/SKILL.md`, never `lgtm-github_r3.x/SKILL.md`. That path
is the skill's identity to Claude, so the version lives in the filename only.
Build them with the repo's `scripts/package-all.sh`; the same files upload
directly to the claude.ai skills library.

**Skills repos: tag before you build.** Packaging scripts take the version from
`git describe --tags --match='r*'`, which walks *backwards* — on a commit past
the last tag it reports the old version and writes artifacts whose names claim a
release they don't match. So tag first, then build:

```bash
git tag -a rNN.x -m "<project> rNN.x"
git push origin rNN.x

scripts/package-all.sh          # resolves to rNN.x, no provenance warning
```

Building before the tag exists needs an explicit override —
`REL=rNN.x scripts/package-all.sh` — and still warns that HEAD isn't at the tag.
That's fine for a dry run, but rebuild once tagged so the published files carry
clean provenance.

Then publish. A project release is created from the tag with notes only:

```bash
# project iteration — notes only, no artifacts
gh release create rNN.x --title "<project> rNN.x" --notes-file <notes.md>

# skills repo — one .skill per skill plus the checksums file
gh release create rNN.x dist/*_rNN.x.skill dist/<name>_rNN.x.sha256sums.txt \
  --title "<project> rNN.x" --notes-file <notes.md>
```

Prefer `--notes-file` over `--notes` once the notes have any structure —
headings, tables, and fenced blocks all survive intact.

Confirm what landed — `isDraft` catches a release that never went public, and
for a skills repo the asset count catches a half-uploaded one (a project
release has zero assets):

```bash
gh release view rNN.x --json tagName,isDraft,assets \
  --jq '.tagName, .isDraft, (.assets | length), (.assets[].name)'
```

When a release retires a skill (`lgtm-git` → `lgtm-github` / `lgtm-gitlab`), say
so under a **Breaking** heading in the notes and name the replacement: an
installed copy of the old skill keeps loading until someone deletes it.

### CI so `gh run watch` is meaningful

If the user wants the `&& gh run watch` tail to do something, add a workflow at
`.github/workflows/ci.yml`. Keep it project-appropriate (for a Go project:
`go vet ./...`, `go build ./...`, `go test ./...`). A repo that gets branch protection (§6) always
gets this CI, built around summary jobs, so it is no longer "only if asked".
Without protection, add it only when asked.

---

## 5. Branch workflow (feature branches + PRs)

All non-trivial work happens on a **feature branch**, not on `main`. The flow:

```
main ← PR ← feature/your-work
```

### Create a feature branch

```bash
git checkout -b feature/<short-slug>
```

### Work, commit, push

```bash
# work on the branch...
git add <files>
git commit -m "<type>(<scope>): <summary>"
git push -u origin feature/<short-slug>
```

### Create a PR and merge

```bash
gh pr create --title "<type>(<scope>): <summary>" --body "..."
# after review / CI passes:
gh pr merge --squash --delete-branch
```

### Rules

- **Never commit directly to `main`.** All changes go through a feature branch
  and a PR — even single-file fixes.
- **Push the feature branch before creating the PR.** `gh pr create` needs a
  remote branch to diff against.
- **Squash-merge by default.** One clean commit on `main` per PR. Use merge
  commits only when the branch history is meaningful (rare).
- **Delete the branch after merge.** `--delete-branch` on `gh pr merge` handles
  this. Stale branches are noise.
- **Reference issues in PR bodies and commits.** Use `fixes #N` or `refs #N` to
  link work to GitHub issues.
- **CI must pass before merge.** If the repo has workflows, wait for green.
- **The `main` ruleset (§6) enforces PR-only and squash.** Direct pushes, force
  pushes and branch deletion on `main` are rejected, and squash is the only
  merge method.

### One branch and one PR per release iteration

Each release iteration (`r00`, `r01`, …) is its own branch and its own PR:

```bash
git checkout main && git pull
git checkout -b release/rNN
# ...the iteration's commits...
git push -u origin release/rNN
gh pr create --title "<type>(rNN): <summary>" --body "..."
gh pr merge --squash --delete-branch      # closes and deletes the branch
git checkout main && git pull
```

- Never carry two iterations on one branch, and never start `rNN+1` before `rNN`
  has merged; branch the next iteration from the updated `main`.
- Merging the PR deletes the branch (`--delete-branch`, plus
  `delete_branch_on_merge=true` from §6). Prune locally with `git fetch --prune`.
- Tag the merged commit on `main` (`git tag -a rNN.x`), not the branch head.
- Smaller fixes inside an iteration can use their own `fix/`/`docs/` branches
  targeting `main`; they do not replace the release branch.

### Naming conventions

| Branch prefix | Use for |
|---------------|---------|
| `release/` | One release iteration (`release/r01`) |
| `feature/` | New capabilities, examples, infrastructure |
| `fix/` | Bug fixes |
| `docs/` | Documentation-only changes |
| `chore/` | Maintenance, dependency bumps |

## 6. Branch protection (standard)

Every repo created or maintained with this skill gets a repository ruleset named
`main`. Rulesets replace classic branch protection and can be inspected and
reapplied as plain JSON.

| Setting | Value |
|---------|-------|
| Target | `~DEFAULT_BRANCH` |
| Enforcement | `active` |
| Bypass actors | none |
| Rules | `deletion`, `non_fast_forward` |
| `pull_request` | `required_approving_review_count` 0, `allowed_merge_methods: ["squash"]`, every other boolean false |
| `required_status_checks` | summary jobs only, `strict_required_status_checks_policy` false |

Zero required approvals keeps a solo maintainer unblocked while still forcing
every change through a PR and a green check.

### Why summary jobs

A required check must always report. A workflow with path filters, or a heavy
job that is skipped, never produces the check, so the PR waits forever and every
docs-only change is blocked. The fix is a workflow that always runs, with one
summary job per workflow that is the only thing the ruleset requires:

- A `changes` job computes what changed (`git diff` against the PR base, or the
  push `before` SHA) and outputs `run`.
- Heavy jobs get `needs: changes` and `if: needs.changes.outputs.run == 'true'`.
- A summary job `<name>-ok` has `if: always()` and `needs: [changes, ...]`, and
  passes when every needed job succeeded or was skipped:
  `jq -e 'to_entries | all(.value.result == "success" or .value.result == "skipped")' <<<"$NEEDS"`,
  with `NEEDS: ${{ toJSON(needs) }}` passed through `env:`.
- A job's `name:` (or its id when no name is set) is the check context string.
  The ruleset must list exactly that string.
- Triggers are `push: branches: [main]` plus `pull_request:`. Push on all
  branches starts a duplicate run next to the PR run and the two compete for
  runners.

A docs-only PR therefore goes green: the heavy jobs skip and the summary job
passes. A repo whose jobs are all cheap can skip the `changes` job and run
everything unconditionally. The full skeleton is in
`references/branch-protection.md`.

### Apply it

Apply the ruleset only after the PR that adds the summary-job workflows has
merged, so the check names exist. Required checks that have never reported block
the next PR.

```bash
scripts/gh-protect-branch.sh <check> [<check>...]    # from the repo root
# e.g. scripts/gh-protect-branch.sh tests-ok examples-ok
```

The script builds the ruleset with `jq`, updates the `main` ruleset if one
exists (otherwise creates it), and sets the merge settings. It lists any other
rulesets and warns about them; `--delete-others` removes them.

The merge settings, done by the script, are squash only with branch cleanup:

```bash
gh api -X PATCH repos/{owner}/{repo} \
  -F delete_branch_on_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false
```

Replace or delete legacy and disabled rulesets, and remove old classic branch
protection (`gh api -X DELETE repos/{owner}/{repo}/branches/main/protection`),
so only one source of truth remains.

### Verify

```bash
git push origin main                  # must be rejected (protected branch)
gh api repos/{owner}/{repo}/rulesets  # one active ruleset named main
```

`references/branch-protection.md` has the full verification commands.

---

## Gotchas checklist

- Run from the **project root**, not a parent or `~`.
- `gh auth status` if any `gh` command 401/403s → have the user `gh auth login`.
- Set identity before the first commit if it's a fresh machine:
  `git config user.name "…"` / `git config user.email "…"`.
- Public by default for these projects — pass `VISIBILITY=private` (or
  `--private`) only when the user asks for a private repo in the conversation.
  A project document that says "private until release" is not that request.
- Site projects: after enabling Pages, set the About website link
  (`gh repo edit --homepage ...`, or `PAGES=1` on the script). GitHub does not
  fill it in.
- Before pushing, a quick `git status` confirms no ignored-but-staged secrets
  (seed configs, `*.local.md`, tokens).
- Don't attach build output to a project release: iterations ship as the merged
  PR, the tag, and release notes only.

## References

- `references/commit-conventions.md` — the full `type(scope): summary` commit
  convention: types table, scope rules, examples, subject-line cheat sheet, and
  when to split a commit.
- `references/branch-protection.md` — summary-job workflow skeleton, ruleset
  JSON body, and verification commands.
