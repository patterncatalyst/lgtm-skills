---
name: lgtm-docker-stack
description: Stand up a local Grafana LGTM observability stack (Loki for logs, Grafana for visualization, Tempo for traces, Mimir for metrics) with the OpenTelemetry Collector, plus Postgres, Kafka (KRaft), and Apicurio, using docker compose (the v2 CLI plugin — not the legacy docker-compose binary). Use this skill whenever the user wants to set up observability, monitoring, telemetry, OpenTelemetry, OTLP, Grafana, Loki, Tempo, Mimir, Prometheus-compatible metrics, distributed tracing, log aggregation, or a local dev environment with Postgres, Kafka, and/or a schema registry — even if they don't explicitly name the stack. Also triggers for requests like "add monitoring to my app", "I need a docker compose with telemetry", "scaffold a project with observability from day one", "set up Testcontainers", "wire up Quarkus Dev Services", "add a devcontainer", or "show me how to wire OTel into a new service" — when the target toolchain is Docker Engine. Covers infrastructure templates, compose profiles for resource-budgeted demo subsets, OpenTelemetry Collector configurations (tail sampling, cardinality control), Grafana datasource provisioning, multi-stage UBI Containerfiles, devcontainer.json scaffolding, Testcontainers/Dev Services guidance, healthcheck and networking patterns, and language-specific instrumentation snippets for Quarkus, Python, C++, and Go.
---

# LGTM Docker Stack Skill

A language-agnostic skill for setting up local observability with **docker compose**
(the Docker CLI's v2 Compose plugin — invoked as `docker compose`, never the legacy
`docker-compose` binary). Bundles the patterns and gotchas learned across multiple
projects so new projects start from a working baseline rather than from scratch.

This skill targets **Docker Engine specifically**. If the target host's
container runtime is a different daemon entirely, use that runtime's own equivalent
skill instead — the compose YAML is nearly identical across engines, but the daemon
model, default security context, and CLI differ enough to warrant separate templates.

## When to use this skill

Use this whenever a user needs one of:

- **A new project scaffolding** with observability wired in from day one, targeting Docker
- **An existing project** that needs metrics, logs, or traces added
- **A demo environment** for showing telemetry concepts, sized to fit a laptop via compose profiles
- **A local development stack** with Postgres, Kafka (KRaft mode), and/or Apicurio, paired with observability
- **Testcontainers or Quarkus Dev Services** wiring so tests spin up their own throwaway containers instead of sharing the demo stack
- **A devcontainer** so a whole team gets the same Docker-based dev environment from `.devcontainer/`
- **An OpenTelemetry Collector configuration** for processing telemetry (sampling, cardinality limits, routing)
- **Grafana datasource provisioning** so the stack works out of the box
- **Diagnosing observability infrastructure issues** (services can't reach the Collector, AOT caches won't load, healthchecks fail prematurely)
- **A Kubernetes follow-on** — once the Docker-based stack is proven locally, `lgtm-minikube-stack` stands up the same shape on minikube (with the `docker` driver)

## Decision tree

Before writing anything, figure out which compose template to start from:

1. **Just observability** (no app dependencies) → `templates/compose-lgtm-only.yaml`
2. **App + database** → `templates/compose-with-postgres.yaml`
3. **App + messaging** → `templates/compose-with-kafka.yaml`
4. **App + caching/pub-sub** → `templates/compose-with-redis.yaml`
5. **App + database + messaging + CDC** → `templates/compose-with-debezium.yaml`
6. **Everything, resource-budgeted demo** → `templates/compose-full.yaml` — LGTM + Postgres + Kafka (KRaft) + Apicurio + Ollama, gated behind **compose profiles** so a laptop demo only pays for what's active (see below)

For the Collector config:

1. **Simple pass-through** (start here) → `templates/otel-collector-base.yaml`
2. **Tail sampling needed** (production-style) → `templates/otel-collector-tail-sampling.yaml`
3. **Cardinality control needed** → `templates/otel-collector-cardinality.yaml`

