---
name: lgtm-host-scrub
description: "Find and remove details that identify the development machine or its owner from a public git repository, its whole history and its local leftovers: home paths, account name, hostname, laptop (DMI) and CPU model, exact kernel build, machine-id, MAC addresses, root UUID. Ships host_ids.py (check / scrub / filter / history / local / self-test; reads this machine's values at run time and never writes them down), a three-phase git filter-repo history rewrite (plan, apply, push), a local cleanup of worktrees, branches, reflog and unreachable objects, a CI check, a CLAUDE.md publishing rule, and a GitHub support-request template for pull-request refs. Use when the user asks to remove host, laptop or machine information from a repo, audit repos for leaked paths or machine details, scrub benchmark or profile output before committing, rewrite history to drop leaked identifiers, clean up old local copies after a rewrite, or keep a repo clean with a CI gate. Triggers on 'scrub host info', 'remove my laptop details', 'leaked home path', 'identifies my machine', 'audit our repos for leaks', 'rewrite history to remove', 'filter-repo', 'purge old commits'."
---

# LGTM host scrub

A public repository built on one developer's machine collects that machine's identity:
`/home/<account>/...` paths in logs, the CPU model and laptop model in a benchmark
profile, the exact kernel build in `uname -a` output, a root UUID in a captured
`/proc/cmdline`. Each is small; together they name the owner, the hardware and the
patch level, which is what an attacker wants to know. This skill finds them, removes
them from the tree and from history, and keeps them out.

It came out of a real cleanup (low-latency-engineering, 2026-10-23: 1,019 run files,
a history rewrite, four stale agent worktrees). The scripts encode what went wrong
the first time.

## The rules that matter most

1. **Never write the identifying values down, not even in the scrub tool.** The
   machine's values are read at run time (`/proc/cpuinfo`, `/sys/class/dmi/id/*`,
   `uname`, `$HOME`, `/etc/machine-id`, `/sys/class/net/*/address`, `/proc/cmdline`);
   everything else is a generic pattern. A rule table that spells the CPU model or
   kernel build, even split as `"i7-" + "1234"`, publishes it.
2. **Report hits without values.** `check` prints `path:line: category`. A CI log or
   a PR comment that quotes the leak republishes it.
3. **History rules are literals, not patterns.** A generic regex applied to every
   historical blob also rewrites legitimate content, such as test fixtures of fake values
   or a dependency pin that looks like a kernel build. `history --emit-rules` writes
   the exact values it found, one per line, for review before the rewrite.
4. **The owner approves each irreversible step:** the scrub PR's merge, the force
   push, deleting local worktrees and branches, and filing the support request.
   Audits are read-only and need no approval.
5. **Never change the host to hide something.** Do not edit `/etc/hostname`, DMI or
   kernel settings; scrub the output instead.

## The tool

`scripts/host_ids.py` (stdlib only, Python 3.11+):

| Command | What it does |
|---|---|
| `check [--repo DIR]` | Scan tracked files (gzip included); exit 1 on a hit. Safe on a CI runner |
| `scrub [--repo DIR] [--dry-run] [PATH...]` | Rewrite files in place (default: all tracked files). `.gz` recompressed like `gzip -n` |
| `filter` | Scrub stdin to stdout, for a captured log before it is committed |
| `history [--repo DIR] [--emit-rules FILE]` | Scan every reachable blob, commit message and tag message in all refs; with `--emit-rules`, write literal `git filter-repo` rules outside the repo |
| `local [--repo DIR]` | Inventory of local copies of old history: worktrees, branches not on any remote, stashes, reflog |
| `self-test` | Planted fake values in a throwaway repo; must pass before you trust a change to the tool |

**Categories and replacements:**

