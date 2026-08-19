# lgtm-minikube-stack

A complete Kubernetes platform stack on a single minikube node, with the full
Grafana LGTM observability suite (Loki + Grafana + Tempo + Mimir) plus the
service mesh, autoscaling, messaging, and database operators that turn a vanilla
cluster into a usable substrate for modern Python services.

This is a project-scaffolding template: drop the files into a new project, set
the feature flags you need, and `./scripts/bootstrap.sh` brings up the whole
stack from a fresh profile in about 25 minutes.

## What you get

| Component                     | Role                                                                 | Default | Flag                  |
|-------------------------------|----------------------------------------------------------------------|---------|-----------------------|
| **minikube profile**          | The cluster itself (single node, podman driver, containerd runtime)  | always  | —                     |
| **Istio**                     | Service mesh: mTLS, traffic management, telemetry from sidecars      | on      | `ENABLE_ISTIO`        |
| **KEDA + HTTP add-on**        | Event-driven autoscaling: Kafka lag, HTTP volume, scale-to-zero      | on      | `ENABLE_KEDA`         |
| **Strimzi**                   | Kafka operator + a single-node Kafka cluster (KRaft, no ZooKeeper)   | on      | `ENABLE_KAFKA`        |
| **CloudNativePG**             | Postgres operator + a single-node Postgres cluster                   | on      | `ENABLE_POSTGRES`     |
| **Loki**                      | Log aggregation (single-binary mode, filesystem storage)             | on      | `ENABLE_LGTM`         |
| **Grafana**                   | Visualization, with datasources and dashboards pre-provisioned       | on      | `ENABLE_LGTM`         |
| **Tempo**                     | Distributed-tracing backend (monolithic mode)                        | on      | `ENABLE_LGTM`         |
| **Mimir**                     | Prometheus-compatible metrics backend (monolithic mode)              | on      | `ENABLE_LGTM`         |
| **OpenTelemetry Collector**   | Single OTLP receiver, routes signals to Loki/Tempo/Mimir             | on      | `ENABLE_LGTM`         |
| **Kiali**                     | Mesh-topology UI, wired to the existing observability stack          | on*     | `ENABLE_KIALI`        |
| **Apicurio Registry**         | Schema registry (OpenAPI, Protobuf, AsyncAPI, GraphQL SDL)           | off     | `ENABLE_APICURIO`     |
| **Kafka UI**                  | Console to browse Kafka topics, messages, consumer groups, schemas   | off     | `ENABLE_KAFKA_UI`     |
| **OpenMetadata**              | Data catalog + lineage graph (heavy; data-mesh-shaped only)          | off     | `ENABLE_OPENMETADATA` |

\* Kiali turns on automatically when Istio is enabled; turn it off explicitly
with `ENABLE_KIALI=false` if you don't want the topology UI.

## Bootstrap in one command

```bash
# Defaults (most projects)
./scripts/bootstrap.sh

# A thin substrate (no Kafka, no Postgres)
ENABLE_KAFKA=false ENABLE_POSTGRES=false ./scripts/bootstrap.sh

# Full data-mesh-shaped stack
ENABLE_APICURIO=true ENABLE_OPENMETADATA=true ./scripts/bootstrap.sh

# Replace an existing profile (wipes the cluster)
./scripts/setup-profile.sh --replace
./scripts/bootstrap.sh
```

The bootstrap is ten tiers, each gated on health before the next starts. It's
idempotent: re-running picks up wherever it left off, so an interrupted run can
be resumed by re-invoking the same command.

## Verified configuration

- **Host:** Fedora 44 with rootless podman
- **Memory:** 64 GB RAM (the cluster uses 24 GB; rest is host headroom)
- **Disk:** 1 TB total, ≥30 GB free for the image cache and PVs
- **Kernel:** `fs.inotify.max_user_instances ≥ 256` (preflight checks this)
- **Tooling:** minikube, kubectl, helm, podman

Other Linux distributions with rootless container runtimes should work but
aren't verified. The preflight script names exactly what's missing and prints
the fix command for your platform.

## What's in the box