For dev/test-only containers instead of a long-running compose stack:

1. **Quarkus** → Dev Services (zero config; see `references/testcontainers-and-dev-services.md`)
2. **Any JVM/Python/Go test suite** → Testcontainers directly (same reference)

For language-specific instrumentation:

1. **Quarkus / JVM** → `snippets/instrumentation-quarkus.md`
2. **Python** → `snippets/instrumentation-python.md`
3. **C++** → `snippets/instrumentation-cpp.md`
4. **Go** → `snippets/instrumentation-go.md`

For containerizing the application itself:

1. **Multi-stage, UBI-based build** → `templates/Containerfile.multistage-ubi` (Java, but the pattern generalizes)
2. **Team dev environment in a container** → `templates/devcontainer/devcontainer.json` + `templates/devcontainer/docker-compose.devcontainer.yaml`

## Compose profiles: sizing the demo

`templates/compose-full.yaml` ships every infrastructure piece behind **compose
profiles**, because standing up Kafka + Postgres + Apicurio + the full LGTM stack + an
LLM runtime all at once is 4-6 GB of memory before your application even starts. Use
profiles to bring up only what a given demo needs:

```bash
# Baseline: just observability + app — no --profile flags needed
docker compose -f compose-full.yaml up -d

# Observability + Kafka for an event-driven demo
docker compose -f compose-full.yaml --profile kafka up -d

# Everything except the LLM runtime (Ollama is always opt-in — it's the heaviest piece)
docker compose -f compose-full.yaml --profile kafka --profile postgres --profile apicurio up -d

# Bring up Ollama too, if the demo actually needs local LLM inference
docker compose -f compose-full.yaml --profile ollama up -d
```

In `compose-full.yaml`, `lgtm` and `app` carry no `profiles:` key, so standard
`docker compose` semantics start them unconditionally — that's the baseline demo.
`postgres`, `kafka`, `apicurio`, and `ollama` are each tagged with a
`profiles:` entry and only start when explicitly requested with `--profile <name>`.
Adapt this policy when adapting the template: it's deliberately conservative so
nobody accidentally boots a 6+ GB stack on an 8 GB laptop.

## Workflow

When invoked, do this in order:

1. **Ask scoping questions** if not obvious from context:
   - What's the application language(s)?
   - Does the app need a database? (Postgres assumed unless told otherwise)
   - Does the app need messaging? (Kafka assumed unless told otherwise)
   - Does the app need a schema registry? (Apicurio, only if Kafka/Avro/Protobuf contracts are in play)
   - Does the demo need local LLM inference? (Ollama — opt-in, resource-heavy; ask before enabling)
   - Is this for local dev/test only (favor Testcontainers/Dev Services) or a standing demo stack (favor compose)?
   - Is this a fresh start or adding to an existing project?

2. **Read the matching template** from `templates/` based on the decision tree above.

3. **Adapt the template** to the user's project:
   - Update service names to match the user's application
   - Adjust port numbers if conflicts (defaults documented in `references/ports-and-endpoints.md`)
   - Replace placeholder image names with actual values
   - Decide which services need `profiles:` entries vs. always running

4. **Add the Collector config** if processing logic is needed (tail sampling, cardinality stripping). Otherwise the lgtm image's built-in collector is sufficient for early development.

5. **Drop in language-specific instrumentation** from `snippets/` if the user is starting from scratch. Otherwise refer them to the snippet for reference. For Quarkus specifically, point out Dev Services first — it may remove the need for a hand-written compose entry entirely during `quarkus:dev` and `quarkus:test`.

6. **Offer a devcontainer** if the user wants a reproducible team environment: `templates/devcontainer/devcontainer.json` plus its companion `docker-compose.devcontainer.yaml` service.

7. **Walk through the known-issues checklist** in `references/known-issues.md` if anything in the stack uses memory limits, AOT caches, BuildKit, or Testcontainers/Ryuk against the Docker socket. These are the high-leverage gotchas.

## Key principles (always apply)

