---
name: lgtm-python
description: Scaffold a Python project with full dev toolchain — uv (env/deps manager, Python 3.14, pyenv as the interpreter-version alternative), FastAPI/grpcio/Strawberry/aiokafka/asyncpg service shapes, opentelemetry-distro zero-code auto-instrumentation plus a manual OTel SDK setup, structured file logging for Claude, pytest + ruff + Testcontainers + Newman testing, kcat for Kafka inspection, and UBI 10 Containerfiles. Use whenever starting a new Python project, setting up Python dev prerequisites, wiring up observability for a Python service, or adding test infrastructure. Also triggers for "new Python project", "set up Python", "Python prerequisites", "Python testing setup", or any request combining Python with observability, testing, or service scaffolding.
---

# lgtm-python Skill

A skill that scaffolds a Python project with a complete development toolchain — from
uv-managed prerequisites through OpenTelemetry instrumentation, structured logging for
Claude Code, and a multi-layer test framework.

The output is a project-ready setup: prerequisites verified, observability wired in
from the start, logging configured for AI-assisted diagnosis, and test infrastructure
scaffolded.

## When to use this skill

Use whenever the user is:

- **Starting a new Python project** and needs the full toolchain from scratch.
- **Setting up prerequisites** for an existing Python project (uv, Python 3.14,
  Podman, kcat, Newman).
- **Choosing a service shape** — FastAPI (REST), grpcio (gRPC), Strawberry
  (GraphQL), aiokafka (Kafka), asyncpg (Postgres) — and the dependency set that
  goes with it.
- **Setting up test infrastructure** (pytest unit tests, Testcontainers
  integration tests, Newman/Postman API tests).
- **Adding structured logging** for post-run AI-assisted diagnosis.
- **Wiring up observability** (OpenTelemetry auto- or manual instrumentation,
  Prometheus metrics) from day one.
- **Containerizing a Python app** with UBI 10 multi-stage Containerfiles.

## What the skill does NOT do

- It does not scaffold Kubernetes infrastructure — pair with `lgtm-minikube-stack`
  for that.
- It does not scaffold observability infrastructure (Grafana, Loki, Tempo, Mimir) —
  pair with `lgtm-podman-stack` or `lgtm-minikube-stack`.
- It does not produce tutorial prose or documentation sites — pair with
  `lgtm-jekyll` or `lgtm-tutorial`.
- It does not install uv, Python, or Podman itself — it produces the commands
  and verifies they succeed. The user runs the installs.

## Workflow

When invoked, do this in order:

1. **Check prerequisites** — verify or guide installation of each tool. Use
   `references/prerequisites.md` for the full checklist and install commands.

2. **Scaffold or update the project** — either create a new Python project with
   `uv init` and the right service-shape dependencies, or update an existing one
   with dependencies, logging, and test deps. Use `references/dependencies.md` to
   pick the dependency set for the service shape(s) in play.

3. **Wire up logging** — add Python file logging with rotation for Claude Code
   post-run diagnosis. Use `references/logging.md` and `snippets/logging-config.py`.

4. **Wire up observability** — add `opentelemetry-distro` for zero-code
   auto-instrumentation, or wire the manual OTel SDK for fine-grained control.
   Use `references/dependencies.md`.

5. **Wire up testing** — add pytest + ruff unit test tooling, Testcontainers
   integration fixtures, and the Newman/Postman API test runner. Use
   `references/testing.md`.

6. **Add Containerfile** — UBI 10 multi-stage build. Use `templates/Containerfile`.

7. **Generate CLAUDE.md** if new project — include project-specific context for
   Claude Code.

## Key principles (always apply)

- **uv is the single tool manager.** Interpreter installs, virtual environments,
  dependency resolution, and lockfiles all go through uv — the same role SDKMAN
  plays for the JVM skills. Don't mix `pip install`, Poetry, or conda into a
  project that uv already manages. **pyenv** is the accepted alternative for
  managing interpreter versions only, when a project or host constraint rules
  out uv's own Python installs — don't run both for the same project.

- **Python 3.14 for development and the baseline target.** `uv python install
  3.14`, `uv venv --python 3.14`, and `requires-python = ">=3.14"` in
  `pyproject.toml`. The container uses Python 3.14 too:
  `ubi10/python-314-minimal` (UBI 10 publishes only `-minimal` Python images),
  falling back to `ubi9/python-314` if it is unavailable -- never an older
  Python to stay on UBI 10. Pin the exact tag (`skopeo list-tags` +
  `skopeo inspect`) rather than tracking `latest`.

