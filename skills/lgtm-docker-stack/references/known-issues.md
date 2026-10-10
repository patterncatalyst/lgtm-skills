# Known Issues — Read This First

The gotchas that bite people setting up local observability stacks on **Docker**
specifically. Each one wasted hours the first time someone hit it. Each has a clean
fix.

---

## 1. `mem_limit` and the compressed-oops trap

**Symptom.** A service runs fine on its own, but fails inside compose with cryptic errors. JVM-based services in particular show:

```
[warning][cds] The saved state of UseCompressedOops and
UseCompressedClassPointers is different from runtime, CDS will be disabled.
[error][cds] Unable to map shared spaces
```

Or Postgres allocates more memory than expected, or Node services use unexpected V8 heap sizes.

**Cause.** Containers without explicit `mem_limit` inherit the full memory budget
visible to the Docker daemon — on Linux that's the host; on Docker Desktop
(macOS/Windows) it's whatever the Desktop VM is configured with (commonly larger than
you'd expect). Runtime ergonomics (JVM `MaxRAMPercentage`, Node
`--max-old-space-size` defaults, V8 heap calculations, Postgres `shared_buffers`
ratios) compute their allocation against that full pool.

For the JVM specifically, this crosses the compressed-oops threshold (~32 GB heap). Compressed oops get disabled. AOT caches built with compressed oops can't load. Cold starts regress dramatically.

**Fix.** Always set `mem_limit` on services that:

- Run on the JVM with `MaxRAMPercentage` set
- Use AOT caches (Project Leyden, GraalVM CDS, Quarkus aot)
- Have memory-percentage allocation logic (Postgres `shared_buffers`, Java heap settings)
- Run on hosts (or a Docker Desktop VM) sized > 32 GB RAM

Reasonable defaults:

```yaml
services:
  app:
    mem_limit: 512m  # Most apps; bump to 1g if needed

  postgres:
    mem_limit: 1g

  kafka:
    mem_limit: 1g
```

**Docker Desktop specific.** Check Settings → Resources → Memory. Docker Desktop's
VM has its own memory ceiling independent of the host; a `mem_limit` set higher than
the VM's total memory is silently capped, and OOM-killed containers under memory
pressure look identical to a crash. If containers are getting killed unexpectedly,
check `docker system df` and the Desktop resource dashboard before debugging the app.

**Why this matters more than you'd think.** "It works on my laptop but not on my coworker's" is often this — coworker's Docker Desktop VM (or host) has more RAM than yours, which triggers different runtime ergonomics, which triggers a bug you've never seen.

---

## 2. SELinux `:Z` flag on Fedora / RHEL

**Symptom.** Containers start but immediately fail with permission errors on mounted files:

```
permission denied: /etc/otelcol/config.yaml
```

Even though the file exists, is readable, and has correct Unix permissions.

**Cause.** On Fedora/RHEL hosts running the Docker Engine package with SELinux in
enforcing mode, bind mounts are subject to SELinux context checks — the container's
process runs under a context that doesn't match the host directory's label, and
access is blocked.

**Fix.** Append `:Z` to bind-mount paths in compose files:

```yaml
volumes:
  - ./otelcol/config.yaml:/otel-lgtm/otelcol-config.yaml:Z
  - ./db/init:/docker-entrypoint-initdb.d:Z
```

`:Z` relabels the host directory with a container-private SELinux context. `:z` (lowercase) does the same with a *shared* context — appropriate when multiple containers need access to the same volume.

**Cross-platform.** `:Z` is a no-op on Ubuntu, Debian, Docker Desktop (macOS), and Docker Desktop (Windows/WSL2). There's no downside to including it everywhere. Better to always have it than to discover the missing flag during a Fedora demo.

---

## 3. Service-name DNS, not `localhost`

**Symptom.** Application logs say things like:

```
ERROR  Connection refused: localhost:4318
ERROR  Could not connect to broker at localhost:9092
```

The Collector / Kafka / Postgres is clearly running (`docker compose ps` says healthy). But the app can't reach it.

**Cause.** Inside a compose network, each container sees `localhost` as itself. `localhost` from inside the `app` container points to the `app` container, not to the `lgtm` or `postgres` container. The compose port mapping (`"3000:3000"`) is for host-to-container access, not container-to-container.

**Fix.** Use service names (the compose service key) as DNS names. Compose's embedded DNS server resolves them automatically:

```yaml
environment:
  # WRONG
  - OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

  # RIGHT
  - OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318
```