```
project/
├── scripts/
│   ├── bootstrap.sh                  ← orchestrator, ten tiers, opt-in flags
│   ├── setup-profile.sh              ← preflight + minikube start
│   ├── setup-istio.sh
│   ├── setup-keda.sh                 ← KEDA core + HTTP add-on (0.12.2 — see notes)
│   ├── setup-kafka-operator.sh       ← Strimzi
│   ├── setup-postgres-operator.sh    ← CloudNativePG
│   ├── setup-lgtm.sh                 ← Loki + Grafana + Tempo + Mimir + Collector
│   ├── setup-kiali.sh
│   ├── setup-apicurio.sh             ← opt-in
│   ├── setup-openmetadata.sh         ← opt-in
│   ├── cluster-status.sh             ← one-shot health summary
│   └── teardown.sh                   ← delete the profile, free resources
├── observability/
│   ├── otel-collector-config.yaml    ← canonical 3-signal pipeline
│   ├── grafana-datasources.yaml      ← Loki, Tempo, Mimir provisioned at install
│   └── grafana-dashboards/           ← one sample dashboard per datasource
└── docs/
    ├── preflight-and-prerequisites.md
    ├── known-issues.md
    ├── ports-and-endpoints.md
    ├── lgtm-on-minikube-sizing.md
    └── runtime-portability.md
```

## What the LGTM components do

- **Loki** — Log aggregation. Apps emit logs to the OTel Collector via OTLP; the
  Collector forwards to Loki. Query in Grafana with LogQL.
- **Grafana** — Visualization. Datasources for Loki / Tempo / Mimir are
  pre-provisioned. Four sample dashboards ship to give you something to look at
  on day one; build project-specific dashboards on top.
- **Tempo** — Distributed tracing. Apps emit spans to the Collector via OTLP;
  the Collector forwards to Tempo. Query traces by ID or by service name.
- **Mimir** — Prometheus-compatible metrics backend. Apps emit metrics to the
  Collector (or to Mimir directly via remote-write); query with PromQL. Mimir
  replaces a standalone Prometheus deployment — anything that wrote PromQL
  against a Prometheus still works.
- **OpenTelemetry Collector** — The single emission target for application
  services. One pod (`deployment` mode, single replica) on a single-node
  minikube. Receives OTLP-HTTP at `:4318` and OTLP-gRPC at `:4317`; routes the
  three signals to their respective backends.

## Known issues and important notes

- **KEDA HTTP add-on is pinned to v0.12.2** as of this skill's release. v0.14.0
  has an upstream Go panic in the interceptor's POST forwarding path
  ([kedacore/http-add-on#1668](https://github.com/kedacore/http-add-on/issues/1668)),
  fixed in PR [#1669](https://github.com/kedacore/http-add-on/pull/1669) and
  awaiting a tagged release. When v0.14.1+ ships, bump `KEDA_HTTP_VERSION` in
  `setup-keda.sh`.
- **Istio 1.29+ uses native sidecars.** `istio-proxy` injects as an
  `initContainer` with `restartPolicy: Always`, not a regular container. A
  meshed pod still reports `2/2`. Membership checks must look at
  `.spec.initContainers`.
- **Mesh selectively, not namespace-wide.** When Istio is on, the bootstrap does
  not enable automatic injection on the application namespace. Inject per
  Deployment to keep Job pods (which hang at `1/2` when meshed) and
  operator-managed databases (TLS conflicts) out of the mesh by default.
- **Idle-node decay.** Long-lived minikube nodes can lose kube-proxy's `/dev`
  mounts and stop routing Service traffic, while every pod still reports Ready.
  Cycle the node if you see Service-to-pod timeouts that pod-to-pod traffic
  doesn't show.
- **podman pids_limit.** Default is 2048, which the full stack saturates.
  Preflight catches this and prints the fix.

See `docs/known-issues.md` for the full set.

## Where this came from

This stack is the substrate used by the data-mesh reference architecture at
[`patterncatalyst/datamesh-reference-arch-python`](https://github.com/patterncatalyst/datamesh-reference-arch-python).
It was factored out into a project-template skill because the same shape works
for any Kubernetes-on-minikube project — the data-mesh use case is one of
several it serves.

The decision log entries that produced these scripts (and the lessons learned
that informed them) are in that repo's
[`_plans/archive/capstone-decisions.md`](https://github.com/patterncatalyst/datamesh-reference-arch-python/blob/main/_plans/archive/capstone-decisions.md),
CAP-001 through CAP-047.