These are the architectural decisions that make the difference between a working stack and a frustrating one:

- **Newest UBI, newest runtime, exact tags.** Pick the newest UBI major that publishes the newest runtime (ubi10 over ubi9; Python 3.14 -> `ubi10/python-314-minimal`; JDK 25 -> `ubi10/openjdk-25`). If that combination doesn't exist, fall back to an older UBI major with the *same* runtime version (e.g. `ubi9/python-314`) -- never drop the runtime version to stay on a newer UBI, and never stay on an old runtime. Pin exact tags found with `skopeo list-tags docker://registry.access.redhat.com/<repo>` and confirmed with `skopeo inspect`. See `references/base-images.md`.

- **`docker compose`, not `docker-compose`.** The v1 standalone binary is end-of-life. Every command in this skill's templates and docs uses the v2 CLI plugin syntax (`docker compose up -d`, `docker compose logs -f`). If a host only has the legacy binary, tell the user to install the Compose plugin rather than writing v1-flavored commands.

- **Service-name DNS, not localhost.** Inside a compose network, services reach each other by service name. `OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318` is correct; `http://localhost:4318` is wrong and silently fails.

- **`mem_limit` matters more than you'd think.** Containers without memory limits inherit the host's memory. The JVM with `MaxRAMPercentage=75` will see all of it. AOT caches break. Postgres allocates too aggressively. Set `mem_limit` explicitly. See `references/known-issues.md`.

- **Healthchecks need `start_period`.** Default polling starts immediately and reports failure during normal cold starts. Always set `start_period` to cover the longest legitimate startup time for the service.

- **The Collector is where you make decisions.** Sampling, filtering, cardinality control, label redaction, routing — none of this belongs in the application. The application emits everything; the Collector decides what survives.

- **Use OTLP HTTP (port 4318), not gRPC (port 4317), unless you have a reason.** HTTP is easier to debug (curl works), more firewall-friendly, and the difference in performance is negligible for development. See `references/otlp-endpoints.md`.

- **Provision datasources via YAML, not the UI.** Grafana's `provisioning/datasources/` directory accepts declarative YAML. Reproducible setups never require manual click-through.

- **Prefer Testcontainers/Dev Services for tests, compose for demos.** Tests that share a long-running compose stack become flaky and order-dependent. Testcontainers (and Quarkus Dev Services on top of it) give each test run its own disposable containers, torn down automatically by Ryuk. Reach for compose when you want something a human clicks through in a browser (Grafana) or a stack that outlives a single test run.

- **UBI first for application images.** Multi-stage builds with a `registry.access.redhat.com/ubi10/openjdk-25:1.24-15` (or similar) builder stage and a slim `-runtime` final stage. Infrastructure services (Postgres, Kafka, Grafana/LGTM, Apicurio, Ollama) keep their upstream images. See `references/base-images.md`.

- **BuildKit is on by default with `docker compose build` / `docker build` on current Docker — don't fight it.** Multi-stage builds benefit from BuildKit's parallel stage execution and better layer caching. If a host has BuildKit disabled (`DOCKER_BUILDKIT=0` set somewhere), multi-stage Containerfiles still work but lose the caching benefit.

- **Open source only, no fees.** Every runtime, framework, library, image,
  operator and tool must be usable without a license fee, license key or paid
  subscription: anyone who clones the project runs it for free. Prefer the
  upstream open-source LTS, otherwise the latest stable. When a project's newest
  release moves to a commercial license, pin the newest open-source line instead
  and record why next to the pin (for example MassTransit 8.5.x under
  Apache-2.0 rather than the commercial 9.x). Check the license field on the
  registry (pom, nuspec, PyPI, chart) when bumping. Free-registration items such
  as the Red Hat pull secret for OpenShift Local are acceptable; paid ones are not.

## Reference files

Read these as needed, not preemptively. Their organization:

