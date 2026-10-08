# Recommended Python Dependencies

Dependency sets by service shape. Add at project creation with `uv add`, or
later as a shape is introduced.

## Core (every project)

```bash
uv add opentelemetry-distro opentelemetry-exporter-otlp prometheus-client
```

| Package | Purpose |
|---|---|
| `opentelemetry-distro` | Zero-code auto-instrumentation entrypoint (`opentelemetry-bootstrap`, `opentelemetry-instrument`) |
| `opentelemetry-exporter-otlp` | OTLP exporter for traces and metrics (gRPC + HTTP) |
| `prometheus-client` | Prometheus-format metrics endpoint, as an alternative or complement to OTLP metrics |

After adding, install the instrumentation packages matched to what's actually
in the project (FastAPI, Kafka, Postgres, etc.):

```bash
uv run opentelemetry-bootstrap -a install
```

Run the app under auto-instrumentation:

```bash
uv run opentelemetry-instrument uvicorn my_service.main:app --host 0.0.0.0 --port 8080
```

### Manual OTel SDK setup

Reach for the manual SDK when auto-instrumentation doesn't cover a custom span
or metric — e.g. a business-logic span around a multi-step workflow, or a
counter that isn't tied to an instrumented library call.

```bash
uv add opentelemetry-sdk opentelemetry-exporter-otlp-proto-grpc
```

```python
# telemetry.py
from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

def configure_telemetry(service_name: str = "my-service") -> None:
    resource = Resource.create({SERVICE_NAME: service_name})

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint="localhost:4317", insecure=True))
    )
    trace.set_tracer_provider(tracer_provider)

    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint="localhost:4317", insecure=True)
    )
    metrics.set_meter_provider(MeterProvider(resource=resource, metric_readers=[metric_reader]))

# Usage elsewhere in the app:
#   tracer = trace.get_tracer(__name__)
#   meter = metrics.get_meter(__name__)
#   widgets_processed = meter.create_counter("app.widgets.processed")
#
#   with tracer.start_as_current_span("process-widget"):
#       ...
#       widgets_processed.add(1, {"type": "widget"})
```

The OTLP gRPC exporter defaults to `localhost:4317`; use the HTTP exporter
(`opentelemetry-exporter-otlp-proto-http`) against `localhost:4318` if the
collector only has the HTTP receiver enabled. Call `configure_telemetry()`
once at startup, before `configure_logging()` if log correlation is in use
(see `references/logging.md`).

See `logging.md` for structured file logging, which is also a core concern,
and `testing.md` for the pytest/ruff/Testcontainers test dependencies.

## REST API service — FastAPI

```bash
uv add fastapi "uvicorn[standard]" pydantic
```

| Package | Purpose |
|---|---|
| `fastapi` | ASGI web framework — routing, validation, OpenAPI generation |
| `uvicorn[standard]` | ASGI server (with `uvloop`/`httptools` extras for performance) |
| `pydantic` | Request/response models and settings validation (FastAPI's dependency, pin it directly too) |

```bash
uv run uvicorn my_service.api.main:app --reload --port 8080
```

## gRPC service — grpcio

```bash
uv add grpcio protobuf
uv add --dev grpcio-tools
```

| Package | Purpose |
|---|---|
| `grpcio` | gRPC runtime |
| `protobuf` | Protocol Buffers runtime, matched to the `grpcio-tools` codegen version |
| `grpcio-tools` (dev) | `.proto` → `_pb2.py` / `_pb2_grpc.py` codegen, not needed at runtime |

Generate stubs:

```bash
uv run python -m grpc_tools.protoc \
    -I proto --python_out=src/my_service/grpc --grpc_python_out=src/my_service/grpc \
    proto/my_service.proto
```

## GraphQL service — Strawberry

```bash
uv add strawberry-graphql
```

| Package | Purpose |
|---|---|
| `strawberry-graphql` | Code-first GraphQL schema definitions, type-hint driven |

Strawberry ships an ASGI app that mounts under FastAPI:

```python
import strawberry
from strawberry.asgi import GraphQL

schema = strawberry.Schema(query=Query)
app.mount("/graphql", GraphQL(schema))
```

## Kafka messaging — aiokafka

```bash
uv add aiokafka
```

| Package | Purpose |
|---|---|
| `aiokafka` | Async Kafka producer/consumer client |

Use `kcat` (see `prerequisites.md`) for ad hoc topic inspection from the
terminal rather than a GUI consumer.

## PostgreSQL / relational — asyncpg

```bash
uv add asyncpg
# Optional: an ORM layer and migrations
uv add sqlalchemy alembic
```

| Package | Purpose |
|---|---|
| `asyncpg` | Low-level async Postgres driver |
| `sqlalchemy` (optional) | ORM / Core query layer on top of `asyncpg` |
| `alembic` (optional) | Schema migrations, paired with SQLAlchemy models |

## AI / LLM

```bash
uv add anthropic
```

| Package | Purpose |
|---|---|
| `anthropic` | Anthropic Python SDK — Messages API, streaming, tool use |

## Containerization

No dependency needed — the Containerfile handles the build. See
`templates/Containerfile` for the UBI 10 multi-stage build, run under
`opentelemetry-instrument` + `uvicorn` in the runtime stage.

## Example project layout (src layout)

```
my-service/
├── pyproject.toml
├── uv.lock
├── src/
│   └── my_service/
│       ├── __init__.py
│       ├── api/              ← FastAPI routers (REST)
│       ├── grpc/              ← generated stubs + servicer implementations
│       ├── graphql/           ← Strawberry schema/resolvers
│       ├── messaging/         ← aiokafka producers/consumers
│       └── db/                ← asyncpg/SQLAlchemy models and queries
├── tests/
│   ├── unit/
│   └── integration/
└── logs/                       ← file logging output (gitignored)
```

## Dependency discovery

```bash
uv add <package> --dry-run      # preview resolution without installing
uv tree                         # inspect the resolved dependency graph
uv lock --upgrade-package <package>   # bump a single pinned dependency
```
