# Ports and endpoints

What lives where after the bootstrap completes. Reference when wiring services
together, debugging routing, or remembering where the Grafana port-forward
goes.

## In-cluster service DNS

Services reachable by other pods in the cluster, by FQDN
`<service>.<namespace>.svc.cluster.local`.

| Service                              | Namespace        | Port   | Protocol  | Purpose                          |
|--------------------------------------|------------------|--------|-----------|----------------------------------|
| `otel-collector`                     | observability    | 4318   | OTLP/HTTP | OTLP receiver (HTTP)             |
| `otel-collector`                     | observability    | 4317   | OTLP/gRPC | OTLP receiver (gRPC)             |
| `otel-collector`                     | observability    | 13133  | HTTP      | Health check                     |
| `loki-gateway`                       | observability    | 80     | HTTP      | Loki write/query gateway         |
| `loki-gateway` (direct OTLP)         | observability    | 80     | OTLP      | OTLP-native logs path: `/otlp/...`|
| `tempo`                              | observability    | 3200   | HTTP      | Tempo query / search API         |
| `tempo`                              | observability    | 4317   | OTLP/gRPC | Tempo OTLP receiver              |
| `tempo`                              | observability    | 4318   | OTLP/HTTP | Tempo OTLP receiver              |
| `mimir-nginx`                        | observability    | 80     | HTTP      | Mimir API (push, query, alerts)  |
| `grafana`                            | observability    | 80     | HTTP      | Grafana UI                       |
| `keda-add-ons-http-interceptor-proxy`| keda             | 8080   | HTTP      | KEDA HTTP add-on interceptor     |
| `keda-add-ons-http-external-scaler`  | keda             | 9090   | gRPC      | KEDA HTTP add-on scaler          |
| `istiod`                             | istio-system     | 15010  | gRPC      | Istio XDS                        |
| `kiali`                              | istio-system     | 20001  | HTTP      | Kiali UI                         |
| `<service>` (your apps)              | {{NAMESPACE}}    | varies | HTTP/gRPC | Your application services        |
| `<service>-postgres-rw`              | {{NAMESPACE}}    | 5432   | psql      | Postgres primary (read-write)    |
| `<service>-postgres-ro`              | {{NAMESPACE}}    | 5432   | psql      | Postgres replicas (read-only)    |
| `<service>-kafka-kafka-bootstrap`    | {{NAMESPACE}}    | 9092   | Kafka     | Kafka bootstrap servers          |
| `apicurio`                           | {{NAMESPACE}}    | 8080   | HTTP      | Schema registry API/UI           |
| `openmetadata`                       | {{NAMESPACE}}    | 8585   | HTTP      | OpenMetadata UI/API              |

## Local port-forwards

What to port-forward when you want to use the UIs from the host:

```bash
# Grafana
kubectl port-forward -n observability svc/grafana 3000:80
# http://localhost:3000  (admin/admin)

# Tempo
kubectl port-forward -n observability svc/tempo 3200:3200
# search by traceID at /api/traces/<id>

# Loki
kubectl port-forward -n observability svc/loki-gateway 3100:80
# LogQL queries at /loki/api/v1/query_range

# Mimir
kubectl port-forward -n observability svc/mimir-nginx 9009:80
# PromQL queries at /prometheus/api/v1/query_range

# Kiali (Istio enabled)
kubectl port-forward -n istio-system svc/kiali 20001:20001
# http://localhost:20001/kiali

# Apicurio (opt-in)
kubectl port-forward -n {{NAMESPACE}} svc/apicurio 8081:8080
# http://localhost:8081

# OpenMetadata (opt-in)
kubectl port-forward -n {{NAMESPACE}} svc/openmetadata 8585:8585
# http://localhost:8585  (admin@open-metadata.org / admin)
```

## OpenTelemetry endpoints from your application code

The single emission target for application services. Set these as environment
variables on your application Deployments:

```yaml
env:
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "http://otel-collector.observability.svc.cluster.local:4318"
  - name: OTEL_EXPORTER_OTLP_PROTOCOL
    value: "http/protobuf"
  - name: OTEL_SERVICE_NAME
    value: "my-service"
  - name: OTEL_RESOURCE_ATTRIBUTES
    value: "deployment.environment=local,service.namespace=$(POD_NAMESPACE)"
```

OTLP HTTP (4318) is preferred over gRPC (4317) for development — curl works,
it's firewall-friendly, and the performance difference is negligible at
dev volumes.
