---
name: lgtm-spring-boot
description: Scaffold a Spring Boot project with full dev toolchain — SDKMAN (JDK 25 Temurin, Maven 3.9, Spring Boot CLI), OpenTelemetry + Micrometer observability, structured file logging for Claude, Testcontainers + JUnit + Newman testing, kcat for Kafka, and UBI 10 Containerfiles. Use whenever starting a new Spring Boot project, setting up Spring Boot dev prerequisites, or wiring up test infrastructure. Also triggers for "new Spring Boot project", "set up Spring Boot", "Spring Boot prerequisites", "Spring Boot testing setup", or any request combining Spring Boot with observability, testing, or Testcontainers tooling.
---

# lgtm-spring-boot Skill

A skill that scaffolds a Spring Boot project with a complete development toolchain —
from SDKMAN-managed prerequisites through observability wiring, structured logging
for Claude Code, and a multi-layer test framework.

The output is a project-ready setup: prerequisites verified, observability wired
from day one, logging wired for AI-assisted diagnosis, and test infrastructure
scaffolded.

## When to use this skill

Use whenever the user is:

- **Starting a new Spring Boot project** and needs the full toolchain from scratch.
- **Setting up prerequisites** for an existing Spring Boot project (SDKMAN, JDK 25,
  Maven 3.9, Spring Boot CLI).
- **Setting up test infrastructure** (Testcontainers integration tests, Newman/Postman
  API tests, Micrometer assertions).
- **Adding structured logging** for post-run AI-assisted diagnosis.
- **Containerizing a Spring Boot app** with UBI 10 multi-stage Containerfiles.

## What the skill does NOT do

- It does not scaffold Kubernetes infrastructure — pair with `lgtm-minikube-stack`
  for that.
- It does not scaffold observability infrastructure (Grafana, Loki, Tempo, Mimir) —
  pair with `lgtm-podman-stack` or `lgtm-minikube-stack`.
- It does not produce tutorial prose or documentation sites — pair with
  `lgtm-jekyll` or `lgtm-tutorial`.
- It does not install SDKMAN, JDK, or Maven itself — it produces the commands
  and verifies they succeed. The user runs the installs.

## Workflow

When invoked, do this in order:

1. **Check prerequisites** — verify or guide installation of each tool. Use
   `references/prerequisites.md` for the full checklist and install commands.

2. **Scaffold or update the project** — either create a new Spring Boot project
   with the Spring Boot CLI (Spring Initializr) or update an existing one with
   starters, logging, and test deps.

3. **Wire up logging** — add Spring Boot (logback) file logging with rotation for
   Claude Code post-run diagnosis. Use `references/logging.md`.

4. **Wire up testing** — add Testcontainers integration test deps, Newman/Postman
   API test runner, and Micrometer assertion patterns. Use `references/testing.md`.

5. **Add Containerfile** — UBI 10 multi-stage build. Use `templates/Containerfile`.

6. **Generate CLAUDE.md** if new project — include project-specific context for
   Claude Code.

## Key principles (always apply)

- **SDKMAN is the single tool manager.** JDK 25 and Maven 3.9 install through
  SDKMAN, as does the Spring Boot CLI. Don't mix package managers for these
  tools.

- **JDK 25 Temurin for development and compile target.** Containerfiles use
  `ubi10/openjdk-25-runtime`. Set `<java.version>25</java.version>` (or
  `maven.compiler.release=25`) in the POM. Default GC is G1GC; Shenandoah is
  available with `-XX:+UseShenandoahGC` if lower-latency pauses are needed.

- **Spring Boot 4.1.x is a major jump from 3.x — mind the breaking changes.**
  Spring Boot 4 requires Jakarta EE 11 (`jakarta.*` namespace, Servlet 6.1) and
  Jackson 3 (new `tools.jackson` package namespace, not `com.fasterxml.jackson`),
  and runs on Spring Framework 7. The baseline JDK is 17+, but this skill
  compiles to JDK 25. Do not assume Spring Boot 3.x idioms or `com.fasterxml`
  Jackson imports carry over — check the migration guide before porting an
  existing 3.x codebase.

