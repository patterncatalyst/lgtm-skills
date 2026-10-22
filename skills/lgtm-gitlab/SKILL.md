---
name: lgtm-gitlab
description: "GitLab (glab) git workflow for the lgtm projects: create a private GitLab project (including under groups/subgroups such as gitlab.cee.redhat.com/lightwell/...) and ship each release iteration as a squash-merged MR, an `rNN.x` tag on main, and a notes-only GitLab release, following the Conventional Commits convention. Use for GitLab-hosted projects whenever the user wants to create or initialize a GitLab project (especially private or in a subgroup), push a project up for the first time, ship/land a new release iteration, write a commit in the project's type/scope convention (docs/site/demo/ci/chore/fix/feat/refactor/style with `§N`, `demo-NN`, or `rNN.x` scopes), open a merge request (MR), tag and publish a notes-only GitLab release, or run the `git add -A && git commit && git push && glab ci status` pattern. Triggers on 'create the gitlab project', 'make it private', 'push this up to gitlab', 'give me the git commands', 'open an MR', 'create a merge request', 'ship r27', or a `gitlab.cee.redhat.com` remote. For GitHub-hosted projects use lgtm-github instead. Assumes the GitLab CLI (`glab`) is installed and authenticated."
---

# LGTM GitLab Skill

Encodes the git + **GitLab CLI (`glab`)** workflow used across the `lgtm-*` projects: spin up
a private project (including in **groups/subgroups**), and repeatedly **ship a release
iteration** as an MR → squash-merge → tag → notes-only release — all under one consistent
commit convention. The point is consistency: same commit format, same release mechanics, same
gotchas handled every time.

> **GitLab only.** For GitHub-hosted projects, use the **`lgtm-github`** skill, which uses
> `gh`, pull requests, and GitHub Actions. This skill uses `glab`, **merge requests (MRs)**,
> and **GitLab pipelines**.

## When to use this skill

- **Create / initialize a GitLab project** — first push of a project, especially a private
  one, and especially under a **group/subgroup** (e.g. `lightwell/ga-speedrun/<name>`).
- **Ship a release iteration** — branch `release/rNN`, MR, squash-merge, tag `rNN.x`, publish
  the release (notes only).
- **Everyday commit + push** following the house commit convention.
- **Tag and publish a GitLab release** (notes only).
- **Compose a commit message** in the project's `type(scope): summary` style.
- **Feature branch + MR workflow** — create a branch, push, open an MR, squash-merge, delete.
  All non-trivial work goes through a branch and MR, never direct to `main`.
- Any time the user says "give me the git commands" for one of the above on a GitLab remote.

## Assumptions

- `git` and the GitLab CLI `glab` are installed.
- `glab` is authenticated (`glab auth login` already done, for the right instance — e.g.
  `gitlab.cee.redhat.com`). If a `glab` call fails with an auth error, tell the user to run
  `glab auth login`; if it returns a 502/503, the instance may be down — retry, don't work
  around it.
- Commands run from the **project root** (the directory that is, or will become, the repo).
- For subgroup projects, **the parent group/subgroup must already exist** — `glab` creates
  projects, not groups. If it's missing, an owner must create it (or grant you rights) first.

## Bundled files

| Path                              | Purpose                                                          |
|-----------------------------------|-----------------------------------------------------------------|
| `scripts/glab-new-repo.sh`        | Init (if needed) + create a private GitLab project + push.       |
| `references/commit-conventions.md`| The full `type(scope): summary` commit convention.              |

The scripts are plain bash and safe to read aloud as the underlying commands; prefer running
the script, but the inline forms below are the canonical "give me the commands" answer.

---

## 1. Create a private GitLab project

The headline command (from the project root). `PATH` includes the full group/subgroup path:

```bash
glab repo create <group>/<subgroup>/<name> --private \
  --description "<one-line description>"
# then wire the remote and push (glab may do this for you depending on version):
git remote add origin https://gitlab.cee.redhat.com/<group>/<subgroup>/<name>.git
git push -u origin main
```

A bare name with no slash creates the project under your **personal namespace**. For a peer
project under an existing subgroup, pass the full path, e.g.
`lightwell/ga-speedrun/my-project`.

If the directory isn't a git repo yet, or has no commits, initialize first:

```bash
git init -b main
git add -A
git commit -m "Initial commit"
```

`git add -A` is safe even with private/local files **as long as they're git-ignored** (e.g.
`configs/*.json`, `docs/*.local.md`). Confirm with `git status` before the first commit if
there's any doubt.

Or run the bundled script, which does init-if-needed, first-commit-if-needed, create-or-push,
and wires `origin` if `glab` didn't:

```bash
scripts/glab-new-repo.sh <group>/<subgroup>/<name> "<one-line description>"
# public or internal instead of private:
VISIBILITY=internal scripts/glab-new-repo.sh <group>/<subgroup>/<name> "<description>"
# non-default instance:
GITLAB_HOST=gitlab.cee.redhat.com scripts/glab-new-repo.sh <group>/<name> "<description>"
```

If `origin` already exists, the script pushes instead of trying to recreate.

> **Groups vs projects.** `glab repo create` will fail if the parent group/subgroup doesn't
> exist. Create the subgroup in the GitLab UI (or have an owner do it), then re-run.

---

## 2. Ship a release iteration (the headline pattern)

An iteration ships as a squash-merged MR, an `rNN.x` tag on `main`, and a GitLab
release with notes only. There is no tarball to build, download, or extract: the
merged commit on `main` is the deliverable.

