# Versions: newest stable, checked upstream

**Rule.** Every component is pinned to its newest stable release (no rc, beta
or alpha), re-checked upstream at the start of work. The Kubernetes version is
the newest minor that every component supports (intersect the support
matrices); pass `--kubernetes-version` explicitly because minikube's default can
run ahead of the components. Never stay on an EOL line. Record any deliberate
hold with its reason (in the setup script comment and in the table below).

The same rule applies to OpenShift / CRC operator pins: install the newest CSV
in the channel and approve only that InstallPlan (do not approve an older
InstallPlan the subscription generated, and do not leave Manual approval
pending on a stale one).

## Re-check recipes

```bash
# GitHub releases (stable only)
gh release list -R istio/istio --exclude-pre-releases -L 5
gh release list -R kedacore/http-add-on --exclude-pre-releases -L 5
gh release list -R kubernetes/minikube --exclude-pre-releases -L 5

# Helm chart repos
helm repo add grafana-community https://grafana-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm search repo grafana-community/loki --versions | head -3
helm search repo grafana/mimir-distributed --versions | head -3
curl -s https://kedacore.github.io/charts/index.yaml | grep -m3 'version:'   # or any repo's index.yaml

# OCI charts
helm show chart oci://quay.io/strimzi-helm/strimzi-kafka-operator --version 1.2.0

# Container tags
skopeo list-tags docker://docker.io/library/redis | grep '^8\.'
skopeo inspect --no-tags docker://docker.io/otel/opentelemetry-collector-contrib:0.161.0

# Before bumping a chart: diff its values and render it with the skill's values
helm show values <repo>/<chart> --version <new> > new.yaml
helm template <rel> <repo>/<chart> --version <new> -f <values>   # confirm Service names and ports
```

Kubernetes: `gh release list -R kubernetes/kubernetes --exclude-pre-releases`
for the newest patch of each minor, then check each component's supported
Kubernetes range (Istio supported-releases page, Strimzi release notes, KEDA
compatibility table, CNPG supported releases, minikube release notes) and pick
the newest minor all of them list.

## Pin table (surveyed 2026-10-09)

| Component | Pin | Where | Notes |
|---|---|---|---|
| minikube | v1.39.0 (floor) | `setup-profile.sh` check | |
| Kubernetes | v1.36.5 | `setup-profile.sh` `--kubernetes-version` | override with `KUBERNETES_VERSION` |
| kubectl | 1.36.5 | host | within one minor of the cluster |
| helm | 4.x (3.13+ works) | host | |
| Istio | 1.31.1 | `setup-istio.sh` `ISTIO_VERSION` | istioctl must match; Kiali comes from the 1.31.1 addon manifest |
| KEDA | 2.21.0 | `setup-keda.sh` | chart 2.21.0 |
| KEDA HTTP add-on | 0.16.0 | `setup-keda.sh` | `interceptor.readinessTimeout` replaces `interceptor.replicas.waitTimeout`; see known-issues Issue 5 |
| Strimzi | 1.2.0 | `setup-kafka-operator.sh` | v1 CRDs only; Kafka 4.3.1 default |
| CloudNativePG | chart 0.29.1 (operator 1.30.1) | `setup-postgres-operator.sh` | Cluster `imageName: ghcr.io/cloudnative-pg/postgresql:18.6-standard-trixie` |
| Apicurio Registry | 3.3.3 | `setup-apicurio.sh` | |
| OpenMetadata | chart 2.0.5 (server and dependencies) | `setup-openmetadata.sh` | server chart: no removed keys vs 1.12.8; dependencies chart: Airflow keys reworked (unused here, Airflow off), new `fuseki` (off by default) |
| Grafana | chart 13.4.0 (Grafana 13.2.3) | `setup-lgtm.sh`, repo `grafana-community` | `sidecar.*.labelValue` must be a string (`--set-string`) |
| Loki | chart 18.15.1 (Loki 3.7.8) | `setup-lgtm.sh`, repo `grafana-community` | `deploymentMode=Monolithic` (SingleBinary is the deprecated name) |
| Tempo | chart 3.1.0 (Tempo 3.1.0) | `setup-lgtm.sh`, repo `grafana-community` | Tempo 3 removed the ingester (live-store, backend-scheduler/worker); the chart renders it |
| Mimir | `grafana/mimir-distributed` 6.2.1 (Mimir 3.2.1) | `setup-lgtm.sh` | lean values: ingest storage off, one replica each, filesystem; Service is `mimir-gateway` (was `mimir-nginx`) |
| OTel Collector | chart 0.175.1, image `otel/opentelemetry-collector-contrib:0.161.0` | `setup-lgtm.sh` | tag pinned to the chart's appVersion; Service name forced to `otel-collector` |
| Redis | 8.10.2-alpine | `setup-redis.sh` | |

Deliberate holds: none. (0.162.0 of the Collector exists but the chart
0.175.1 targets 0.161.0; bump chart and image together.)

## Things that bit during the bump

- **Kubernetes resource names change with the charts.** Mimir's gateway is
  `mimir-gateway`, not `mimir-nginx`; the Collector chart names its Service
  `<release>-opentelemetry-collector` unless `fullnameOverride=otel-collector`.
  Render with the skill's values and read the Service names before wiring
  datasources and exporters.
- **Grafana datasource UIDs.** Dashboards and the Tempo datasource link to
  `mimir`, `loki`, `tempo` by UID. The datasources in `grafana-datasources.yaml`
  set those UIDs explicitly; Grafana would otherwise generate random ones.
- **Mimir filesystem paths.** Mimir refuses a `*_storage.filesystem.dir` that
  overlaps a component working dir (`/data`). The lean values use sub-directories;
  validate any edit with `docker run grafana/mimir:<ver> -config.file=... -modules`.
- **Strimzi 1.x.** Kafka, KafkaNodePool, KafkaTopic and KafkaUser CRs must use
  `apiVersion: kafka.strimzi.io/v1`. The skill's templates ship no CRs (the
  Kafka and Cluster CRs live in the project's own charts); convert those.
