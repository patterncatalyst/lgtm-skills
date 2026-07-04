# Opt-in flags

The bootstrap is organized as eleven tiers, each guarded by an `ENABLE_*` flag.
Defaults are biased toward "what you actually need for a working Kubernetes
substrate"; flags that are off by default deliver application-shaped pieces
(data catalog, schema registry) that not every project uses.

## The flag table

| Flag                   | Default | Tier | Components installed                                |
|------------------------|---------|------|-----------------------------------------------------|
| `ENABLE_ISTIO`         | `true`  | 2    | Istio control plane in `istio-system`               |
| `ENABLE_POSTGRES`      | `true`  | 3-4  | CloudNativePG operator + a single-node cluster      |
| `ENABLE_KAFKA`         | `true`  | 5    | Strimzi operator + a single-node Kafka cluster      |
| `ENABLE_KEDA`          | `true`  | 6    | KEDA core + HTTP add-on                             |
| `ENABLE_LGTM`          | `true`  | 7    | Loki + Grafana + Tempo + Mimir + OTel Collector     |
| `ENABLE_KIALI`         | `true`* | 8    | Kiali mesh-topology UI                              |
| `ENABLE_REDIS`         | `false` | 8    | Redis cache / pub-sub (single-node, no persistence) |
| `ENABLE_APICURIO`      | `false` | 10   | Apicurio schema registry                            |
| `ENABLE_OPENMETADATA`  | `false` | 11   | OpenMetadata data catalog                           |

\* `ENABLE_KIALI` defaults to whatever `ENABLE_ISTIO` is. Kiali shows mesh
topology; without a mesh, it has nothing to show.

## Dependency rules

The bootstrap enforces these at startup. Violating a rule fails the run
before any cluster work happens, which is much cheaper than discovering it
mid-install.

| Rule                                                                     | Enforced |
|--------------------------------------------------------------------------|----------|
| `ENABLE_KIALI=true` requires `ENABLE_ISTIO=true`                          | yes (fail) |
| `ENABLE_OPENMETADATA=true` requires `ENABLE_POSTGRES=true`                | yes (fail) |
| `ENABLE_APICURIO=true` without `ENABLE_KAFKA=true`                        | warn only |
| LGTM without any application workload                                    | warn only |

## Setting flags

Three idiomatic ways to set them:

### Inline on the command

```bash
ENABLE_KAFKA=false ENABLE_POSTGRES=false ./scripts/bootstrap.sh
```

Best for one-off experiments. Doesn't persist.

### In a `.env` file alongside the bootstrap

```bash
# .env (sourced by bootstrap.sh if present)
ENABLE_KAFKA=false
ENABLE_APICURIO=true
ENABLE_OPENMETADATA=true
```

Persists across invocations; check into git so the team uses the same shape.
The current `bootstrap.sh.template` does not source a `.env` by default; add
the source line near the top if you want this pattern.

### Exported in the shell session

```bash
export ENABLE_KAFKA=false
./scripts/bootstrap.sh
./scripts/bootstrap.sh   # same flags, no need to re-set
```

Best for interactive iteration.

## Common combinations

**Thin substrate (just a mesh and observability):**
```bash
ENABLE_KAFKA=false ENABLE_POSTGRES=false ENABLE_KEDA=false ./scripts/bootstrap.sh
```

**Event-driven, no relational state:**
```bash
ENABLE_POSTGRES=false ./scripts/bootstrap.sh
```

**Data-mesh-shaped (the original use case):**
```bash
ENABLE_APICURIO=true ENABLE_OPENMETADATA=true ./scripts/bootstrap.sh
```

**No mesh, no scaling, no Kafka — just the LGTM observability layer and
Postgres:**
```bash
ENABLE_ISTIO=false ENABLE_KEDA=false ENABLE_KAFKA=false ./scripts/bootstrap.sh
```

(With `ENABLE_ISTIO=false`, the Kiali default also becomes `false`.)

## Resource impact

Each flag-on adds memory and CPU footprint to the cluster. Rough numbers at
idle (from `lgtm-on-minikube-sizing.md` and equivalent estimates for the
other components):

| Component       | Idle memory  | Idle CPU |
|-----------------|--------------|----------|
| Istio (istiod)  | ~150 MiB     | <100m    |
| Postgres CR     | ~200 MiB     | <100m    |
| Strimzi + Kafka | ~600 MiB     | <300m    |
| KEDA            | ~150 MiB     | <100m    |
| LGTM            | ~1.4 GiB     | ~700m    |
| Kiali           | ~100 MiB     | <50m     |
| Redis           | ~50 MiB      | <50m     |
| Apicurio        | ~250 MiB     | <100m    |
| OpenMetadata    | ~3 GiB       | ~500m    |
| **All on**      | **~6 GiB**   | **~2 vCPU** |

The 24 GB / 16 vCPU minikube profile has comfortable headroom for the stack
plus application services.
