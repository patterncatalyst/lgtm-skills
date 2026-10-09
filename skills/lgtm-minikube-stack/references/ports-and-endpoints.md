# Ports and endpoints

What lives where after the bootstrap completes. Reference when wiring services
together, debugging routing, or choosing the `--ports` list for a profile.

## Access model: NodePorts published at cluster creation

**Never use `kubectl port-forward`, SSH tunnels, or `minikube tunnel`.** They drop
or disconnect mid-session and cause intermittent failures that look like
application bugs.

Expose services via NodePort and publish those ports to the host when the
profile is created, so `127.0.0.1:<nodePort>` reaches the service directly.

### How it works

1. Services that need host access are defined with `type: NodePort` and a fixed
   `nodePort` in the 30000-32767 range.
2. `setup-profile.sh` starts the profile with
   `minikube start --driver=docker --container-runtime=containerd --ports=127.0.0.1:<nodePort>:<nodePort>,...`.
   Host port = NodePort, bound to loopback only. Before creating the profile it
   checks every host port with `ss -ltn`; afterwards it verifies each mapping
   with `docker port <profile> <nodePort>/tcp`.
3. **Ports are fixed at profile creation.** Adding a NodePort later means
   recreating the profile: `./scripts/setup-profile.sh --replace`, then re-run
   `./scripts/bootstrap.sh`.
4. Host ports stay in 30000-32767, clear of host services. On Fedora Server and
   RHEL, Cockpit owns `9090`: never publish anything on host port `9090` (use
   `19090` or a NodePort for a Prometheus-style UI). The `9090` ports in the
   in-cluster table below are Service ports inside the cluster, not host ports.
5. OpenShift: use Routes.

### The `--ports` list

Default stack (LGTM on, Istio/Kiali on, KEDA on):

```
--ports=127.0.0.1:30300:30300,127.0.0.1:30417:30417,127.0.0.1:30418:30418,127.0.0.1:30009:30009,127.0.0.1:30100:30100,127.0.0.1:30320:30320,127.0.0.1:30201:30201,127.0.0.1:30081:30081
```

Opt-ins (append only when enabled):

| Opt-in               | Add                |
|----------------------|--------------------|
| Apicurio             | `30084:30084`      |
| OpenMetadata         | `30585:30585`      |
| Redis                | `30379:30379`      |

Project application NodePorts (30080 upward, allocated per project): add them to
`APP_NODE_PORTS` in `setup-profile.sh`, or pass `EXTRA_NODE_PORTS="30080,30082"`
when creating the profile. The template builds the `--ports` argument from the
`ENABLE_*` flags that `bootstrap.sh` exports. Then recreate the profile.

## NodePort allocation map

Fixed NodePort assignments. These must not collide across the cluster.

| Service                | Namespace      | ClusterIP Port | NodePort | Host port (127.0.0.1) | Purpose                    |
|------------------------|----------------|---------------|----------|-------------|----------------------------|
| Grafana                | observability  | 80            | 30300    | 30300      | Grafana UI                 |
| OTel Collector (gRPC)  | observability  | 4317          | 30417    | 30417      | OTLP receiver (gRPC)       |
| OTel Collector (HTTP)  | observability  | 4318          | 30418    | 30418      | OTLP receiver (HTTP)       |
| Mimir                  | observability  | 80            | 30009    | 30009      | Mimir API (PromQL)         |
| Loki                   | observability  | 80            | 30100    | 30100      | Loki gateway (LogQL)       |
| Tempo                  | observability  | 3200          | 30320    | 30320      | Tempo query API            |
| Kiali                  | istio-system   | 20001         | 30201    | 30201      | Kiali mesh UI              |
| Apicurio (opt-in)      | {{NAMESPACE}}  | 8080          | 30084    | 30084      | Schema registry UI/API     |
| OpenMetadata (opt-in)  | {{NAMESPACE}}  | 8585          | 30585    | 30585      | Data catalog UI/API        |
| Redis (opt-in)         | {{NAMESPACE}}  | 6379          | 30379    | 30379      | Cache / pub-sub            |
| KEDA interceptor (opt-in) | keda        | 8080          | 30081    | 30081      | Wake scaled-to-zero HTTP workloads (Host-routed) |

Application services get NodePorts from 30080 upward (skipping 30081, the KEDA interceptor) — allocate per-project and add them to the `--ports` list.

Kafka has no web UI or NodePort allocation here — it is inspected with `kcat`
(CLI) against `<service>-kafka-kafka-bootstrap.{{NAMESPACE}}.svc.cluster.local:9092`
from inside the cluster (run `kcat` in a pod; no port-forward).

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
| `mimir-gateway`                      | observability    | 80     | HTTP      | Mimir API (push, query, alerts)  |
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

## Waking scaled-to-zero HTTP workloads

When KEDA's HTTP add-on scales a Deployment to zero, its Service has **no
endpoints** until something wakes it. A published NodePort that points straight at
such a Deployment will therefore connect to nothing — the pod does not exist yet.

Wake the workload the real way: drive a request **through the KEDA HTTP
interceptor** using the interceptor NodePort (`127.0.0.1:30081`), and
set a `Host:` header that matches the workload's `HTTPScaledObject` host —
`<service>.<namespace>`:

```bash
curl -H "Host: my-service.{{NAMESPACE}}" http://127.0.0.1:30081/
```

The interceptor sees the request, tells KEDA to scale the Deployment up from
zero, buffers the request until a pod is Ready, then proxies it through. Once the
pod is up, its own NodePort (if any) has a live endpoint again.

Do **NOT** wake it with `kubectl scale` — KEDA's HTTP add-on owns the replica
count and reverts a manual scale straight back to zero. And do **NOT** use
`kubectl port-forward` or tunnels (see the access model above). The
interceptor path is the only stable way to wake a scaled-to-zero workload from
the host.

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
