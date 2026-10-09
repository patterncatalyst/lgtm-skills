#!/usr/bin/env bash
#
# setup-lgtm.sh — install the LGTM observability stack into the cluster.
#
#   Loki (L)   — log aggregation, monolithic mode, filesystem storage
#   Grafana (G) — visualization, with datasources + dashboards provisioned
#   Tempo (T)   — distributed tracing, single-binary chart, filesystem storage
#   Mimir (M)   — metrics, mimir-distributed chart trimmed to one replica per
#                 component, classic ingesters (ingest storage / Kafka off),
#                 filesystem storage
#   OTel Collector — single deployment pod that receives OTLP and routes
#                    signals to the three backends
#
# Loki and Tempo run in monolithic / single-binary mode; Mimir keeps its
# distributed topology (the chart has no single-binary mode) at one replica
# each. This is a single-node minikube; production deployments scale each
# component out across nodes with object storage.
#
# Grafana, Loki and Tempo come from the grafana-community chart repo
# (https://grafana-community.github.io/helm-charts). Mimir stays on
# grafana/mimir-distributed. Chart versions are the newest stable at the time
# of the last survey; see references/versions.md for how to re-check.
#
# Apps emit OTLP to the Collector at otel-collector.<obs_ns>.svc.cluster.local
# (HTTP on 4318, gRPC on 4317). The Collector routes:
#   logs    -> Loki  (loki-gateway.<obs_ns>.svc:80, /loki/api/v1/push)
#   traces  -> Tempo (tempo.<obs_ns>.svc:4317 OTLP gRPC)
#   metrics -> Mimir (mimir-gateway.<obs_ns>.svc:80, /api/v1/push)
#
# Idempotent: helm upgrade --install everywhere, kubectl apply for the
# config-only resources.
#
# Usage:
#   ./scripts/setup-lgtm.sh

set -euo pipefail

NAMESPACE="${OBS_NAMESPACE:-observability}"

# Chart versions — newest stable, pinned for reproducibility. Re-check upstream
# at the start of work (references/versions.md); bump deliberately, not by drift.
LOKI_VERSION="${LOKI_VERSION:-18.15.1}"        # grafana-community/loki   (Loki 3.7.8)
TEMPO_VERSION="${TEMPO_VERSION:-3.1.0}"        # grafana-community/tempo  (Tempo 3.1.0)
MIMIR_VERSION="${MIMIR_VERSION:-6.2.1}"        # grafana/mimir-distributed (Mimir 3.2.1)
GRAFANA_VERSION="${GRAFANA_VERSION:-13.4.0}"   # grafana-community/grafana (Grafana 13.2.3)
OTEL_COLLECTOR_VERSION="${OTEL_COLLECTOR_VERSION:-0.175.1}"
# The chart's appVersion is 0.161.0; the contrib image tag is pinned to match.
OTEL_COLLECTOR_IMAGE_TAG="${OTEL_COLLECTOR_IMAGE_TAG:-0.161.0}"

command -v kubectl >/dev/null 2>&1 || { printf 'ERROR: kubectl not in PATH.\n' >&2; exit 1; }
command -v helm    >/dev/null 2>&1 || { printf 'ERROR: helm not in PATH.\n' >&2; exit 1; }

# ─── Pin every call to the profile's context ───────────────────────────────
# kubectl's current-context is never read or changed. bootstrap.sh exports
# KUBE_CONTEXT; when running this script alone, export it yourself.
KUBE_CONTEXT="${KUBE_CONTEXT:?export KUBE_CONTEXT=<minikube profile> (bootstrap.sh sets it)}"
kubectl()  { command kubectl --context "$KUBE_CONTEXT" "$@"; }
helm()     { command helm --kube-context "$KUBE_CONTEXT" "$@"; }

# ─── helm repos ─────────────────────────────────────────────────────────────
printf '==> Ensuring helm repos are registered\n'
for repo in \
    "grafana-community=https://grafana-community.github.io/helm-charts" \
    "grafana=https://grafana.github.io/helm-charts" \
    "open-telemetry=https://open-telemetry.github.io/opentelemetry-helm-charts"
