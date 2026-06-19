# Healthcheck Patterns

Health endpoint conventions vary by framework. This reference lists the common ones plus the compose healthcheck patterns that work with each.

## Endpoint paths by framework

| Framework / runtime | Liveness path | Readiness path | Notes |
|---|---|---|---|
| Spring Boot (Actuator) | `/actuator/health/liveness` | `/actuator/health/readiness` | Or `/actuator/health` for combined |
| Quarkus (SmallRye Health) | `/q/health/live` | `/q/health/ready` | Configurable root via `quarkus.smallrye-health.root-path` |
| FastAPI (Python) | `/health` | `/health` | Convention; you implement the handler |
| Flask (Python) | `/health` | `/health` | Convention; you implement the handler |
| Django (Python) | (no default) | (no default) | Install `django-health-check` |
| Go net/http | `/health` or `/healthz` | `/health` or `/healthz` | Convention; you implement the handler |
| Express (Node) | `/health` | `/health` | Convention; you implement the handler |
| ASP.NET Core | `/health` | `/health/ready` | Configurable via `app.MapHealthChecks` |
| Kubernetes convention | `/healthz` | `/readyz` | Used internally in k8s components |

## Liveness vs readiness

**Liveness**: "Is this process alive?" Liveness checks should rarely fail — if they do, the orchestrator restarts the container. False positives (orchestrator restarts a healthy container) are worse than missing a real failure.

**Readiness**: "Is this process ready to handle traffic?" Readiness can fail during startup, during deploys, during dependency outages. The orchestrator stops routing traffic but doesn't restart.

For local compose use, the distinction matters less — we usually just need "is this ready to serve." Use the readiness endpoint when given a choice, or the combined health endpoint if available.

## Compose healthcheck patterns

The compose templates use these patterns. Adjust per service.

### Standard HTTP healthcheck

```yaml
healthcheck:
  test: ["CMD", "curl", "-sf", "http://localhost:8080/health"]
  interval: 5s
  timeout: 3s
  retries: 12
  start_period: 30s
```

Requires `curl` in the container image. If using a distroless image:

```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
```

`wget` is also often missing. For truly minimal images:

```yaml
healthcheck:
  test: ["CMD", "/your-app", "--health-check"]
```

Implement a `--health-check` flag in your binary that does a self-check and exits 0/1.

### CMD vs CMD-SHELL

```yaml
# CMD: exec form, no shell interpretation
test: ["CMD", "curl", "-sf", "http://localhost:8080/health"]

# CMD-SHELL: runs through sh -c, allows pipes/redirects/env vars
test: ["CMD-SHELL", "curl -sf http://localhost:$PORT/health || exit 1"]
```

Prefer `CMD` form when you don't need shell features. It's faster and avoids quoting issues.

### Postgres healthcheck

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
  interval: 5s
  timeout: 3s
  retries: 12
  start_period: 10s
```

`pg_isready` is bundled with Postgres images. It returns 0 if the server accepts connections.

### Kafka healthcheck

```yaml
healthcheck:
  test: ["CMD-SHELL", "/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 >/dev/null 2>&1"]
  interval: 5s
  timeout: 5s
  retries: 12
  start_period: 30s
```

`kafka-broker-api-versions.sh` is in the official Apache Kafka image. It exits 0 if the broker responds. Other healthcheck approaches (TCP probes, listing topics) work too; this one is reliable across versions.

### Redis healthcheck

```yaml
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 5s
  timeout: 3s
  retries: 12
```

### Custom application healthcheck

For an application without a built-in health endpoint, implement one. The minimum:

```
GET /health
→ 200 OK if the process is functional
→ 503 if a critical dependency is missing
```

Don't make it too clever. A healthcheck that does deep dependency checks (database query, downstream API call) can mark a service unhealthy due to transient downstream failures, triggering cascading restarts. Keep it lightweight; check downstream readiness only on the readiness endpoint, not liveness.

## Timing parameters explained

```yaml
healthcheck:
  test: [...]
  interval: 5s        # How often to poll once "started"
  timeout: 3s         # Max time for one poll to complete
  retries: 12         # Mark unhealthy after N consecutive failures
  start_period: 30s   # During this grace period, failures don't count
```

The math: a service is reported unhealthy when `retries × interval` of failure happens *after* `start_period` elapses. With defaults above: `12 × 5s = 60s` of consecutive failure post-startup.

**Why `start_period` is the most important.** Without it, the service is reported unhealthy *during normal startup* if it takes longer than `retries × interval` seconds to start. This breaks `depends_on: condition: service_healthy` ordering — dependent services start before dependencies are ready.

## Adjust based on actual startup time

Don't guess. Measure. Time a few cold starts of your service:

```bash
podman compose up -d your-service
podman logs -f your-service
# Watch for the "started" / "listening" log line, note how long it took
```

Set `start_period` to roughly 2× the observed startup time. The 2× factor handles slower CI runners, cold caches, and the occasional bad day.

## Common debug commands

When a healthcheck isn't working:

```bash
# What does the healthcheck command actually output?
podman exec your-container curl -v http://localhost:8080/health

# Recent healthcheck attempts
podman inspect your-container | jq '.[].State.Health.Log'

# Force a check now
podman healthcheck run your-container
```

These usually point at the problem within 30 seconds.
