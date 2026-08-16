---
name: lgtm-camel
description: Scaffold an Apache Camel project with full dev toolchain — SDKMAN (JDK 25, Maven 3.9, JBang, Quarkus CLI), Camel CLI, Camel TUI, Camel MCP server, Citrus testing, Java DSL by default, with Camel on Quarkus as the default runtime and standalone Camel Main as an option. Use whenever starting a new Camel project, adding Camel routes, setting up Camel MCP tooling, configuring Camel testing with Citrus, or prototyping routes with the Camel CLI before exporting to a Maven project. Also triggers for "new Camel project", "set up Camel", "Camel prerequisites", "add Camel MCP", "Camel testing", "Camel on Quarkus", "Camel route", or any request combining Camel with integration patterns, Kafka, or event-driven architecture.
---

# lgtm-camel Skill

A skill that scaffolds an Apache Camel project with the full development toolchain —
from CLI-based prototyping through MCP-assisted development, structured testing, and
production export. Defaults to Camel on Quarkus with Java DSL.

## When to use this skill

Use whenever the user is:

- **Starting a new Camel project** — prototyping with the CLI or scaffolding a full
  Maven project.
- **Adding Camel routes to an existing Quarkus project** — extensions, route patterns,
  testing.
- **Setting up the Camel MCP server** for Claude Code or other AI agents.
- **Configuring Camel testing** with Citrus, MockEndpoint, or AdviceWith.
- **Prototyping routes** with `camel run` before exporting to a Maven project.
- **Monitoring routes** with the Camel TUI dashboard.

## What the skill does NOT do

- It does not scaffold Kubernetes infrastructure — pair with `lgtm-minikube-stack`.
- It does not scaffold observability infrastructure — pair with `lgtm-podman-stack`.
- It does not set up Quarkus-specific tooling like the Quarkus Agent MCP server
  or structured file logging — use `lgtm-quarkus` for those if needed. This skill
  includes Quarkus CLI installation for Camel on Quarkus projects.
- It does not install prerequisites itself — it produces commands and verifies them.

## Decision tree

Before writing anything, determine the runtime:

| Question | Default | Effect |
|---|---|---|
| Camel on Quarkus or standalone? | **Quarkus** | `camel-quarkus-*` extensions, CDI, dev mode, health/metrics | 
| Java DSL, YAML DSL, or XML? | **Java DSL** | `RouteBuilder` classes, `configure()` method |
| Prototype first with CLI? | Yes for exploration | `camel run` → `camel export --runtime=quarkus` |

## Workflow

When invoked, do this in order:

1. **Check prerequisites** — verify SDKMAN, JDK 25, Maven 3.9, JBang, Quarkus CLI,
   Camel CLI. Use `references/prerequisites.md`.

2. **Configure Camel MCP server** — set up for Claude Code. Use
   `references/camel-mcp.md`. This gives Claude access to the Camel catalog,
   route validation, test scaffolding, and runtime inspection.

3. **Scaffold or update the project** — either:
   - **Prototype path:** `camel init` + `camel run --dev` → iterate → `camel export`
   - **Direct path:** `quarkus create app` + `quarkus ext add camel-quarkus-*`
   
   Default to Java DSL. Use `references/java-dsl.md` for route patterns.

4. **Wire up testing** — Camel test support with MockEndpoint, AdviceWith, and
   Citrus integration tests. Use `references/testing.md`.

5. **Introduce the TUI** — show how to use `camel tui` for monitoring and
   debugging during development. Use `references/camel-tui.md`.

6. **Add Containerfile** if needed — use UBI 10 from `lgtm-quarkus` templates.

## Key principles (always apply)

- **Java DSL is the default.** Unless the user explicitly asks for YAML or XML DSL,
  write routes as Java `RouteBuilder` classes. Java DSL is type-safe, refactorable,
  and IDE-friendly. YAML DSL is for Kamelets and simple integrations; XML DSL is
  legacy.

- **Camel on Quarkus is the default runtime.** Unless the user explicitly asks for
  standalone, use `camel-quarkus-*` extensions. Quarkus gives you CDI, dev mode
  with live reload, native compilation, and the full Quarkus ecosystem (health,
  metrics, OTel). Standalone Camel Main is for lightweight integrations that don't
  need Quarkus. Container images use `ubi10/openjdk-25-runtime` (OpenJDK 25.0.3
  LTS, Red Hat build) — default GC is G1GC, Shenandoah available with
  `-XX:+UseShenandoahGC`.

- **Prototype with the CLI, ship with Maven.** The Camel CLI (`camel run`) is
  excellent for rapid prototyping — no POM, no project skeleton, auto-resolves
  dependencies. When the route is working, `camel export --runtime=quarkus`
  generates a full Maven project. Your prototype code becomes your production code.

- **Use the Camel MCP for validation, not guessing.** Before submitting a route,
  use `camel_validate_route` to check endpoint URIs and `camel_component_properties`
  to verify options. The MCP catches misspelled options and invalid URIs that compile
  fine but fail at runtime.

- **Test routes with MockEndpoint and AdviceWith.** `AdviceWith` intercepts endpoints
  at test time — replace real Kafka/HTTP endpoints with mocks without changing
  production code. This is Camel's killer testing feature.

- **One route per RouteBuilder class.** Each route gets its own `RouteBuilder` with
  a descriptive route ID. Don't pack multiple routes into one class — it makes
  testing and lifecycle management harder.

- **Use `camel_route_test_scaffold`** to generate test skeletons for new routes.
  The MCP tool produces a JUnit 5 test class with MockEndpoint assertions and
  the correct test dependency coordinates.

- **Camel TUI for development monitoring.** The TUI provides a terminal dashboard
  with route topology, message tracing, and performance metrics. Use it during
  development instead of tailing logs. Works over SSH and in containers.

## Reference files

- `references/prerequisites.md` — JBang, Camel CLI installation and verification.
- `references/camel-mcp.md` — Camel MCP server setup, full tools inventory by
  category (catalog, validation, runtime, migration, OpenAPI).
- `references/java-dsl.md` — Java DSL route patterns, EIP examples, common
  component configurations.
- `references/testing.md` — MockEndpoint, AdviceWith, Citrus integration, test
  scaffolding with MCP.
- `references/camel-tui.md` — TUI installation, usage, and monitoring features.
- `references/standalone.md` — Standalone Camel Main (non-Quarkus) configuration.

## Snippets

- `snippets/RouteBuilder.java` — Minimal Java DSL route template.
- `snippets/RouteTest.java` — MockEndpoint + AdviceWith test template.
- `snippets/application-camel.properties` — Camel-specific Quarkus properties.

## Templates

- `templates/export-to-quarkus.sh` — CLI prototype → Quarkus Maven project.

## Multi-step work → `lgtm-relay`

For complex integration projects (multi-route, saga orchestration, event-driven
architectures), use `lgtm-relay`: Opus designs the route topology and EIP patterns,
Sonnet implements the routes and tests, Opus validates against a real `camel run`
or `quarkus dev`.
