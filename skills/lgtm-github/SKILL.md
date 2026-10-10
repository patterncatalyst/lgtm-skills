---
name: lgtm-github
description: "GitHub (gh) git workflow for the lgtm projects: create a public GitHub repo (private on request) and run the release-sync flow — extract a versioned `name_rNN.x.tar.gz` over the working tree, then commit, push, and watch Actions CI in one shot, following the Conventional Commits convention. Use for GitHub-hosted projects whenever the user wants to create or initialize a GitHub repo (public by default, private on request), push a project up for the first time, ship/sync/land a new release iteration, apply a downloaded build over an existing checkout, write a commit in the project's type/scope convention (docs/site/demo/ci/chore/fix/feat/refactor/style with `§N`, `demo-NN`, or `rNN.x` scopes), open a PR, tag and publish a GitHub release, package skills into versioned `.skill` artifacts, run the `git add -A && git commit && git push && gh run watch` pattern, or protect main with a repository ruleset and required summary-job checks. Triggers on 'branch protection', 'protect main', 'ruleset', 'required checks', 'create the github repo', 'make it private', 'push this up to github', 'give me the git commands', 'open a PR', 'sync the r27 tarball', 'package the skills', 'cut the release', or any mention of `_rNN.x.tar.gz` or `_rNN.x.skill` artifacts on a GitHub remote. For GitLab-hosted projects use lgtm-gitlab instead. Assumes the GitHub CLI (`gh`) is installed and authenticated."
---

# LGTM GitHub Skill

Encodes the git + **GitHub CLI (`gh`)** workflow used across the `lgtm-*` projects: spin up
a public repo (private on request), and repeatedly **land a versioned release tarball** with a single
extract → commit → push → watch command — all under one consistent commit
convention. The point is consistency: same commit format, same release-sync
mechanics, same gotchas handled every time.

> **GitHub only.** For GitLab-hosted projects (e.g. `gitlab.cee.redhat.com`), use the
> **`lgtm-gitlab`** skill, which uses `glab`, merge requests, and GitLab pipelines.

## When to use this skill

- **Create / initialize a GitHub repo** — first push of a project, public by
  default (private on request).
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
| `scripts/gh-new-repo.sh`          | Init (if needed) + create a public GitHub repo + push.        |
| `scripts/sync-release.sh`         | Extract a release tarball over the tree, commit, push, watch. |
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

Two artifact shapes show up in these projects. Match whatever the project
already builds — don't convert one to the other:

| Artifact | Naming | Used by |
|----------|--------|---------|
| Release tarball | `<name>_r<MAJOR>.<MINOR>.tar.gz` | Tutorial / site / demo projects shipping a whole tree |
| Packaged skill | `<name>_r<MAJOR>.<MINOR>.skill` | Skill repos (`lgtm-skills`), one file per skill |

Underscore before the `r` version in both; some older projects use a hyphen —
follow the files already in `dist/`.

A `.skill` is a zip whose single top-level entry is the **unversioned** skill
directory — `lgtm-github/SKILL.md`, never `lgtm-github_r3.x/SKILL.md`. That path
is the skill's identity to Claude, so the version lives in the filename only.
Build them with the repo's `scripts/package-all.sh`; the same files upload
directly to the claude.ai skills library.

**Tag before you build.** Packaging scripts take the version from
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

Then publish, attaching every artifact plus the checksums file:

```bash
# skill repo — one .skill per skill
gh release create rNN.x dist/*_rNN.x.skill dist/<name>_rNN.x.sha256sums.txt \
  --title "<project> rNN.x" --notes-file <notes.md>

# tarball project
gh release create rNN.x dist/<name>_rNN.x*.tar.gz dist/<name>_rNN.x.sha256sums.txt \
  --title "<project> rNN.x" --notes "<release notes>"
```

Prefer `--notes-file` over `--notes` once the notes have any structure —
headings, tables, and fenced blocks all survive intact.

To attach more artifacts to an existing release later:

```bash
gh release upload rNN.x dist/<extra-file>
```

Confirm what actually landed — the asset count catches a half-uploaded release,
and `isDraft` catches one that never went public:

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
`go vet ./...`, `go build ./...`, `go test ./...`; on tag push, run the release
script and `gh release create`). A repo that gets branch protection (§6) always
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

### Naming conventions

| Branch prefix | Use for |
|---------------|---------|
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
  `--private`) explicitly when the user wants a private repo.
- Site projects: after enabling Pages, set the About website link
  (`gh repo edit --homepage ...`, or `PAGES=1` on the script). GitHub does not
  fill it in.
- Before pushing, a quick `git status` confirms no ignored-but-staged secrets
  (seed configs, `*.local.md`, tokens).
- Don't paste the multi-`&&` one-liner blindly after a tarball extract you
  haven't inspected — confirm the `--strip-components` decision first.

## References

- `references/commit-conventions.md` — the full `type(scope): summary` commit
  convention: types table, scope rules, examples, subject-line cheat sheet, and
  when to split a commit.
- `references/branch-protection.md` — summary-job workflow skeleton, ruleset
  JSON body, and verification commands.
