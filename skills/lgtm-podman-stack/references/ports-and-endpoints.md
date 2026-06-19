# Ports and Endpoints

Where everything lives by default. Use as a reference when wiring services together or troubleshooting "I can't reach X" issues.

## LGTM stack defaults

| Service | Port | Purpose | Access |
|---|---|---|---|
| Grafana UI | 3000 | Web interface | http://localhost:3000 |
| Loki HTTP | 3100 | Log ingestion + query | http://localhost:3100 |
| Tempo HTTP | 3200 | Trace query | http://localhost:3200 |
| Mimir / Prometheus | 9090 | Metric query, remote_write | http://localhost:9090 |
| OTLP gRPC | 4317 | Telemetry ingestion (gRPC) | grpc://localhost:4317 |
| OTLP HTTP | 4318 | Telemetry ingestion (HTTP) | http://localhost:4318 |

## Common application ports

| Service | Port | Notes |
|---|---|---|
| Application HTTP | 8080 | Spring Boot, Quarkus, FastAPI, Go default |
| Application HTTPS | 8443 | TLS variant |
| Application management | 8081 | Spring Actuator, secondary endpoints |
| Application debug | 5005 | JVM debug, when enabled |
| Postgres | 5432 | Standard Postgres port |
| Kafka (host clients) | 9092 | PLAINTEXT listener, advertised to localhost |
| Kafka (compose clients) | 9094 | PLAINTEXT listener, advertised inside the compose network |
| Kafka controller | 9093 | KRaft controller-to-controller (internal only) |
| Kafka UI (Provectus) | 8090 | Web UI for inspecting topics |

## OTLP endpoint paths

Use these when configuring SDKs or curl-testing the Collector:

| Signal | Method | Path |
|---|---|---|
| Traces | POST | `/v1/traces` |
| Metrics | POST | `/v1/metrics` |
| Logs | POST | `/v1/logs` |

For OTLP HTTP, the full URL is `http://lgtm:4318/v1/traces` (inside the compose network) or `http://localhost:4318/v1/traces` (from the host).

Most SDKs accept either:
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318` (without path; SDK appends)
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://lgtm:4318/v1/traces` (full path, per-signal override)

The path-less form is more portable across SDKs. Use it unless you need per-signal endpoints.

## Default credentials

| Service | Username | Password | Notes |
|---|---|---|---|
| Postgres (templates) | appuser | apppass | Change for non-trivial use |
| Grafana | (anonymous) | (none) | Anonymous admin enabled in templates |

Anonymous access for Grafana is a development convenience. **Never ship this configuration to production.** When productionizing, remove the `GF_AUTH_ANONYMOUS_*` environment variables and use proper authentication (OAuth, LDAP, or Grafana's local users).

## Conflict resolution

If any default port conflicts with something else on the host:

1. Change the **host side** of the port mapping in compose, not the container side:

   ```yaml
   ports:
     - "13000:3000"   # Now access Grafana at localhost:13000
   ```

   The container-internal port stays the same. Other services in the compose network can still reach Grafana at `http://lgtm:3000` because they use the container-internal port.

2. If you change the container-internal port, you also need to update the Collector's exporter URLs, the datasource definitions, and probably other things. Don't.

## Networking model recap

Inside a compose network:
- Services reach each other by service name on **container-internal ports**
- `http://lgtm:3000`, `http://postgres:5432`, `http://kafka:9094`

From the host machine:
- Services reach exposed containers via `localhost` on the **host-side port** of the mapping
- `http://localhost:3000`, `http://localhost:5432`, `http://localhost:9092`

These are different. Mixing them up is the most common "can't reach service" problem. See `known-issues.md` section 3.