Similarly:
- `DB_HOST=postgres` (not `localhost`)
- `KAFKA_BOOTSTRAP_SERVERS=kafka:9094` (not `localhost:9092`)

**Exception 1.** Scripts running on the *host* (e.g., a benchmark script you run from your laptop terminal) DO use `localhost` because they're not in the compose network. The port mapping forwards them through.

**Exception 2.** A process running on the host but wanting to reach into a container
(the reverse direction) needs `host.docker.internal` from *inside* the container to
reach back out to the host — see `references/ports-and-endpoints.md`.

---

## 4. Healthcheck `start_period` is what you actually need

**Symptom.** Services flap between healthy and unhealthy during startup. Dependent services start before their dependencies are actually ready. Compose reports a service as unhealthy even though it's just starting normally.

**Cause.** Default healthcheck behavior starts polling immediately, fails fast, and considers a few failed attempts as "unhealthy." For services with multi-second cold starts (JVM apps, Postgres, Kafka), this declares them dead during normal initialization.

**Fix.** Always set `start_period` to cover the longest legitimate startup time:

```yaml
healthcheck:
  test: ["CMD", "curl", "-sf", "http://localhost:8080/health"]
  interval: 5s          # Poll every 5s once started
  timeout: 3s           # Each poll has 3s to respond
  retries: 12           # Mark unhealthy after 12 consecutive failures
  start_period: 30s     # During this initial window, failures DON'T COUNT
```

Reasonable `start_period` values:

| Service type | start_period |
|---|---|
| Static binary (Go, Rust, C++) | 5s |
| Quarkus / Node.js | 10s |
| Postgres | 10s |
| Spring Boot / Java with framework | 30s |
| Spring Boot with JPA / Hibernate | 45s |
| Kafka (KRaft mode) | 30s |
| Python apps with significant imports | 15s |

When in doubt, set higher. A long `start_period` costs nothing if startup is fast; a short one breaks dependent service ordering when startup is slow.

---

## 5. Image tag drift

**Symptom.** A compose file worked last month, breaks today with no code changes. Maybe a `:latest` tag now points to an incompatible major version. Maybe a Red Hat UBI tag rolled forward and broke an assumption.

**Cause.** Tags that don't pin a specific version drift over time. `:latest` is the most obvious offender, but even patch-level tags (`:1.24`) can be replaced when a registry rebuilds them.

**Fix.** Pin to specific versions in compose files, and refresh pulls during talk preparation:

```yaml
# AVOID
image: docker.io/grafana/otel-lgtm:latest

# PREFER
image: docker.io/grafana/otel-lgtm:0.36.0
```

For a project that ships demos to other people: include a `make pull` or
shell script that pre-pulls every image so you don't discover network or
tag issues during a presentation:

```bash
#!/bin/bash
# scripts/pull-all.sh — refresh all images used by this project
for image in $(grep -E '^\s+image:' compose*.yaml | awk '{print $2}' | sort -u); do
  echo "→ $image"
  docker pull "$image" || { echo "FAILED: $image"; exit 1; }
done
```

Run this before any demo or talk. Catches drift before it bites.

---

## 6. `docker compose` (v2 plugin) vs `docker-compose` (legacy v1)

**Symptom.** A command from an old tutorial or Stack Overflow answer
(`docker-compose up -d`) fails with `command not found`, or behaves subtly
differently than expected (different `.env` interpolation rules, different exit
codes).

**Cause.** `docker-compose` (with the hyphen) was the standalone Python-based v1
tool. It's end-of-life and often not installed at all on current systems — Compose
functionality now ships as a Docker CLI plugin (`docker compose`, no hyphen,
written in Go, bundled with Docker Desktop and available as `docker-compose-plugin`
on Linux).

**Fix.** Always use the space form: `docker compose up -d`, `docker compose logs -f`,
`docker compose down -v`. If a host genuinely only has the legacy binary, install the
plugin (`sudo apt-get install docker-compose-plugin` / equivalent) rather than
writing v1-flavored automation that will need rewriting later.

---

## 7. BuildKit and multi-stage build caching

**Symptom.** Multi-stage Containerfile builds are slower than expected, or changing
one line of application source invalidates the entire dependency-download layer.

**Cause.** Without BuildKit, Docker builds stages sequentially and its layer cache
is less precise about which instructions actually changed. Current Docker
Engine/Desktop defaults to BuildKit, but CI runners or older installs sometimes have
it disabled via `DOCKER_BUILDKIT=0` in the environment.