- **Structured file logging is non-negotiable for AI-assisted development.**
  The app writes logs to rotating files that Claude Code can read after a crash
  or test failure. Console logging alone is insufficient — it scrolls away and
  can't be grep'd by an agent post-mortem.

- **Test in layers, not monolithically.** Layer 1 (pytest unit tests + ruff
  lint/format) runs in seconds. Layer 2 (Testcontainers integration tests)
  runs in minutes against real Postgres/Kafka containers. Layer 3
  (Newman/Postman API tests) runs against a live stack. Each layer catches
  different classes of bugs.

- **Observability from day one.** Add `opentelemetry-distro` and
  `opentelemetry-exporter-otlp` at project creation, not retroactively. Add
  the matching instrumentations with
  `uv add $(uv run opentelemetry-bootstrap -a requirements)` (a uv venv has no
  pip, so `-a install` silently installs nothing), then launch under
  `opentelemetry-instrument` for zero-code tracing and metrics. Reach for the
  manual OTel SDK setup only when auto-instrumentation doesn't cover a custom
  span or metric. The cost of adding observability later is much higher than
  including it from the start.

- **UBI 10 multi-stage Containerfiles, never Dockerfiles.** Red Hat Universal
  Base Images, a `uv`-equipped builder stage, a slim runtime stage. Name the
  file `Containerfile`, not `Dockerfile`. Use `podman compose` (built-in
  subcommand), not the standalone `podman-compose` Python package.

- **Supported stable releases only, always pinned.** Every dependency, base
  image, and CLI is pinned to a supported stable release: the newest
  non-prerelease version on its supported line. Never floating specifiers
  (`fastapi` with no version bound that resolves to whatever is newest at
  install time), pre-release or dev versions (`rc`, `a`, `b`, `.dev`), `HEAD`
  or branch references, or `latest` image tags. Pin dependency versions in
  `pyproject.toml` and commit the resulting `uv.lock` — the lockfile, not the
  `pyproject.toml` ranges, is what guarantees a reproducible install. Pin the
  UBI image tag in the Containerfile (newest UBI major with Python 3.14, else
  the older major with the same Python; minimal images have no compiler, so a
  builder stage that compiles wheels installs one with `microdnf`).

- **Pin the interpreter and lock dependencies.** `uv python install 3.14`, not
  an unpinned `uv python install`. `uv sync` against a committed `uv.lock`
  reproduces the exact environment; reproducible toolchains prevent "works on
  my machine."

- **CLI tooling over GUIs.** Inspect Kafka with `kcat`, not a GUI consumer —
  this collection prefers CLI tooling throughout; Grafana (from
  `lgtm-podman-stack` / `lgtm-minikube-stack`) is the one GUI exception, for
  dashboards.

## Reference files

Read these as needed, not preemptively:

- `references/prerequisites.md` — uv, Python 3.14, Podman, Git, kcat, Newman
  install checklist with verification commands.
- `references/dependencies.md` — Recommended dependency sets by service shape
  (FastAPI, grpcio, Strawberry, aiokafka, asyncpg, OTel, AI/LLM).
- `references/logging.md` — Python file logging configuration for Claude Code
  AI-assisted diagnosis.
- `references/testing.md` — pytest unit tests, Testcontainers integration
  tests, Newman/Postman API tests, ruff lint/format.

## Snippets

Drop-in reusable patterns:

- `snippets/logging-config.py` — Rotating file handler with structured
  formatting, wired into stdlib `logging`.
- `snippets/pyproject-test-deps.toml` — Test dependency group (pytest,
  pytest-asyncio, ruff, testcontainers).
- `snippets/conftest-example.py` — pytest fixtures, including a Testcontainers
  Postgres/Kafka fixture.

## Templates

- `templates/Containerfile` — UBI 10 multi-stage build.
- `templates/CLAUDE.md.template` — Project CLAUDE.md template.
- `templates/newman-run.sh.template` — Newman/Postman test runner script.

## Multi-step work → `lgtm-relay`

For non-trivial projects (multiple service shapes, Kafka + Postgres + LLM), use
`lgtm-relay`: Opus plans the dependency set and module structure, Sonnet
scaffolds and wires everything, Opus validates against a real `uv run uvicorn`
(or equivalent) run.
