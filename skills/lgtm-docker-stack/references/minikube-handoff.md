# From Docker Compose to Minikube

This skill is for a **single-host Docker daemon** — one machine, one set of
containers wired together with `docker compose`. When a project outgrows that (needs
a service mesh, autoscaling, operator-managed Postgres/Kafka, or is meant to model a
real Kubernetes deployment), the Kubernetes-shaped sibling skill is
**`lgtm-minikube-stack`**.

## The handoff

`lgtm-minikube-stack` runs minikube with **the `docker` driver**
(`minikube start --driver=docker`), so the same Docker daemon and images this skill
uses underpin the Kubernetes substrate too — there's no separate VM or hypervisor
layer to install first. That's the intended on-ramp: prove the architecture locally
with `docker compose`, then move to `lgtm-minikube-stack` when Kubernetes-specific
concerns (mesh, HPA/KEDA, operators) become the point of the exercise rather than a
distraction from it.

```bash
minikube start --driver=docker --profile your-project
```

## What carries over directly

- **Container images.** The same UBI-based multi-stage Containerfiles
  (`templates/Containerfile.multistage-ubi`) build images that run unmodified under
  minikube — `docker build` output is a standard OCI image either way. Load them into
  minikube's image cache with `minikube image load your-org/your-app:dev` (or point
  minikube's Docker daemon at your shell with `eval $(minikube docker-env)` before
  building) to skip a registry round-trip.
- **OTLP wiring.** The same `OTEL_EXPORTER_OTLP_ENDPOINT` / `OTEL_EXPORTER_OTLP_PROTOCOL`
  environment variables work — only the hostname changes (a Kubernetes Service DNS
  name like `otel-collector.observability.svc.cluster.local` instead of a compose
  service name like `lgtm`).
- **Grafana datasource provisioning.** The same three-datasource, correlation-wired
  YAML shape (`templates/grafana-datasources.yaml` here, the Helm-chart-provisioned
  equivalent there) — see `lgtm-minikube-stack`'s `templates/grafana-datasources.yaml`.
- **Collector processor configs.** `otel-collector-base.yaml`,
  `-tail-sampling.yaml`, and `-cardinality.yaml` are portable as-is; only the
  deployment mechanism (a compose volume mount here, a ConfigMap there) changes.

## What does NOT carry over

- **Compose profiles.** Kubernetes has no equivalent primitive — component opt-in on
  minikube is handled by `ENABLE_*` env vars read by the bootstrap script, a
  different mechanism achieving the same "pay for what you use" goal.
  See `lgtm-minikube-stack`'s `references/opt-in-flags.md`.
- **`mem_limit`.** The Kubernetes equivalent is a Pod's
  `resources.limits.memory` — same underlying concern (don't let a JVM see the whole
  node's memory), different YAML shape.
- **Healthcheck blocks.** Kubernetes uses `livenessProbe` / `readinessProbe` on the
  Pod spec instead of a compose `healthcheck:` block. The *timing* lessons
  (`start_period` → `initialDelaySeconds`, roughly) transfer; the syntax doesn't.
- **Testcontainers/Dev Services against the cluster.** Dev Services still targets the
  Docker daemon directly for local dev loops even on a machine that also runs
  minikube — it doesn't provision into the cluster. Keep using it exactly as
  documented in `references/testcontainers-and-dev-services.md` regardless of
  whether minikube is also running.
- **Kafka/Postgres as plain containers.** On minikube, these become
  operator-managed custom resources (Strimzi `Kafka`/`KafkaTopic`, CloudNativePG
  `Cluster`) rather than a single `image:` line in compose — more moving parts, but
  gets you the operational behaviors (rolling upgrades, PVC-backed storage,
  reconciliation) that a bare container doesn't have.

## When NOT to make this jump

If the project's actual goal is "observability demo" or "local app dev loop," stay on
`docker compose`. The minikube stack is heavier to run (a whole cluster control
plane, an Istio sidecar per pod, operator reconciliation loops) and buys you nothing
until the project specifically needs to exercise Kubernetes-native behavior. Don't
build the Kubernetes substrate speculatively — reach for `lgtm-minikube-stack` only
when a Kubernetes-shaped requirement (mesh policy, HPA, an operator's failover
behavior) is actually in scope.