do
    name="${repo%=*}"; url="${repo#*=}"
    if helm repo list 2>/dev/null | awk 'NR>1{print $1}' | grep -qx "$name"; then
        helm repo update "$name" >/dev/null
    else
        helm repo add "$name" "$url"
    fi
done
helm repo update grafana-community grafana open-telemetry >/dev/null 2>&1 || true

# ─── Namespace ──────────────────────────────────────────────────────────────
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f - >/dev/null

# ─── Apply the project's grafana datasource + dashboard ConfigMaps ─────────
# (These ship in observability/grafana-* in the project tree; created before
# Grafana installs so the chart can mount them via sidecar.)
if [[ -f "observability/grafana-datasources.yaml" ]]; then
    printf '==> Applying Grafana datasource ConfigMap\n'
    kubectl apply -n "$NAMESPACE" -f observability/grafana-datasources.yaml
fi
if [[ -d "observability/grafana-dashboards" ]]; then
    printf '==> Applying Grafana dashboard ConfigMaps\n'
    for f in observability/grafana-dashboards/*.yaml; do
        [[ -f "$f" ]] && kubectl apply -n "$NAMESPACE" -f "$f"
    done
fi

# ─── Loki (monolithic mode) ──────────────────────────────────────────────
printf '==> Installing Loki %s (monolithic mode)\n' "$LOKI_VERSION"
# deploymentMode=Monolithic is the current name for the old SingleBinary mode.
helm upgrade --install loki grafana-community/loki \
    --version "$LOKI_VERSION" \
    --namespace "$NAMESPACE" \
    --wait \
    --set deploymentMode=Monolithic \
    --set 'loki.commonConfig.replication_factor=1' \
    --set 'loki.storage.type=filesystem' \
    --set 'loki.auth_enabled=false' \
    --set 'loki.schemaConfig.configs[0].from=2024-01-01' \
    --set 'loki.schemaConfig.configs[0].store=tsdb' \
    --set 'loki.schemaConfig.configs[0].object_store=filesystem' \
    --set 'loki.schemaConfig.configs[0].schema=v13' \
    --set 'loki.schemaConfig.configs[0].index.prefix=loki_index_' \
    --set 'loki.schemaConfig.configs[0].index.period=24h' \
    --set 'singleBinary.replicas=1' \
    --set 'singleBinary.persistence.enabled=true' \
    --set 'singleBinary.persistence.size=5Gi' \
    --set 'chunksCache.enabled=false' \
    --set 'resultsCache.enabled=false' \
    --set 'minio.enabled=false' \
    --set 'read.replicas=0' \
    --set 'write.replicas=0' \
    --set 'backend.replicas=0' \
    --set 'gateway.enabled=true' \
    --set 'gateway.replicas=1' \
    --set 'lokiCanary.enabled=false' \
    --set 'test.enabled=false'

# ─── Tempo (single-binary chart) ────────────────────────────────────────────
# Tempo 3 removed the ingester (live-store + backend-scheduler/worker replace it);
# the chart renders that config, so only storage and receivers are set here.
printf '==> Installing Tempo %s (single-binary chart)\n' "$TEMPO_VERSION"
helm upgrade --install tempo grafana-community/tempo \
    --version "$TEMPO_VERSION" \
    --namespace "$NAMESPACE" \
    --wait \
    --set 'tempo.storage.trace.backend=local' \
    --set 'tempo.storage.trace.local.path=/var/tempo/traces' \
    --set 'persistence.enabled=true' \
    --set 'persistence.size=5Gi' \
    --set 'tempo.receivers.otlp.protocols.grpc.endpoint=0.0.0.0:4317' \
    --set 'tempo.receivers.otlp.protocols.http.endpoint=0.0.0.0:4318'

# ─── Mimir (lean, classic ingesters) ────────────────────────────────────────
# mimir-distributed 6.x defaults to the ingest-storage architecture (Kafka in
# the write path). That is too heavy for one node, so this turns it off:
# distributors push straight to the ingesters (the classic architecture, still
# supported in Mimir 3.x), every component runs one replica, the memcached
# caches, MinIO, Kafka and rollout-operator are off, and storage is the
# filesystem. Filesystem blocks are per-pod, so the store-gateway cannot see
# blocks another pod uploaded; recent data is served by the ingester, which is
# what a dev stack queries. Each *_storage dir must not overlap the component's
# working dir (/data), hence the sub-directories below (validated with
# `mimir -config.file=... -modules`).
printf '==> Installing Mimir %s (lean: single replicas, classic ingesters)\n' "$MIMIR_VERSION"
MIMIR_VALUES="$(mktemp)"
trap 'rm -f "$MIMIR_VALUES"' EXIT
cat >"$MIMIR_VALUES" <<'MIMIR_VALUES_EOF'
kafka:
  enabled: false
minio:
  enabled: false
rollout_operator:
  enabled: false
chunks-cache:
  enabled: false
index-cache:
  enabled: false
metadata-cache:
  enabled: false
results-cache:
  enabled: false
metaMonitoring:
  serviceMonitor:
    enabled: false
mimir:
  structuredConfig:
    ingest_storage:
      enabled: false
    ingester:
      push_grpc_method_enabled: true
      ring:
        replication_factor: 1
    store_gateway:
      sharding_ring:
        replication_factor: 1
    compactor:
      data_dir: /data/compactor
    ruler:
      rule_path: /data/ruler-work
    alertmanager:
      data_dir: /data/alertmanager-work
    blocks_storage:
      backend: filesystem
      filesystem:
        dir: /data/blocks
    ruler_storage:
      backend: filesystem
      filesystem:
        dir: /data/ruler-store
    alertmanager_storage:
      backend: filesystem
      filesystem:
        dir: /data/alertmanager-store
ingester:
  replicas: 1
  zoneAwareReplication:
    enabled: false
  persistentVolume:
    size: 5Gi
store_gateway:
  replicas: 1
  zoneAwareReplication:
    enabled: false
  persistentVolume:
    size: 2Gi
compactor:
  replicas: 1
  persistentVolume:
    size: 2Gi
alertmanager:
  replicas: 1
  zoneAwareReplication:
    enabled: false
  persistentVolume:
    size: 1Gi
distributor:
  replicas: 1
querier:
  replicas: 1
query_frontend:
  replicas: 1
query_scheduler:
  replicas: 1
ruler:
  replicas: 1
overrides_exporter:
  replicas: 1
gateway:
  replicas: 1
MIMIR_VALUES_EOF
helm upgrade --install mimir grafana/mimir-distributed \
    --version "$MIMIR_VERSION" \
    --namespace "$NAMESPACE" \
    --values "$MIMIR_VALUES" \
    --wait --timeout 10m

# ─── OpenTelemetry Collector (single deployment pod) ────────────────────────
printf '==> Installing OpenTelemetry Collector %s (contrib %s)\n' \
    "$OTEL_COLLECTOR_VERSION" "$OTEL_COLLECTOR_IMAGE_TAG"
# Apply the canonical 3-signal Collector config (from observability/) if present
if [[ -f "observability/otel-collector-config.yaml" ]]; then
    kubectl apply -n "$NAMESPACE" -f observability/otel-collector-config.yaml
fi
# fullnameOverride keeps the Service at otel-collector.<ns>.svc (the chart
# would otherwise name it otel-collector-opentelemetry-collector).
helm upgrade --install otel-collector open-telemetry/opentelemetry-collector \
    --version "$OTEL_COLLECTOR_VERSION" \
    --namespace "$NAMESPACE" \
    --wait \
    --set 'fullnameOverride=otel-collector' \
    --set 'mode=deployment' \
    --set 'replicaCount=1' \
    --set 'image.repository=otel/opentelemetry-collector-contrib' \
    --set-string "image.tag=${OTEL_COLLECTOR_IMAGE_TAG}" \
    --set 'configMap.create=false' \
    --set 'configMap.existingName=otel-collector-config' \
    --set 'ports.otlp.enabled=true' \
    --set 'ports.otlp-http.enabled=true' \
    --set 'service.enabled=true' \
    --set 'service.type=NodePort' \
    --set 'ports.otlp.nodePort=30417' \
    --set 'ports.otlp-http.nodePort=30418'

# ─── Grafana (with datasources + dashboards pre-provisioned) ────────────────
printf '==> Installing Grafana %s\n' "$GRAFANA_VERSION"
# labelValue must be a string ("1"): the Grafana 13 chart rejects an integer.
helm upgrade --install grafana grafana-community/grafana \
    --version "$GRAFANA_VERSION" \
    --namespace "$NAMESPACE" \
    --wait \
    --set 'persistence.enabled=true' \
    --set 'persistence.size=2Gi' \
    --set 'adminUser=admin' \
    --set 'adminPassword=admin' \
    --set 'service.type=NodePort' \
    --set 'service.nodePort=30300' \
    --set 'sidecar.datasources.enabled=true' \
    --set 'sidecar.datasources.label=grafana_datasource' \
    --set-string 'sidecar.datasources.labelValue=1' \
    --set 'sidecar.dashboards.enabled=true' \
    --set 'sidecar.dashboards.label=grafana_dashboard' \
    --set-string 'sidecar.dashboards.labelValue=1' \
    --set 'sidecar.dashboards.folderAnnotation=grafana_folder' \
    --set 'sidecar.dashboards.provider.foldersFromFilesStructure=true'

# ─── NodePorts for Loki, Tempo, Mimir ───────────────────────────────────────
# The charts expose these on ClusterIP only; add NodePort Services next to
# them for the ports setup-profile.sh publishes (30100 / 30320 / 30009).
printf '==> Publishing Loki / Tempo / Mimir NodePorts\n'
kubectl apply -n "$NAMESPACE" -f - <<EOF
apiVersion: v1
kind: Service
metadata: {name: loki-nodeport}
spec:
  type: NodePort
  selector: {app.kubernetes.io/name: loki, app.kubernetes.io/instance: loki, app.kubernetes.io/component: gateway}
  ports: [{name: http, port: 80, targetPort: http, nodePort: 30100}]
---
apiVersion: v1
kind: Service
metadata: {name: tempo-nodeport}
spec:
  type: NodePort
  selector: {app.kubernetes.io/name: tempo, app.kubernetes.io/instance: tempo}
  ports: [{name: http, port: 3200, targetPort: 3200, nodePort: 30320}]
---
apiVersion: v1
kind: Service
metadata: {name: mimir-nodeport}
spec:
  type: NodePort
  selector: {app.kubernetes.io/name: mimir, app.kubernetes.io/instance: mimir, app.kubernetes.io/component: gateway}
  ports: [{name: http, port: 80, targetPort: http-metrics, nodePort: 30009}]
EOF

# ─── Done ───────────────────────────────────────────────────────────────────
printf '\n==> LGTM stack installed in the %s namespace.\n\n' "$NAMESPACE"
printf 'Reach the UIs on the NodePorts published at cluster creation:\n'
printf '    Grafana at http://127.0.0.1:30300  (admin/admin)\n'
printf '    Tempo   at http://127.0.0.1:30320\n'
printf '    Loki    at http://127.0.0.1:30100\n'
printf '    Mimir   at http://127.0.0.1:30009\n'
printf '\n'
printf 'Applications should emit OTLP to:\n'
printf '  HTTP:  http://otel-collector.%s.svc.cluster.local:4318\n' "$NAMESPACE"
printf '  gRPC:  otel-collector.%s.svc.cluster.local:4317\n' "$NAMESPACE"