```bash
git checkout main && git pull
git checkout -b release/rNN
# ...the iteration's commits, pushed as you go...
git push -u origin release/rNN
glab mr create --title "<type>(rNN): <summary>" --description "..." --fill
glab ci status                                 # wait for the pipeline
glab mr merge --squash --remove-source-branch
git checkout main && git pull
git tag -a rNN.x -m "<project> rNN.x" && git push origin rNN.x
glab release create rNN.x --name "<project> rNN.x" --notes-file <notes.md>
```

For commit messages, follow `references/commit-conventions.md`; scope iteration work to
`rNN.x` (or `rNN`), e.g. `docs(r27): mark deploy verified; §17 walkthrough`.

### What to watch

1. **Tag the merged commit on `main`,** not the branch head. A squash-merge creates a new
   commit; the branch's last commit is not on `main`.
2. **`glab ci status` needs a pipeline.** If the repo has no `.gitlab-ci.yml`, there's no
   pipeline to watch — harmless but noise. If the user wants CI, offer to add one (see §4).
3. **Check `git status` before committing.** Confirm no ignored-but-staged secrets (seed
   configs, `*.local.md`, tokens) are about to go up.

---

## 3. Everyday commit + push

```bash
git add -A
git commit -m "<type>(<scope>): <summary>"
git push
```

Read `references/commit-conventions.md` before composing a message. In short: pick a `<type>`
from the fixed set (`docs` `site` `demo` `ci` `chore` `fix` `feat` `refactor` `style`); scope
is optional but expected on `docs:` and `demo:` commits (`§N` matching `_docs/NN-*.md`,
`demo-NN` matching `examples/NN-*/`, `rNN.x` for a release iteration, or omit when the change
spans areas); summary is imperative, ≤ 72 chars, no trailing period. Split mixed-type changes
into separate commits.

---

## 4. Tag and publish a release

A project release is **notes only**: the squash-merged MR and the `rNN.x` tag on `main` are
the deliverable, so the GitLab release carries no attached files and no checksums.

```bash
git tag -a rNN.x -m "<project> rNN.x"
git push origin rNN.x

glab release create rNN.x --name "<project> rNN.x" --notes-file <notes.md>
```

Prefer `--notes-file` over `--notes` once the notes have any structure.

### Optional: add CI so `glab ci status` is meaningful

If the user wants the `&& glab ci status` tail to do something, offer a minimal
`.gitlab-ci.yml` at the repo root that runs on push and on tag. Keep it project-appropriate
(e.g. a `build`/`test` stage).
Only add it if asked — don't assume the project wants CI.

Watch a running pipeline live:

```bash
glab ci status          # latest pipeline for the current branch
glab ci view            # interactive pipeline/job view
glab ci list            # recent pipelines
```

---

## 5. Branch workflow (feature branches + MRs)

All non-trivial work happens on a **feature branch**, not on `main`. The flow:

```
main ← MR ← feature/your-work
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

### Create an MR and merge

```bash
glab mr create --title "<type>(<scope>): <summary>" --description "..." --fill
# after review / pipeline passes:
glab mr merge --squash --remove-source-branch
```

`--fill` pre-populates the MR title/description from the commits. Add
`--target-branch main` if the default differs, and `--draft` for a work-in-progress MR.

### Rules

- **Never commit directly to `main`.** All changes go through a feature branch and an MR —
  even single-file fixes. (Protected branches on the server will enforce this.)
- **Push the feature branch before creating the MR.** `glab mr create` needs a remote branch.
- **Squash-merge by default.** One clean commit on `main` per MR. Use merge commits only when
  the branch history is meaningful (rare).
- **Delete the branch after merge.** `--remove-source-branch` on `glab mr merge` handles this.
  Stale branches are noise.
- **Reference issues in MR descriptions and commits.** Use `Closes #N` or `Related to #N` to
  link work to GitLab issues.
- **Pipelines must pass before merge.** If the repo has `.gitlab-ci.yml`, wait for green
  (`--when-pipeline-succeeds` can be passed to `glab mr merge` to auto-merge on green).

### Naming conventions

| Branch prefix | Use for |
|---------------|---------|
| `feature/` | New capabilities, examples, infrastructure |
| `fix/` | Bug fixes |
| `docs/` | Documentation-only changes |
| `chore/` | Maintenance, dependency bumps |

---

## Gotchas checklist

- Run from the **project root**, not a parent or `~`.
- `glab auth status` if any `glab` command 401/403s → have the user `glab auth login`. A
  **502/503** means the instance is down (common on internal GitLab) — retry, don't hack around.
- For a subgroup project, confirm the **parent group/subgroup exists** first; `glab` won't
  create groups.
- Set identity before the first commit if it's a fresh machine:
  `git config user.name "…"` / `git config user.email "…"`. On internal instances, use your
  corporate email (e.g. `you@redhat.com`), not a personal one — set it per-repo with
  `git config user.email` if your global identity differs.
- Private by default for these projects — pass `--private` explicitly; never create public
  unless the user says so (use `--internal` for org-visible-but-not-public).
- Before pushing, a quick `git status` confirms no ignored-but-staged secrets (seed configs,
  `*.local.md`, tokens).
- Don't attach build output to a project release: iterations ship as the merged MR, the tag,
  and release notes only.

## References

- `references/commit-conventions.md` — the full `type(scope): summary` commit convention:
  types table, scope rules, examples, subject-line cheat sheet, and when to split a commit.
