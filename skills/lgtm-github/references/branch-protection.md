# Branch protection reference

Companion to SKILL.md §6. Three pieces: a summary-job workflow skeleton, the
ruleset body, and verification commands.

## Workflow skeleton

One workflow with a `changes` job, one heavy job, and a summary job. Adapted from
`tests.yml` and `examples.yml` in enterprise-integration-patterns-with-camel.

```yaml
name: Build

on:
  # Once per change: on the PR, and on main after the merge.
  push:
    branches: [main]
  pull_request:

jobs:
  # Decides whether the heavy jobs run. The workflow always runs, so the
  # required summary job always reports.
  changes:
    runs-on: ubuntu-latest
    outputs:
      run: ${{ steps.diff.outputs.run }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: diff
        run: |
          if [ "${{ github.event_name }}" = pull_request ]; then
            base="${{ github.event.pull_request.base.sha }}"
          else
            base="${{ github.event.before }}"
          fi
          if ! files="$(git diff --name-only "$base" "${{ github.sha }}" 2>/dev/null)"; then
            echo "run=true" >> "$GITHUB_OUTPUT"   # cannot diff: run everything
          elif grep -qE '^(src/|pom\.xml$|\.github/workflows/build\.yml$)' <<<"$files"; then
            echo "run=true" >> "$GITHUB_OUTPUT"
          else
            echo "run=false" >> "$GITHUB_OUTPUT"
          fi

  build:
    needs: changes
    if: needs.changes.outputs.run == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make test

  # The one check the ruleset requires. Passes when every needed job succeeded
  # or was skipped by `changes`.
  build-ok:
    if: always()
    needs: [changes, build]
    runs-on: ubuntu-latest
    steps:
      - env:
          NEEDS: ${{ toJSON(needs) }}
        run: jq -e 'to_entries | all(.value.result == "success" or .value.result == "skipped")' <<<"$NEEDS"
```

Notes:

- Edit the `grep -qE` pattern to the paths that should trigger the heavy jobs.
  Include the workflow file itself.
- Never put `paths:` filters on the `on:` triggers of a workflow whose summary
  job is required: a filtered-out run reports nothing.
- With a matrix, `needs.build.result` is one value for the whole matrix, so the
  summary job needs no per-entry handling.
- The check context is the job `name:`, or the job id when no name is set.
  Here it is `build-ok`.
- A repo whose jobs are all cheap can drop `changes` and the `if:` on the heavy
  jobs and keep only the summary job.

## Ruleset body

`ruleset.json`, with the check names filled in:

```json
{
  "name": "main",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false,
        "allowed_merge_methods": ["squash"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [
          { "context": "build-ok" }
        ]
      }
    }
  ]
}
```

Create or update by hand (the script `scripts/gh-protect-branch.sh` does this):

```bash
gh api -X POST repos/{owner}/{repo}/rulesets --input ruleset.json
gh api -X PUT  repos/{owner}/{repo}/rulesets/<id> --input ruleset.json
```

Merge settings:

```bash
gh api -X PATCH repos/{owner}/{repo} \
  -F delete_branch_on_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false
```

## Verification

```bash
# Direct push to main is rejected
git commit --allow-empty -m "test: direct push" && git push origin main   # expect: rejected
git reset --hard HEAD~1                                                    # drop the test commit

# One active ruleset named main, with the expected rules and checks
gh api repos/{owner}/{repo}/rulesets --jq '.[] | [.id, .name, .enforcement] | @tsv'
gh api repos/{owner}/{repo}/rulesets/<id> \
  --jq '.rules[] | .type, (.parameters.required_status_checks // [] | map(.context))'

# Merge settings
gh api repos/{owner}/{repo} \
  --jq '{delete_branch_on_merge, allow_merge_commit, allow_rebase_merge, allow_squash_merge}'

# No classic protection left (404 is the wanted answer)
gh api repos/{owner}/{repo}/branches/main/protection

# A docs-only PR goes green: heavy jobs skipped, summary job passes
gh pr checks <pr-number>
```
