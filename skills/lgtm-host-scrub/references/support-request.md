# GitHub support request: purge old commits after a history rewrite

A force push replaces branches and tags, but GitHub keeps the old commits reachable in
two places only GitHub can clear:

- **Pull-request refs** (`refs/pull/N/head`, `refs/pull/N/merge`): read-only, so the
  rewrite can neither change nor delete them. Every PR ever opened keeps its commits.
- **Cached views**: commit pages, compare views and blob URLs keep serving the old
  content by SHA until the cache is purged and the objects are garbage-collected.

Only the repository owner can file this, at <https://support.github.com/contact>
(choose "Remove sensitive data"). Draft it for them; never submit it on their behalf.

## Collect the identifiers first

Run these before the push, while the old refs still exist on the remote. Afterwards,
read the old SHAs from the `refs-before` file in the rewrite work dir.

```bash
gh api repos/{owner}/{repo}/pulls --paginate -q '.[] | "#\(.number) \(.head.sha[0:7])"' -X GET -f state=all
git ls-remote origin 'refs/heads/*' 'refs/tags/*'      # old heads and tag objects
```

## Template

```text
Subject: Purge cached views and unreachable commits after a history rewrite ({owner}/{repo})

Hello,

On {date} I rewrote the history of the public repository {owner}/{repo} to remove
details that identify my development machine (local paths and machine details) from
committed files, and force-pushed {branches} and the tags {tags}.

Old commits are still reachable through pull-request refs and cached views. Please run
garbage collection on the repository and purge the cached views of these commits:

- Old branch heads: {old head SHAs} ({branch} before the rewrite).
- Old tag targets: {old tag object SHAs}.
- The commits of pull requests {#N, ...} (refs/pull/N/head), whose branches were
  merged and deleted.

The pull requests can stay as they are; I only need the old commit contents to stop
being retrievable.

The current {branch} is {new head SHA}, and the tags now point to {new tag SHAs}.

Thank you.
```

Keep it to identifiers. Do not quote the leaked values in the request: the ticket is
not the place to repeat them.

## Forks and clones

Support purges the repository's own network. A fork made before the rewrite keeps the
old commits; ask its owner to delete or re-fork it, and name it in the request if it
is in the same network. Any clone made before the rewrite still holds the old history:
re-clone, or run `scripts/local-cleanup.sh --apply` after `git reset --hard origin/<branch>`.
