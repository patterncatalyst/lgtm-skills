# Prerequisites

Complete toolchain for Python development. Install in this order.

## 1. uv

Manages the Python interpreter, virtual environments, dependency resolution,
and the project lockfile. This is the single tool manager for the stack — don't
mix in `pip install`, Poetry, or conda for a project uv already manages.

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source "$HOME/.local/bin/env"
uv --version
```

## 2. Python 3.14

Install the interpreter through uv rather than the system package manager, so
the version is pinned per-project and reproducible across machines.

```bash
uv python install 3.14
uv python list                 # confirm 3.14.x is installed
```

Create the project virtual environment against it:

```bash
uv venv --python 3.14
source .venv/bin/activate
```

In `pyproject.toml`:

```toml
[project]
requires-python = ">=3.14"
```

### pyenv — the alternative interpreter manager

Some hosts or legacy projects pin the interpreter through **pyenv** instead of
uv's own Python installs — for example, when a system-wide `pyenv` version is
already the convention for other tooling on the box. Use one or the other for
a given project, not both:

```bash
curl https://pyenv.run | bash
pyenv install 3.14.0
pyenv local 3.14.0
```

If pyenv is managing the interpreter, point uv at it with
`uv venv --python $(pyenv which python)` rather than letting uv install its
own copy.

## 3. Project setup with uv

```bash
uv init my-service              # scaffold a new project (pyproject.toml, src layout)
cd my-service
uv add fastapi uvicorn[standard]   # add a runtime dependency
uv add --dev pytest ruff           # add a dev-only dependency
uv sync                            # install deps from pyproject.toml / uv.lock
uv lock                            # (re)write uv.lock without installing
uv run uvicorn my_service.main:app --reload   # run inside the managed venv
```

### Key commands

```bash
uv init --package my-service      # src-layout package project
uv add <package>==<version>       # pin an exact version
uv remove <package>
uv sync --no-dev                  # install only runtime deps (used in container builds)
uv run pytest                     # run a command inside the project venv
uv tree                           # inspect the resolved dependency graph
```

## 4. Docker Engine

Container runtime for local dev infrastructure (Postgres, Kafka, the LGTM
stack) and image builds.

```bash
# Fedora
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager addrepo --from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo
# RHEL: use https://download.docker.com/linux/rhel/docker-ce.repo instead

sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER       # log out and back in to apply

docker --version                    # 29.x+
docker compose version              # the compose v2 plugin, not the legacy docker-compose binary
```

Install only Docker's packages; do not install `podman-docker` or Fedora's
`moby-engine` alongside `docker-ce`.

## 5. Git

```bash
sudo dnf install git
git --version
```

## 6. kcat (Kafka inspection)

CLI tool for inspecting Kafka topics, metadata, and messages — this collection
prefers CLI tooling over GUI consumers. The in-app Kafka client is `aiokafka`;
`kcat` is for ad hoc inspection from the terminal.

```bash
sudo dnf install kcat
kcat -V
```

Common usage:

```bash
kcat -b localhost:9092 -L                       # list topics and brokers (metadata)
kcat -b localhost:9092 -t my-topic -P           # produce (reads stdin)
kcat -b localhost:9092 -t my-topic -C -o beginning  # consume from the start
```

## 7. Newman (optional — API testing)

Newman is the CLI runner for Postman collections, the standard REST test tool
used in Layer 3 of the test strategy.

```bash
# Requires Node.js
sudo dnf install nodejs
npm install -g newman newman-reporter-htmlextra
newman --version
```

## Verify everything

```bash
echo "=== uv ===" && uv --version
echo "=== Python ===" && uv run python --version
echo "=== Docker ===" && docker --version && docker compose version
echo "=== Git ===" && git --version
echo "=== kcat ===" && kcat -V 2>&1 | head -1
echo "=== Newman ===" && newman --version 2>/dev/null || echo "(not installed — optional)"
```