- `references/known-issues.md` — Docker-specific gotchas (mem limits, SELinux, BuildKit, Testcontainers/Ryuk against the Docker socket, image drift). Read first when something breaks.
- `references/ports-and-endpoints.md` — What lives on which port. Reference when wiring services together.
- `references/collector-processors.md` — Tail sampling, transforms, filters, memory limits. Read when designing the Collector config.
- `references/otlp-endpoints.md` — HTTP vs gRPC trade-offs, path conventions.
- `references/dashboard-design.md` — Patterns for creating new Grafana dashboards. Read when building visualizations.
- `references/base-images.md` — Red Hat UBI base images for application containers, including the UBI 10 OpenJDK 25 builder/runtime pair. Read when writing Containerfiles.
- `references/testcontainers-and-dev-services.md` — Quarkus Dev Services (zero-config auto-spun containers) and direct Testcontainers usage for other stacks; how they relate to the compose stack; Ryuk/Docker-socket gotchas.
- `references/minikube-handoff.md` — How this Docker-based local stack maps onto `lgtm-minikube-stack` when the project needs a Kubernetes substrate (minikube's `docker` driver, what carries over, what doesn't).

## Snippets

Drop-in instrumentation patterns:

- `snippets/instrumentation-quarkus.md` — `quarkus-opentelemetry` extension, plus Dev Services config for Kafka/Postgres in dev and test
- `snippets/instrumentation-python.md` — `opentelemetry-distro` + auto-instrumentation
- `snippets/instrumentation-cpp.md` — `opentelemetry-cpp` via CMake
- `snippets/instrumentation-go.md` — Manual SDK setup with `otelhttp` and friends
- `snippets/healthcheck-patterns.md` — Health endpoint paths per framework, using `docker` CLI for debugging
- `snippets/flagd-service.md` — OpenFeature flag evaluation daemon as a compose service

## Templates

The compose files in `templates/` are starting points, not finished products. They use generic service names (`app`, `db`, `kafka`) and the standard port assignments. Always adapt to the target project.

- `templates/compose-lgtm-only.yaml`, `compose-with-postgres.yaml`, `compose-with-kafka.yaml`, `compose-with-redis.yaml`, `compose-with-debezium.yaml` — single-purpose starting points on `docker compose`, one per common dependency shape.
- `templates/compose-full.yaml` — the resource-budgeted, profile-gated everything-stack: LGTM/OTel, Postgres, Kafka (KRaft), Apicurio, and an opt-in Ollama profile.
- `templates/grafana-datasources.yaml` — provisioned datasources with trace↔log↔metric correlation wired in.
- `templates/otel-collector-base.yaml`, `otel-collector-tail-sampling.yaml`, `otel-collector-cardinality.yaml` — composable Collector configs; start with base and layer in the others as needed.
- `templates/Containerfile.multistage-ubi` — multi-stage build, UBI 10 OpenJDK 25 builder + OpenJDK 25 runtime.
- `templates/devcontainer/devcontainer.json` + `templates/devcontainer/docker-compose.devcontainer.yaml` — a ready-to-copy `.devcontainer/` for teams standardizing on Docker-based dev containers.

## What this skill explicitly does NOT do

- It does not deploy to Kubernetes — for that substrate, once this stack is proven, use `lgtm-minikube-stack` (see `references/minikube-handoff.md`)
- It does not provision cloud Grafana, Tempo, Mimir, or Loki — those are the SaaS offerings, not the self-hosted stack
- It does not write application code beyond instrumentation glue
- It does not include framework-specific architectures (AOT cache pipelines, build-time bean wiring, etc.) — those are language-and-framework-specific decisions outside this skill's scope
- It does not target any container runtime other than Docker Engine — if the target host uses a different container runtime, use that runtime's dedicated skill instead

If the user asks for those things, route them to other resources or ask whether they want this skill's infrastructure plus pointers to language-specific work elsewhere.

## Multi-step work → `lgtm-relay`

Standing up a full stack goes through the `lgtm-relay` skill: Opus picks and wires
the components, Sonnet writes the compose files, collector config, and provisioning
in parallel, Opus validates with an actual bring-up rather than a config read. A
stack that only parses is not a stack that runs.
