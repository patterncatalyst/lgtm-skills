---
name: lgtm-git
description: "Create a private GitHub repo and run the release-sync git workflow used across the lgtm projects: extract a versioned `name_rNN.x.tar.gz` over the working tree, then commit, push, and watch CI in one shot, following the project's Conventional Commits convention. Use whenever the user wants to create or initialize a GitHub repo (especially private), push a project up for the first time, ship/sync/land a new release iteration, apply a downloaded build over an existing checkout, write a commit in the project's type/scope convention (docs/site/demo/ci/chore/fix/feat/refactor/style with `§N`, `demo-NN`, or `rNN.x` scopes), tag and publish a GitHub release, or run the `git add -A && git commit && git push && gh run watch` pattern. Triggers on 'create the repo', 'make it private', 'push this up', 'give me the git commands', 'sync the r27 tarball', 'what's the commit convention', or any mention of `_rNN.x.tar.gz` artifacts. Assumes the GitHub CLI (`gh`) is installed and authenticated."
---

# LGTM Git Skill

Encodes the git + GitHub CLI workflow used across the `lgtm-*` projects: spin up
a private repo, and repeatedly **land a versioned release tarball** with a single
extract → commit → push → watch command — all under one consistent commit
convention. The point is consistency: same commit format, same release-sync
mechanics, same gotchas handled every time.

## When to use this skill

- **Create / initialize a GitHub repo** — first push of a project, especially a
  private one.
- **Sync a release iteration** — a `name_rNN.x.tar.gz` was downloaded/built and
  needs to be applied over the working tree and pushed.
- **Everyday commit + push** following the house commit convention.
- **Tag and publish a GitHub release** with the built artifacts attached.
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
| `scripts/gh-new-repo.sh`          | Init (if needed) + create a private GitHub repo + push.       |
| `scripts/sync-release.sh`         | Extract a release tarball over the tree, commit, push, watch. |
| `references/commit-conventions.md`| The full `type(scope): summary` commit convention.            |

The scripts are plain bash and safe to read aloud as the underlying commands;
prefer running the script, but the inline forms below are the canonical
"give me the commands" answer.

---

## 1. Create a private GitHub repo

The headline command (from the project root):

```bash
gh repo create <name> --private --source=. --remote=origin \
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
# public instead of private:
VISIBILITY=public scripts/gh-new-repo.sh <name> "<description>"
```

If `origin` already exists, the script pushes instead of trying to recreate.

---

## 2. Sync a release tarball (the headline pattern)

This is the workflow the user reaches for most. Canonical inline form:

```bash
cd ~/Dev/<project>
tar -xzf ~/Downloads/<project>_rNN.x.tar.gz --strip-components=1 --overwrite -C .
git add -A && git commit -m "<type>(<scope>): <summary>" && git push && sleep 5 && gh run watch
```

For the commit message, follow `references/commit-conventions.md`. Scope a
release sync to the iteration — `rNN.x` (or `rNN`) — e.g.
`docs(r27): mark deploy verified; §17 walkthrough`.

Run the bundled script to get the robust version (auto-detects wrapping, guards
empty commits, skips `gh run watch` when there's no workflow):

```bash
scripts/sync-release.sh ~/Downloads/<project>_rNN.x.tar.gz \
  "docs(rNN): <summary>"

# keep a customized local file from being overwritten by re-extraction:
scripts/sync-release.sh ~/Downloads/<project>_rNN.x.tar.gz \
  "docs(rNN): <summary>" -- 'docs/*.local.md' 'configs/sources.json'
```

### The three things that bite (and how the skill handles them)

1. **`--strip-components=1` is conditional.** It's needed only when the tarball
   wraps everything in a single top-level directory (e.g. `myproj/...`). If the
   tarball's files sit at the archive root, stripping deletes a path level and
   files land wrong. **Always check first:**
   ```bash
   tar -tzf <tarball> | head
   ```
   One shared top dir → use `--strip-components=1`. Files at root → omit it. The
   `sync-release.sh` script auto-detects this; the inline command does not, so
   verify before pasting.

2. **Re-extraction overwrites git-ignored local files.** A release tarball may
   contain template/local files (`*.local.md`, example configs) that the user has
   since customized. Exclude them on extract with `--exclude='<glob>'` (script:
   pass them after `--`). The exclude matches the **archived path** (before
   `--strip-components` is applied).

3. **`gh run watch` needs a workflow.** If the repo has no
   `.github/workflows/*.yml`, `gh run watch` reports no runs and exits — harmless
   but noise. The script only runs it when a workflow file exists. If the user
   wants CI, offer to add one (see §4).

> `--overwrite` is GNU tar (the default on Fedora/Linux). On macOS's bsdtar it's
> usually unnecessary (overwrite is the default); the script drops it
> automatically when it detects bsdtar.

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

Release artifacts follow the `<name>_r<MAJOR>.<MINOR>.tar.gz` naming (underscore
before the `r` version; some older projects use a hyphen — match whatever the
project already uses). After building the artifacts (e.g. via the project's
`scripts/release.sh`):

```bash
git tag -a rNN.x -m "<project> rNN.x"
git push origin rNN.x

gh release create rNN.x dist/<name>_rNN.x*.tar.gz dist/<name>_rNN.x.sha256sums.txt \
  --title "<project> rNN.x" --notes "<release notes>"
```

To attach more artifacts to an existing release later:

```bash
gh release upload rNN.x dist/<extra-file>
```

### Optional: add CI so `gh run watch` is meaningful

If the user wants the `&& gh run watch` tail to do something, offer a minimal
workflow at `.github/workflows/ci.yml` that runs on push and on tag. Keep it
project-appropriate (for a Go project: `go vet ./...`, `go build ./...`,
`go test ./...`; on tag push, run the release script and `gh release create`).
Only add it if asked — don't assume the project wants CI.

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
- `gh auth status` if any `gh` command 401/403s → have the user `gh auth login`.
- Set identity before the first commit if it's a fresh machine:
  `git config user.name "…"` / `git config user.email "…"`.
- Private by default for these projects — pass `--private` explicitly; never
  create public unless the user says so.
- Before pushing, a quick `git status` confirms no ignored-but-staged secrets
  (seed configs, `*.local.md`, tokens).
- Don't paste the multi-`&&` one-liner blindly after a tarball extract you
  haven't inspected — confirm the `--strip-components` decision first.

## References

- `references/commit-conventions.md` — the full `type(scope): summary` commit
  convention: types table, scope rules, examples, subject-line cheat sheet, and
  when to split a commit.
