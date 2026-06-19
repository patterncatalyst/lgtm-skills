# Helm repo patterns

The idempotent pattern used in every `setup-*` script. Lets you re-run any
setup script safely without `helm repo add` failing on "already exists" or
`helm repo update` failing on "repo not present."

## The pattern

```bash
# Single repo
if helm repo list 2>/dev/null | grep -q '^myrepo'; then
    helm repo update myrepo >/dev/null
else
    helm repo add myrepo https://example.com/charts
fi
```

```bash
# Multiple repos (used in setup-lgtm.sh)
for repo in \
    "grafana=https://grafana.github.io/helm-charts" \
    "open-telemetry=https://open-telemetry.github.io/opentelemetry-helm-charts"
do
    name="${repo%=*}"; url="${repo#*=}"
    if helm repo list 2>/dev/null | grep -q "^${name}"; then
        helm repo update "$name" >/dev/null
    else
        helm repo add "$name" "$url"
    fi
done
```

## Why not just `helm repo add --force-update`?

`--force-update` (in helm ≥3.3) is shorter and equivalent for the add path,
but it doesn't update repos that exist. The pattern above handles both cases
explicitly, which makes the script's intent obvious.

## Why pipe through `grep -q ^name` instead of `grep name`?

The repo's URL or description might happen to contain the name as a substring
(if it's a forked chart, or if multiple repos share a string in their description).
Anchoring with `^` ensures the match is on the repo name column, which `helm repo
list` puts first.

## Per-repo update

`helm repo update <name>` is faster than `helm repo update` (no args, which
updates all repos). When a script needs only one repo's latest charts, the
specific form is the cleaner default.

## Caveat: helm repo file is per-user

`helm repo` state lives in `$HELM_REPOSITORY_CACHE` (typically
`~/.cache/helm/repository/`). It's per-user, so different shell users (or CI
runners) won't share the cached state. The idempotent pattern handles this
transparently — first run on a fresh user adds; subsequent runs update.
