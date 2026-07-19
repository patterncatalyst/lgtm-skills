---
name: lgtm-podman-stack
description: Stand up a local Grafana LGTM observability stack (Loki for logs, Grafana for visualization, Tempo for traces, Mimir for metrics) with the OpenTelemetry Collector, plus optional Postgres and Kafka, using podman compose. Use this skill whenever the user wants to set up observability, monitoring, telemetry, OpenTelemetry, OTLP, Grafana, Loki, Tempo, Mimir, Prometheus-compatible metrics, distributed tracing, log aggregation, or a local dev environment with Postgres and/or Kafka — even if they don't explicitly name the stack. Also triggers for requests like "add monitoring to my app", "I need a podman compose with telemetry", "scaffold a project with observability from day one", or "show me how to wire OTel into a new service". Covers infrastructure templates, OpenTelemetry Collector configurations (tail sampling, cardinality control), Grafana datasource provisioning, healthcheck and networking patterns, and language-specific instrumentation snippets for Quarkus, Python, C++, and Go.
---

# LGTM Podman Stack Skill

A language-agnostic skill for setting up local observability with podman compose. Bundles the patterns and gotchas learned across multiple projects so new projects start from a working baseline rather than from scratch.

## When to use this skill

Use this whenever a user needs one of:

- **A new project scaffolding** with observability wired in from day one
- **An existing project** that needs metrics, logs, or traces added
- **A demo environment** for showing telemetry concepts
- **A local development stack** with Postgres, Kafka, or both, paired with observability
- **An OpenTelemetry Collector configuration** for processing telemetry (sampling, cardinality limits, routing)
- **Grafana datasource provisioning** so the stack works out of the box
- **Diagnosing observability infrastructure issues** (services can't reach the Collector, AOT caches won't load, healthchecks fail prematurely)

## Decision tree

Before writing anything, figure out which compose template to start from:

1. **Just observability** (no app dependencies) → `templates/compose-lgtm-only.yaml`
2. **App + database** → `templates/compose-with-postgres.yaml`
3. **App + messaging** → `templates/compose-with-kafka.yaml`
4. **App + caching/pub-sub** → `templates/compose-with-redis.yaml`
5. **App + database + messaging + CDC** → `templates/compose-with-debezium.yaml`
6. **App + database + messaging + caching** → `templates/compose-full.yaml`

For the Collector config:

1. **Simple pass-through** (start here) → `templates/otel-collector-base.yaml`
2. **Tail sampling needed** (production-style) → `templates/otel-collector-tail-sampling.yaml`
3. **Cardinality control needed** → `templates/otel-collector-cardinality.yaml`

For language-specific instrumentation:

1. **Quarkus / JVM** → `snippets/instrumentation-quarkus.md`
2. **Python** → `snippets/instrumentation-python.md`
3. **C++** → `snippets/instrumentation-cpp.md`
4. **Go** → `snippets/instrumentation-go.md`

## Workflow

When invoked, do this in order:

1. **Ask scoping questions** if not obvious from context:
   - What's the application language(s)?
   - Does the app need a database? (Postgres assumed unless told otherwise)
   - Does the app need messaging? (Kafka assumed unless told otherwise)
   - Is this a fresh start or adding to an existing project?

2. **Read the matching template** from `templates/` based on the decision tree above.

3. **Adapt the template** to the user's project:
   - Update service names to match the user's application
   - Adjust port numbers if conflicts (defaults documented in `references/ports-and-endpoints.md`)
   - Replace placeholder image names with actual values

4. **Add the Collector config** if processing logic is needed (tail sampling, cardinality stripping). Otherwise the lgtm image's built-in collector is sufficient for early development.

5. **Drop in language-specific instrumentation** from `snippets/` if the user is starting from scratch. Otherwise refer them to the snippet for reference.

6. **Walk through the known-issues checklist** in `references/known-issues.md` if anything in the stack uses memory limits, AOT caches, or runs on Fedora/SELinux. These are the high-leverage gotchas.

## Key principles (always apply)

These are the architectural decisions that make the difference between a working stack and a frustrating one:

- **Service-name DNS, not localhost.** Inside a compose network, services reach each other by service name. `OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318` is correct; `http://localhost:4318` is wrong and silently fails.

- **`mem_limit` matters more than you'd think.** Containers without memory limits inherit host memory. The JVM with `MaxRAMPercentage=75` will see all of it. AOT caches break. Postgres allocates too aggressively. Set `mem_limit` explicitly. See `references/known-issues.md`.

- **Healthchecks need `start_period`.** Default polling starts immediately and reports failure during normal cold starts. Always set `start_period` to cover the longest legitimate startup time for the service.

- **The Collector is where you make decisions.** Sampling, filtering, cardinality control, label redaction, routing — none of this belongs in the application. The application emits everything; the Collector decides what survives.

- **Use OTLP HTTP (port 4318), not gRPC (port 4317), unless you have a reason.** HTTP is easier to debug (curl works), more firewall-friendly, and the difference in performance is negligible for development. See `references/otlp-endpoints.md`.

- **Provision datasources via YAML, not the UI.** Grafana's `provisioning/datasources/` directory accepts declarative YAML. Reproducible setups never require manual click-through.

## Reference files

Read these as needed, not preemptively. Their organization:

- `references/known-issues.md` — The five highest-leverage gotchas. Read first when something breaks.
- `references/ports-and-endpoints.md` — What lives on which port. Reference when wiring services together.
- `references/collector-processors.md` — Tail sampling, transforms, filters, memory limits. Read when designing the Collector config.
- `references/otlp-endpoints.md` — HTTP vs gRPC trade-offs, path conventions.
- `references/dashboard-design.md` — Patterns for creating new Grafana dashboards. Read when building visualizations.
- `references/base-images.md` — Red Hat UBI base images for application containers. Read when writing Containerfiles.

## Snippets

Drop-in instrumentation patterns:

- `snippets/instrumentation-quarkus.md` — `quarkus-opentelemetry` extension
- `snippets/instrumentation-python.md` — `opentelemetry-distro` + auto-instrumentation
- `snippets/instrumentation-cpp.md` — `opentelemetry-cpp` via CMake
- `snippets/instrumentation-go.md` — Manual SDK setup with `otelhttp` and friends
- `snippets/healthcheck-patterns.md` — Health endpoint paths per framework

## Templates

The compose files in `templates/` are starting points, not finished products. They use generic service names (`app`, `db`, `kafka`) and the standard port assignments. Always adapt to the target project.

The Collector configs are designed to be composed: start with `otel-collector-base.yaml`, add the tail-sampling pipeline from `otel-collector-tail-sampling.yaml` or the transform processor from `otel-collector-cardinality.yaml` as needed.

## What this skill explicitly does NOT do

- It does not deploy to Kubernetes — this is for local development and CI environments
- It does not provision cloud Grafana, Tempo, Mimir, or Loki — those are the SaaS offerings, not the self-hosted stack
- It does not write application code beyond instrumentation glue
- It does not include framework-specific architectures (AOT cache pipelines, build-time bean wiring, etc.) — those are language-and-framework-specific decisions outside this skill's scope

If the user asks for those things, route them to other resources or ask whether they want this skill's infrastructure plus pointers to language-specific work elsewhere.

## Multi-step work → `lgtm-relay`

Standing up a full stack goes through the `lgtm-relay` skill: Opus picks and wires
the components, Sonnet writes the compose files, collector config, and provisioning
in parallel, Opus validates with an actual bring-up rather than a config read. A
stack that only parses is not a stack that runs.
