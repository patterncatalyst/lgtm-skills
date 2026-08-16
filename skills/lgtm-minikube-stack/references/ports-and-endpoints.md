# Ports and endpoints

What lives where after the bootstrap completes. Reference when wiring services
together, debugging routing, or building the SSH tunnel script.

## Access model: NodePort + SSH tunnels

**Do NOT use `kubectl port-forward` for persistent service access.** Port-forward
connections drop under load and on idle timeouts, causing intermittent failures
that look like application bugs.

Instead, expose services via NodePort and use SSH tunnels to the minikube VM.
This gives stable, long-lived connections that survive idle periods.

### How it works

1. Services that need host access are defined with `type: NodePort` and a fixed
   `nodePort` in the 30000–32767 range.
2. An SSH tunnel script connects `localhost:<friendly-port>` to
   `minikube-vm:<nodePort>` via the minikube SSH key.
3. The tunnel uses `ServerAliveInterval=30` and `ExitOnForwardFailure=yes` for
   reliability.

## NodePort allocation map

Fixed NodePort assignments. These must not collide across the cluster.

| Service                | Namespace      | ClusterIP Port | NodePort | Local tunnel | Purpose                    |
|------------------------|----------------|---------------|----------|-------------|----------------------------|
| Grafana                | observability  | 80            | 30300    | 3000        | Grafana UI                 |
| OTel Collector (gRPC)  | observability  | 4317          | 30417    | 4317        | OTLP receiver (gRPC)       |
| OTel Collector (HTTP)  | observability  | 4318          | 30418    | 4318        | OTLP receiver (HTTP)       |
| Mimir                  | observability  | 80            | 30009    | 9009        | Mimir API (PromQL)         |
| Loki                   | observability  | 80            | 30100    | 3100        | Loki gateway (LogQL)       |
| Tempo                  | observability  | 3200          | 30320    | 3200        | Tempo query API            |
| Kiali                  | istio-system   | 20001         | 30201    | 20001       | Kiali mesh UI              |
| Apicurio (opt-in)      | {{NAMESPACE}}  | 8080          | 30084    | 8084        | Schema registry UI/API     |
| OpenMetadata (opt-in)  | {{NAMESPACE}}  | 8585          | 30585    | 8585        | Data catalog UI/API        |
| Redis (opt-in)         | {{NAMESPACE}}  | 6379          | 30379    | 6379        | Cache / pub-sub            |

Application services get NodePorts from 30080 upward — allocate per-project.

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
| `redis`                              | {{NAMESPACE}}    | 6379   | Redis     | Cache / pub-sub                  |
| `apicurio`                           | {{NAMESPACE}}    | 8080   | HTTP      | Schema registry API/UI           |
| `openmetadata`                       | {{NAMESPACE}}    | 8585   | HTTP      | OpenMetadata UI/API              |

## SSH tunnel script

Drop this into `scripts/tunnel-services.sh`. It replaces all `kubectl port-forward`
commands with stable SSH tunnels to NodePort services.

```bash
#!/usr/bin/env bash
set -euo pipefail

PROFILE="${MINIKUBE_PROFILE:-{{PROJECT_NAME}}}"
NAMESPACE="${NAMESPACE:-{{NAMESPACE}}}"

echo "Starting SSH tunnels to NodePort services (minikube profile: $PROFILE)"

# Kill previous tunnels
pkill -f "ssh.*docker@127.0.0.1" 2>/dev/null || true
sleep 1

# Resolve minikube SSH connection details
SSH_KEY="$(minikube ssh-key -p "$PROFILE")"
SSH_PORT="$(podman port "$PROFILE" 22/tcp 2>/dev/null | head -1 | cut -d: -f2)"

if [[ -z "$SSH_PORT" ]]; then
  echo "ERROR: Could not detect SSH port for profile '$PROFILE'"
  echo "Is minikube running? Try: minikube start -p $PROFILE"
  exit 1
fi

tunnel() {
  local local_port=$1 node_port=$2 label=$3
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR \
      -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes \
      -i "$SSH_KEY" -p "$SSH_PORT" \
      -L "${local_port}:localhost:${node_port}" \
      -N -f docker@127.0.0.1
  echo "  ✓ $label"
}

# ── Observability ──────────────────────────────────────────────
tunnel 3000 30300 "Grafana:          http://localhost:3000 (admin/admin)"
tunnel 4317 30417 "OTLP gRPC:        localhost:4317"
tunnel 4318 30418 "OTLP HTTP:        http://localhost:4318"
tunnel 9009 30009 "Mimir:            http://localhost:9009"
tunnel 3100 30100 "Loki:             http://localhost:3100"
tunnel 3200 30320 "Tempo:            http://localhost:3200"

# ── Mesh UI (if Istio enabled) ─────────────────────────────────
if kubectl get svc kiali -n istio-system >/dev/null 2>&1; then
  tunnel 20001 30201 "Kiali:            http://localhost:20001/kiali"
fi

# ── Opt-in services ────────────────────────────────────────────
if kubectl get svc apicurio -n "$NAMESPACE" >/dev/null 2>&1; then
  tunnel 8084 30084 "Apicurio:         http://localhost:8084"
fi

if kubectl get svc redis -n "$NAMESPACE" >/dev/null 2>&1; then
  tunnel 6379 30379 "Redis:            localhost:6379"
fi

if kubectl get svc openmetadata -n "$NAMESPACE" >/dev/null 2>&1; then
  tunnel 8585 30585 "OpenMetadata:     http://localhost:8585 (admin@open-metadata.org / admin)"
fi

echo ""
echo "SSH tunnels are stable — no more port-forward drops."
echo "Kill with: pkill -f 'ssh.*docker@127.0.0.1'"
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