**Fix.** Confirm BuildKit is active (`docker version` shows a `Buildx` component;
`docker build` output uses the `[+] Building` step-graph format rather than the flat
`Step 1/8` format). If it isn't, either unset `DOCKER_BUILDKIT=0` or invoke
`docker buildx build` explicitly. Structure Containerfiles so slow-changing layers
(dependency manifests) are copied and installed *before* fast-changing layers
(application source) — see `templates/Containerfile.multistage-ubi`.

---

## 8. Testcontainers, Ryuk, and the Docker socket

**Symptom.** Testcontainers-based tests (including Quarkus Dev Services, which is
built on Testcontainers) hang on startup, or fail with
`Could not find a valid Docker environment` even though `docker ps` works fine from
a terminal.

**Cause.** Testcontainers needs access to the Docker socket
(`/var/run/docker.sock`) to launch containers on the test runner's behalf, plus a
side-channel container of its own (`Ryuk`, the resource reaper) that garbage-collects
leftover containers if the test JVM crashes. Common breakage points:

- Running tests inside a container (CI, a devcontainer) without mounting the host's
  Docker socket into it — "Docker-in-Docker" needs deliberate wiring, not just
  installing the `docker` CLI inside the container.
- A remote or non-default Docker context (`docker context ls`) that Testcontainers'
  auto-detection doesn't pick up. Set `DOCKER_HOST` explicitly if so.
- SELinux blocking the socket bind mount the same way it blocks any other bind mount
  (see gotcha #2) — mount it with `:z` if hand-rolling a devcontainer that needs it.
- Rootless Docker, where the socket lives at
  `$XDG_RUNTIME_DIR/docker.sock` instead of `/var/run/docker.sock`.

**Fix.** See `references/testcontainers-and-dev-services.md` for the full picture,
including how to run Ryuk-disabled in CI sandboxes that already clean up containers
themselves (`TESTCONTAINERS_RYUK_DISABLED=true` — only when you have another cleanup
mechanism).

---

## Less-common issues worth knowing about

### Tail sampling buffer window

If you configured tail sampling but traces don't appear in Tempo, check whether you're waiting long enough. The Collector buffers each trace until `decision_wait` elapses (default 30 seconds). Sending one request and immediately checking Tempo will show nothing — wait 30+ seconds after the last span.

### OTLP path conventions

The OTLP HTTP endpoint expects:

- Traces: POST to `/v1/traces`
- Metrics: POST to `/v1/metrics`
- Logs: POST to `/v1/logs`

Some SDKs default to the base URL without the path; the OTel Collector's HTTP receiver handles both, but third-party tools may not. When in doubt, include the full path.

### Grafana datasource UID stability

Provisioned datasources have a `uid:` field. Dashboards and derived fields reference datasources by UID, not name. Changing a UID after dashboards are imported breaks them silently — they show "datasource not found" until you reimport.

Pick UIDs you can live with from day one: `tempo`, `loki`, `prometheus` are good. Don't use generated UIDs in provisioning.

### Kafka KRaft cluster ID

If you destroy the `kafka-data` volume and restart, Kafka tries to use the existing CLUSTER_ID but finds no matching cluster state and refuses to boot. Either change the CLUSTER_ID (any base64 string works) or wipe everything cleanly:

```bash
docker compose down -v   # The -v wipes named volumes
docker compose up -d
```

### Docker Desktop file-sharing performance (macOS)

Bind-mounted volumes on Docker Desktop for Mac go through a virtualized filesystem
(gRPC-FUSE or VirtioFS, depending on version/settings). Postgres data directories and
other write-heavy bind mounts can be noticeably slower than on native Linux. For
anything performance-sensitive, prefer named volumes (`postgres-data:` in the
templates) over host bind-mounts for the actual data directory — bind-mount only
config files and init scripts, which are small and read-mostly.

### GPU access for Ollama

The Ollama profile in `compose-full.yaml` runs CPU-only by default — it works
everywhere but is slow for larger models. To pass through an NVIDIA GPU on Linux
with the NVIDIA Container Toolkit installed, add to the `ollama` service:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

This has no equivalent on Docker Desktop for macOS (no GPU passthrough to Linux
containers) — Apple Silicon users get better mileage running Ollama natively on the
host and pointing the compose stack's `OLLAMA_HOST` at `host.docker.internal:11434`
instead of running it in a container at all.
