# Platform tier recipes

Each feature is one script under `openshift/platform/` plus one chart flag.
`install-platform.sh` runs them in order on a deployed core and requires
CRC at 12 vCPU / 32 GiB. Install order: mesh → autoscaling → tracing → AI →
native → GitOps (GitOps last, so it adopts the final values).

## Service mesh: OpenShift Service Mesh 3

`install-mesh.sh [--canary]`

- **Operators:** `servicemeshoperator3` (Sail) and `kiali-ossm`, pinned.
- **Control plane:** an `IstioCNI` (namespace `istio-cni`) and an `Istio`
  named `default` (namespace `istio-system`), both with an exact
  `spec.version` the operator offers (OSSM 3.4.3: v1.26-v1.30; pinned
  v1.30.5). Never the floating `v1.30-latest`.
- **Joining the mesh:** the pod-template **label** `istio.io/rev: default`
  (Sail's revisioned injection matches labels), added by `mesh.enabled`.
  No namespace-wide injection: Kafka, Postgres, otel-lgtm and Jobs stay out
  (a meshed Job hangs at 1/2).
- **Native sidecars:** `istio-proxy` is injected as an init container
  with `restartPolicy: Always` (verified: Istio v1.30.5 on Kubernetes 1.35).
  Mesh-membership checks look at
  `.spec.initContainers`; a meshed pod still reports `N/N` ready.
- **mTLS:** `PeerAuthentication default` STRICT for the namespace, plus a
  PERMISSIVE PeerAuthentication per service that has a Route: the router is
  not in the mesh and delivers plaintext, so STRICT there answers every
  Route request with a 502.
- **Canary** (`mesh.canary.enabled`, `mesh.canary.service`, `v2Weight`): a
  `<svc>-v2` Deployment (same image, label `version: v2`, always JVM), a
  `DestinationRule` with v1/v2 subsets and a weighted `VirtualService`.
  OSSM 3 provisions no ingress gateway and the edge is the Route, so the
  split applies to sidecar-to-sidecar calls. Verify with Istio's own
  `istio_requests_total` on the two pods (`pilot-agent request GET
  stats/prometheus`); a 90/10 split measured 91/9 of 100.
- **Kiali:** anonymous auth (single-user local cluster only),
  `discovery_selectors` limited to the project. OpenShift Local runs no
  user-workload Prometheus, so the graph needs one: with tracing installed,
  otel-lgtm's Prometheus scrapes the sidecars' merged metrics port 15020
  (outside mTLS) and `install-observability.sh` points Kiali at
  `http://lgtm.<ns>.svc.cluster.local:9090`.
- **Verify STRICT:** plaintext from an unmeshed pod to a meshed **Service**
  is reset (curl exit 56); from a meshed pod it answers 200. Use the Service
  name: a pod-IP call leaves the client sidecar as plaintext and is reset
  even from inside the mesh.

## Autoscaling: Custom Metrics Autoscaler

`install-keda.sh`

- Operator in `openshift-keda` (own-namespace OperatorGroup) and a
  `KedaController` watching all namespaces.
- `keda.enabled` renders a Kafka-lag `ScaledObject` for every service with a
  `keda:` block (topic, consumerGroup, lagThreshold, min/max replicas) and
  drops `replicas` from that Deployment.
- `bootstrapServers` must be the **FQDN**
  (`<cluster>-kafka-bootstrap.<ns>.svc.cluster.local:9092`): KEDA runs in
  `openshift-keda`, where the short name does not resolve, and the
  ScaledObject stays `Ready=False` with `no such host`.
- KEDA never scales past the topic's partition count (an auto-created topic
  has one partition: 0 → 1 → 0).
- CMA ships core KEDA only; the KEDA HTTP add-on has no counterpart.

## Tracing: Red Hat build of OpenTelemetry + otel-lgtm

`install-observability.sh`

- Operator `opentelemetry-product`. The chart's `Instrumentation`
  `<release>-java` sends traces (OTLP HTTP) to `lgtm:4318`; every JVM pod
  gets `instrumentation.opentelemetry.io/inject-java: <release>-java`. The
  operator injects the OpenTelemetry Java agent (init container
  `opentelemetry-auto-instrumentation`, `-javaagent` appended to
  `JAVA_TOOL_OPTIONS`). No pom or image change.
- Native pods are not annotated: a native binary cannot load a Java agent.
- **Injection race:** Helm creates the Deployments before the Instrumentation
  CR, so pods from the same upgrade can miss the webhook. The script
  restarts any annotated Deployment whose pod lacks the agent init container.
- **otel-lgtm under anyuid:** the image owns its data directories as UID 0.
  It runs with its own ServiceAccount bound to `anyuid` (a Role with `use`
  on that SCC) and a securityContext of **only** `runAsUser: 0`. anyuid
  allows no seccomp profile; adding `seccompProfile` (or the full
  restricted-v2 block) makes SCC admission pick restricted-v2 again, where
  Grafana cannot write its data directory. It is the only non-restricted-v2
  pod, and capture-evidence.sh allows exactly that exception.
- Grafana gets an edge Route (`/api/health`).

## AI tier: Ollama under restricted-v2

`install-ai.sh [ai-service...]`

- `ai.enabled` deploys Ollama with `HOME=/models`,
  `OLLAMA_MODELS=/models/models` on a PVC (10 Gi), `OLLAMA_HOST=0.0.0.0:11434`,
  and the restricted-v2 securityContext. No anyuid.
- The model is pulled by a plain Job (not a Helm hook, so `helm upgrade`
  does not block on a multi-GB download); the script waits on the Job.
- AI services are `services:` entries with `ai: true` (deployed only with
  the flag) and are built in-cluster like the rest. Services without a
  health extension use `probe: tcp`.

## Native build

See `image-builds.md`. `build-native.sh <svc>`, then
`deploy.sh --set native.enabled=true --set native.service=<svc>`.

## GitOps: OpenShift GitOps adopts the release

`install-gitops.sh [revision]`

- Operator `openshift-gitops-operator`; wait for the default `ArgoCD`
  `openshift-gitops` to be `Available`.
- Label the project `argocd.argoproj.io/managed-by=openshift-gitops` so the
  default instance may manage it.
- The `Application` (named after the release, in `openshift-gitops`, with
  the `resources-finalizer.argocd.argoproj.io` finalizer) renders the chart
  from git at a revision with `helm.valuesObject` = the running release's
  `helm get values`, so adoption changes nothing. Automated sync with prune
  and self-heal.
- **`lookup` is empty under Argo CD** (it renders with `helm template`), so
  the chart would mint a new Postgres password on every sync. The
  Application ignores that field and the sync respects the ignore:
  ```json
  "ignoreDifferences": [{"kind": "Secret", "name": "<release>-postgres-app", "jsonPointers": ["/data/password"]}],
  "syncOptions": ["RespectIgnoreDifferences=true", "ApplyOutOfSyncOnly=true"]
  ```
- The chart must be pushed to the repo/revision first. Verify self-heal by
  deleting the app ConfigMap and timing its return (2-3 s measured).