| Category | Replacement |
|---|---|
| `home-path` (this repo's checkout path, then `$HOME`, then any `/home/X`, `/Users/X`) | `<repo>`, then `~` |
| `account` | `user` |
| `hostname` | `host` |
| `cpu-model` | a derived class such as "Intel 8-core/16-thread laptop CPU"; a part from another vendor becomes "AMD CPU" |
| `product-name` (DMI name, version, family, board) | `redacted` |
| `kernel-build` | `major.minor` |
| `kernel-version` (the `#1 SMP PREEMPT_DYNAMIC <date>` line) | the preempt model |
| `machine-id` | `<machine-id>` |
| `mac` | `00:00:00:00:00:00` |
| `boot-uuid` | `<uuid>`; `BOOT_IMAGE=` is replaced by `<redacted>` |

**Per-repo config** `.host-scrub.toml` (committed; it holds no identifiers):

```toml
skip = ["scripts/host_ids.py", "scripts/validate.py"]   # never checked or scrubbed
cpu_class = "Intel 8-core/16-thread laptop CPU"          # match the prose
[allow]                                                  # path globs per category
kernel-build = ["scripts/lab/*.sh", "_plans/dependency-pins.md"]
product-name = ["examples/*/results/*vm*/*"]             # a lab VM's DMI, not the host's
```

Allow a category only after reading the hit and confirming it is not this machine's
value. A disposable VM's kernel and DMI strings, a package version pin and a fixture
of fake values all qualify.

## The runbook (one repository)

1. **Audit, read-only.** `host_ids.py check` (tree), `host_ids.py history` (all refs),
   `host_ids.py local` (leftovers). Also list what GitHub holds that a push cannot
   change: `gh api repos/{o}/{r}/pulls -X GET -f state=all --paginate -q 'length'`.
   Report the counts per category to the owner, without values.
2. **Fix the tree on a branch, as a PR.** `host_ids.py scrub`, then read the diff:
   numbers, histograms and results must be byte-identical apart from the scrubbed
   strings. If the repo verifies recorded results (checksums, re-checks), run that
   verification. Fix the generators that wrote the values (see
   `references/publishing-rule.md`), add `.host-scrub.toml`, the CI check and the
   CLAUDE.md rule in the same PR. Merge on the owner's OK.
3. **Rewrite history**, only if `history` still reports hits after the merge, and on
   the owner's OK:
   ```bash
   scripts/rewrite-history.sh plan <repo>     # mirror clone + scan + rules.txt, in a scratch dir
   # review rules.txt: delete any line whose value should stay
   scripts/rewrite-history.sh apply <work>    # filter-repo (uvx), re-scan, tip trees compared
   scripts/rewrite-history.sh push <work>     # force-push branches and tags to the URL
   ```
   `apply` rewrites file contents **and** commit and tag messages (`--replace-message`).
   A message that says "from /home/alice" is as public as the file. The tip-tree
   comparison should say `identical` for every branch whose tree step 2 already
   cleaned; `CHANGED` means the rewrite touched current content, so stop and read why.
   `push` refuses while a ruleset or branch protection blocks force pushes, and prints
   the commands to lift and restore it; lifting it is the owner's call.
4. **Clean every local copy.** In each clone: `git fetch --force --tags && git reset
   --hard origin/<branch>`, then `scripts/local-cleanup.sh <repo>` (report) and
   `--apply` on the owner's OK. Agent worktrees under `.claude/worktrees/` are the
   usual stragglers: a later push from one re-publishes the old history.
5. **Delete the work dir** (`rm -rf <work>`); `rules.txt` holds the values.
6. **Draft the support request** for pull-request refs and cached views
   (`references/support-request.md`). Only the owner can file it.
7. **Re-verify:** `history` on a fresh clone reports clean; releases still point at
   their tags (`gh release list`); CI is green on the rewritten default branch.

## Sweeping many repositories

Audit first, fix one at a time:

```bash
gh repo list <owner> --visibility public --limit 200 --json name -q '.[].name' |
while read -r r; do
  d="$(mktemp -d)"   # literal paths only: never rm -rf an expanded variable
  git clone -q --mirror "https://github.com/<owner>/$r" "$d/m.git" && {
    echo "== $r (all refs, PR refs included)"
    python3 scripts/host_ids.py history --repo "$d/m.git" | sed -n '2,$p'
    git -C "$d/m.git" for-each-ref --format='%(refname)' refs/pull |
      xargs -r -n1 git -C "$d/m.git" update-ref -d
    echo "== $r (branches and tags only)"
    python3 scripts/host_ids.py history --repo "$d/m.git" | sed -n '2,$p'
  }
  echo "$d"            # remove the clone dirs afterwards, by their literal paths
done
```

Scan a `--mirror` clone, twice. A normal clone skips `refs/pull/*`, which hides what
GitHub still serves from merged pull requests. Hits that appear only with the PR refs
need the support purge (step 6), not a rewrite; hits in branches and tags need steps 2
and 3. Check the current tree separately (`check` on a normal clone): that decides
whether a scrub PR is needed at all.

Present the table (repository, categories, path counts) to the owner and let them
order the fixes. Each repository gets its own scrub PR and, if needed, its own
rewrite. A rewrite of a repository that others have forked or cloned needs their
re-clone; say so before pushing.

## Gotchas (from the first run)

- `git filter-repo` removes the `origin` remote; push to the URL. The script does.
- Pull-request refs are read-only: the mirror drops them before the rewrite, and
  GitHub support purges them (step 6).
- `--replace-text` cannot see inside compressed blobs (`.gz`, `.zip`, `.jar`).
  `history` decompresses gzip when it scans, so a hit in a `.gz` path means the rule
  file will not fix it: drop that path from history with `--path <p> --invert-paths`,
  or replace the blob with a callback.
- Zsh mangles `ref^{}`; quote it, or use `git show-ref`.
- `perf --version`, `uname -a`, JFR and JMH headers, `lscpu` and `/proc/cpuinfo` dumps
  are the usual sources in benchmark repos; fix the generator, not only the output.
- Author and committer identities are not scanned: a git identity is public by design.
  If the owner does not want an address public, switch to the GitHub noreply address
  and rewrite old commits with `git filter-repo --mailmap`. Trailers such as
  `Co-authored-by: name <account@localhost>` are message text, and `history` does flag
  them.
- A rewrite changes every SHA after the first touched commit. Tags and releases are
  re-pointed by the push; links to old commit SHAs in issues and docs break.

## Composition

- **lgtm-github:** the scrub lands as a normal PR; branch protection (§6) blocks the
  force push until the owner lifts it; the CI check joins the summary job.
- **lgtm-tutorial / lgtm-jekyll:** a tutorial whose examples record machine profiles
  adopts the publishing rule at bootstrap, not after the first leak.
- **lgtm-systems-programming:** a lab VM's own kernel and DMI strings are not the
  host's; allow them by path in `.host-scrub.toml`.

## Files

- `scripts/host_ids.py`: the tool.
- `scripts/rewrite-history.sh`: plan, apply, push.
- `scripts/local-cleanup.sh`: worktrees, branches, reflog, gc (report by default).
- `references/publishing-rule.md`: the CLAUDE.md rule, generator fixes, the CI job.
- `references/support-request.md`: what GitHub keeps and the request template.
