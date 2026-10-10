# Testing Infrastructure

Multi-layer test strategy for Python projects.

## Test layers

| Layer | Framework | Scope | Speed | Run with |
|---|---|---|---|---|
| 1. Unit tests | pytest (+ pytest-asyncio) + ruff | Single function/class logic, lint/format | Seconds | `uv run pytest`, `uv run ruff check` |
| 2. Integration tests | pytest + `testcontainers` (Postgres/Kafka) | Cross-service flows, real infra | Minutes | `uv run pytest -m integration` |
| 3. API tests | Newman (Postman CLI) | HTTP contract validation | Seconds | Script or CI stage |

### Naming and marker convention

- `tests/unit/test_*.py` — unit tests, no external services
- `tests/integration/test_*.py` — integration tests, marked `@pytest.mark.integration`
- Register the marker in `pyproject.toml` so pytest doesn't warn about unknown markers:

```toml
[tool.pytest.ini_options]
markers = [
    "integration: tests that require Testcontainers-backed infrastructure",
]
```

## Layer 1: Unit tests

### Dependencies

See `snippets/pyproject-test-deps.toml` for the full dependency group:

```bash
uv add --dev pytest pytest-asyncio ruff
```

### Pattern: FastAPI endpoint test with `TestClient`

```python
from fastapi.testclient import TestClient
from my_service.api.main import app

client = TestClient(app)

def test_hello_endpoint():
    response = client.get("/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello"}
```

For an `httpx.AsyncClient` against an ASGI app directly (no running server):

```python
import pytest
from httpx import AsyncClient, ASGITransport
from my_service.api.main import app

@pytest.mark.asyncio
async def test_hello_endpoint_async():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/hello")
    assert response.status_code == 200
```

### Pattern: health and metric assertions

```python
def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_processed_counter_increments():
    from prometheus_client import REGISTRY
    before = REGISTRY.get_sample_value("app_processed_total", {"type": "widget"}) or 0
    client.post("/widgets", json={"name": "test-widget"})
    after = REGISTRY.get_sample_value("app_processed_total", {"type": "widget"})
    assert after > before
```

### Lint and format with ruff

```bash
uv run ruff check .       # lint
uv run ruff format .      # format
uv run ruff check --fix . # autofix what's safe to autofix
```

### Running

```bash
uv run pytest                      # unit tests (integration tests skipped by default — see below)
uv run pytest -m "not integration" # explicit equivalent
uv run ruff check .
```

## Layer 2: Testcontainers integration tests

### Dependencies

```bash
uv add --dev testcontainers
```

The `testcontainers` package ships modules for common infra, e.g.
`testcontainers.postgres.PostgresContainer` and
`testcontainers.kafka.KafkaContainer`.

### Pattern: Postgres fixture

See `snippets/conftest-example.py` for the full fixture set. Core shape:

```python
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:18.6-alpine") as container:
        yield container

@pytest.fixture
def db_dsn(postgres_container):
    return postgres_container.get_connection_url().replace(
        "postgresql+psycopg2", "postgresql"
    )
```

### Pattern: Kafka fixture

```python
from testcontainers.kafka import KafkaContainer

@pytest.fixture(scope="session")
def kafka_container():
    with KafkaContainer("confluentinc/cp-kafka:8.3.2") as container:
        yield container

@pytest.fixture
def kafka_bootstrap_servers(kafka_container):
    return kafka_container.get_bootstrap_server()
```

### Pattern: integration test using both

```python
import pytest
import asyncpg

@pytest.mark.integration
@pytest.mark.asyncio
async def test_widget_persisted(db_dsn):
    conn = await asyncpg.connect(db_dsn)
    try:
        await conn.execute("INSERT INTO widgets (name) VALUES ($1)", "test-widget")
        row = await conn.fetchrow("SELECT name FROM widgets WHERE name = $1", "test-widget")
        assert row["name"] == "test-widget"
    finally:
        await conn.close()
```

### Running

```bash
uv run pytest -m integration        # Layer 2 only, requires the Docker daemon running
uv run pytest                       # Layer 1 + 2 if no marker filter is applied
```

Testcontainers talks to Docker Engine through `/var/run/docker.sock`; your user
must be in the `docker` group. Leave `DOCKER_HOST` unset.

## Layer 3: Newman / Postman API tests

### Postman collection structure

```
test-data/
├── postman/
│   ├── my-service.postman_collection.json
│   └── local.postman_environment.json
```

### Running with Newman

```bash
newman run test-data/postman/my-service.postman_collection.json \
    -e test-data/postman/local.postman_environment.json \
    -r cli,htmlextra \
    --reporter-htmlextra-export test-data/postman/report.html
```

Or use `templates/newman-run.sh.template`, which loops over every collection
in a directory.

### CI integration

```yaml
test:unit:
  stage: test
  image: ghcr.io/astral-sh/uv:python3.14-bookworm-slim
  script:
    - uv sync --all-extras --dev
    - uv run ruff check .
    - uv run pytest -m "not integration" --junitxml=results/pytest-report.xml
  artifacts:
    when: always
    reports:
      junit: results/pytest-report.xml

test:integration:
  stage: test
  image: ghcr.io/astral-sh/uv:python3.14-bookworm-slim
  services:
    - docker:dind
  script:
    - uv sync --all-extras --dev
    - uv run pytest -m integration --junitxml=results/pytest-integration-report.xml
  artifacts:
    when: always
    reports:
      junit: results/pytest-integration-report.xml

test:api:
  stage: test
  image: postman/newman:6-alpine
  script:
    - newman run test-data/postman/*.postman_collection.json
        -e test-data/postman/ci.postman_environment.json
        --reporters cli,junit
        --reporter-junit-export results/newman-report.xml
  artifacts:
    when: always
    reports:
      junit: results/newman-report.xml
```

## Observability assertions from day one

Add the OTel and metrics dependencies at project creation (see
`references/dependencies.md`), then verify the endpoints come up:

```bash
curl -s http://localhost:8080/metrics | grep app_
curl -s http://localhost:8080/health | jq
```