- **Structured file logging is non-negotiable for AI-assisted development.**
  Spring Boot (via logback) writes logs to rotating files that Claude Code can
  read after a crash or test failure. Console logging alone is insufficient —
  it scrolls away and can't be grep'd by an agent post-mortem.

- **Test in layers, not monolithically.** Layer 1 (JUnit 5 + Spring Boot Test
  slices) runs in seconds. Layer 2 (Testcontainers integration tests) runs in
  minutes. Layer 3 (Newman/Postman API tests) runs against a live stack. Each
  layer catches different classes of bugs.

- **Micrometer + OpenTelemetry from day one.** Add the OpenTelemetry Spring
  Boot starter and Micrometer (with the tracing bridge) at project creation,
  not retroactively. The cost of adding them later is much higher than
  including them from the start.

- **UBI 10 multi-stage Containerfiles, never Dockerfiles.** Red Hat Universal
  Base Images, `openjdk-25` builder stage, `openjdk-25-runtime` final stage.
  Name the file `Containerfile`, not `Dockerfile`. Use `podman compose`
  (built-in subcommand), not the standalone `podman-compose` Python package.

- **Supported stable releases only, always pinned.** Every dependency, BOM,
  plugin, container image, and CLI is pinned to a supported stable release:
  the newest non-prerelease version on its supported line. Never `HEAD`,
  `main`, or other branch references, `SNAPSHOT`, alpha, beta, milestone, or
  RC builds, floating `RELEASE`/`LATEST` versions, or `latest` image tags.
  Maven Central's `<latest>`/`<release>` metadata can point at a prerelease
  (e.g. `4.2.0-RC1`), so check the version list. Spring Boot's parent POM
  pins most transitive versions; where a dependency sits outside the parent
  BOM (e.g. Testcontainers modules not covered by `spring-boot-dependencies`),
  pin it explicitly via the relevant BOM import.

- **Pin versions in SDKMAN installs.** `sdk install java 25-tem` not
  `sdk install java`. Reproducible toolchains prevent "works on my machine."

## Reference files

Read these as needed, not preemptively:

- `references/prerequisites.md` — SDKMAN, JDK 25, Maven 3.9, Spring Boot CLI,
  Podman, kcat, Newman install checklist with verification commands.
- `references/logging.md` — Spring Boot (logback) file logging configuration
  for Claude Code AI-assisted diagnosis.
- `references/testing.md` — Testcontainers integration tests, Newman/Postman
  API tests, Micrometer assertions, Maven profiles.
- `references/dependencies.md` — Recommended Spring Boot starter sets by
  project type.
- `references/mcp-servers.md` — why there is no dev-assistant MCP for Spring Boot
  (unlike Quarkus/Camel); scaffold with the CLI; the optional, vet-before-use
  Spring Initializr MCP; and Spring AI's server starters (for exposing a Spring
  app AS an MCP server, a different use).

## Snippets

Drop-in reusable patterns:

- `snippets/application-logging.properties` — Spring Boot (logback) file
  logging with rotation.
- `snippets/application-test.properties` — Test profile with mock services.
- `snippets/pom-test-deps.xml` — Test dependency block (spring-boot-starter-test,
  Testcontainers).

## Templates

- `templates/Containerfile` — UBI 10 multi-stage build.
- `templates/CLAUDE.md.template` — Project CLAUDE.md template.
- `templates/newman-run.sh.template` — Newman/Postman test runner script.

## Multi-step work → `lgtm-relay`

For non-trivial projects (multi-module, Kafka + Postgres + LLM), use `lgtm-relay`:
Opus plans the starter set and module structure, Sonnet scaffolds and wires
everything, Opus validates against a real `mvn spring-boot:run` run.
