# Readiness wait patterns

The tiered bootstrap waits for each tier to be Ready before starting the
next. Three patterns; pick by what you're waiting on.

## Pattern 1: rollout status

Best for Deployments and StatefulSets. Polls until the rollout completes,
returns 0 on success, non-zero on timeout.

```bash
kubectl rollout status deploy/my-deployment -n my-namespace --timeout=300s
```

Used in the bootstrap's `wait_rollout` helper.

**When to use:** any time you helm-installed something and want to know it
finished rolling out before the next step runs.

**Timeout guidance:**
- Small workload (no init, no image pull): 60s
- Medium (one init container, fast image): 180s
- Heavy (multiple init containers, large image, slow startup): 300s+
- OpenMetadata (huge JVM startup): 420s

## Pattern 2: kubectl wait for condition

Best for resources that expose a `condition` field — Custom Resources,
Pods (Ready condition), Deployments (Available condition), etc.

```bash
kubectl wait kafka/my-kafka -n my-namespace \
    --for=condition=Ready --timeout=360s
```

```bash
kubectl wait -n istio-system --for=condition=Available \
    deploy/istiod --timeout=180s
```

**When to use:** Custom Resources (operator-managed), where the operator
sets a Ready condition once the underlying components are working. This is
often more accurate than rollout status for operator-managed resources,
because the operator does multi-step setup.

## Pattern 3: poll for a jsonpath value

Best when no built-in condition exists. Loop with `kubectl get -o jsonpath`,
check the field, sleep, repeat.

```bash
pg_ready=0
for i in $(seq 1 72); do  # 72 * 5s = 360s max
    kubectl get pods -n my-namespace -l "cnpg.io/cluster=my-pg,role=primary" \
        -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null \
        | grep -q True && { pg_ready=1; break; }
    sleep 5
done
(( pg_ready )) || { echo "Postgres primary did not become Ready"; exit 1; }
```

**When to use:** when neither `rollout status` nor `wait --for=condition`
works — typically because the resource you care about (a specific labeled
pod, not the parent StatefulSet) doesn't surface its state where the
built-in commands look.

**Pitfall:** `kubectl get -o jsonpath` returns empty (not an error) when
the jsonpath doesn't match. The pipe to `grep -q True` handles that case.

## Combining waits

For a chained dependency (operator → CR → workload), wait for each in order:

```bash
# 1. operator
kubectl rollout status -n cnpg-system deploy/cnpg-controller-manager --timeout=180s

# 2. CR (custom resource defined by the operator)
kubectl wait cluster.postgresql.cnpg.io/my-postgres -n my-ns \
    --for=condition=Ready --timeout=300s

# 3. workload that depends on the CR (e.g., a migration Job)
kubectl wait -n my-ns job/initial-migration \
    --for=condition=Complete --timeout=60s
```

Each step's timeout should be tuned to the slowest expected case for that
step alone, not the sum.

## What NOT to do

Don't `sleep 60` and hope. It's brittle (the sleep is either too short and
fails intermittently, or too long and slows every successful run). The wait
patterns above all have natural early-exit on success.
