# LGTM on minikube: sizing

The four LGTM components plus the OTel Collector use modest resources by
backend-storage standards (single-binary / monolithic mode, filesystem
storage, no replication). At rest on an idle cluster they consume roughly:

| Component       | Replicas  | Memory (idle)  | CPU (idle) | Disk PVC |
|-----------------|-----------|----------------|------------|----------|
| Loki            | 1         | ~200 MiB       | <100m      | 5 GiB    |
| Grafana         | 1         | ~150 MiB       | <50m       | 2 GiB    |
| Tempo           | 1         | ~250 MiB       | <100m      | 5 GiB    |
| Mimir           | 1 each\*  | ~600 MiB       | <300m      | varies   |
| OTel Collector  | 1         | ~80 MiB        | <100m      | none     |
| Kiali (opt)     | 1         | ~100 MiB       | <50m       | none     |
| **Total**       | —         | **~1.4 GiB**   | **~700m**  | ~12 GiB  |

\* Mimir's distributed chart deploys several components (distributor, ingester,
querier, query-frontend, store-gateway, compactor); on a single node they each
get one replica. Memory is the sum.

Under load (real metrics, traces, logs flowing), memory grows roughly with
ingest rate. At ~1000 spans/s + 1000 metrics/s + 100 log lines/s — a busy
demo workload — the stack uses ~2.5 GiB total. The verified 24 GB minikube
profile has comfortable headroom for the stack plus application workloads.

## How to trim on a smaller host

If your host has 16 GB of RAM (not the verified 64 GB), the stack runs but
the cluster headroom is tight. Three places to trim:

### Disable Mimir; use Prometheus instead

Mimir is the heaviest LGTM component (~600 MiB across its sub-components).
For a small project that doesn't need long-term metric storage or PromQL
federation, a single Prometheus pod handles the same job at ~150 MiB.

To switch:
1. Set `ENABLE_LGTM=false` to skip the full LGTM install.
2. Install Prometheus separately via the prometheus-community chart.
3. Update the Grafana datasource (`grafana-datasources.yaml`) to point at
   the Prometheus Service URL instead of `mimir-nginx`.

The application code doesn't change — it still emits OTLP to the Collector,
and the Collector still routes metrics to "the metrics backend"; only the
backend's identity differs.

### Drop Loki if you don't need centralized logs

If your debugging flow is `kubectl logs` directly to pods (fine for a single
laptop), Loki adds 200 MiB for limited additional value. Disable it by
commenting out the Loki install in `setup-lgtm.sh` and removing the Loki
exporter from the Collector config.

### Drop the trace dashboards if you only emit metrics

Tempo + the trace pipeline in the Collector use roughly 350 MiB combined. If
your application emits metrics and logs but not traces, skip Tempo entirely.

## Sizing for production

These sizing notes are for laptop minikube only. Production deployments use
distributed mode (separate ingester / distributor / querier / store-gateway),
S3-backed storage instead of filesystem PVCs, and HA replicas of every
component. That's a different document.

## Estimating capacity

A rough rule for the stack at steady state on a single minikube node:

- **Hot data window** (queryable without slow store-gateway lookups): the
  filesystem PVCs hold ~24 hours of metrics at 1000 active series, ~6 hours
  of traces at 100 spans/s, ~12 hours of logs at 50 lines/s. Beyond the
  window, queries still work but get slower.
- **Retention**: data is deleted when the PVCs fill. The chart values size
  PVCs at 5 GiB each (defaults above), which gives ~1-2 weeks of typical demo
  workload before PVC pressure becomes the limiting factor.

For longer retention, increase the PVC sizes in `setup-lgtm.sh`.
