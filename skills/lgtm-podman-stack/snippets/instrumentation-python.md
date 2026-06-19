# Python Instrumentation

Python has the most mature auto-instrumentation outside the JVM. The `opentelemetry-distro` package + auto-instrumentation entry points covers most frameworks (Django, Flask, FastAPI, Celery, SQLAlchemy, requests, aiohttp, etc.) with zero code changes.

## Quickest path: auto-instrumentation

### 1. Install

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap --action=install
```

The `bootstrap` command inspects your installed packages and installs matching instrumentations. Run it after adding any new dependency that has OTel instrumentation available.

### 2. Configure via environment variables

```bash
export OTEL_SERVICE_NAME=your-service-name
export OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_RESOURCE_ATTRIBUTES=deployment.environment=local,service.version=1.0
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=1.0
```

### 3. Launch with the auto-instrumentation wrapper

```bash
opentelemetry-instrument python your_app.py
# or for Django:
opentelemetry-instrument python manage.py runserver
# or for Gunicorn (preferred for production):
opentelemetry-instrument gunicorn your_app:app
```

That's it. HTTP servers, clients, databases, and queues get traced automatically.

## Manual setup (when auto-instrumentation isn't an option)

```python
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Resource describes the service
resource = Resource.create({
    "service.name": "your-service",
    "service.version": "1.0",
    "deployment.environment": "local",
})

# Tracer provider
provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://lgtm:4318/v1/traces")
    )
)
trace.set_tracer_provider(provider)

# Use anywhere in your code
tracer = trace.get_tracer(__name__)

def process_order(order):
    with tracer.start_as_current_span("order.process") as span:
        span.set_attribute("order.id", order.id)
        span.set_attribute("order.total", order.total)
        # business logic
```

## Logging correlation

For trace context to appear in log lines, add the logging instrumentation:

```bash
pip install opentelemetry-instrumentation-logging
```

```python
from opentelemetry.instrumentation.logging import LoggingInstrumentor
LoggingInstrumentor().instrument(set_logging_format=True)
```

This adds `trace_id` and `span_id` to log records automatically. Your log format string can reference them:

```python
logging.basicConfig(
    format="%(asctime)s [%(levelname)s] [trace_id=%(otelTraceID)s span_id=%(otelSpanID)s] %(message)s"
)
```

## Metrics

The same `opentelemetry-distro` package handles metrics. Auto-instrumentation captures:

- HTTP server request rate, duration, error rate (per framework)
- Database query rate, duration (per ORM)
- Process metrics (CPU, memory, GC) via `opentelemetry-instrumentation-system-metrics`

For custom metrics:

```python
from opentelemetry import metrics

meter = metrics.get_meter(__name__)
order_counter = meter.create_counter(
    "orders.processed",
    description="Number of orders processed",
)

def process_order(order):
    # ... business logic
    order_counter.add(1, {"order.type": order.type})
```

## Containerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN opentelemetry-bootstrap --action=install

COPY . .

EXPOSE 8080
CMD ["opentelemetry-instrument", "gunicorn", "-b", "0.0.0.0:8080", "your_app:app"]
```

## Common pitfalls

- **Forgetting `opentelemetry-bootstrap`.** Without it, the auto-instrumentation packages aren't installed even if `opentelemetry-distro` is.
- **Async frameworks (FastAPI, aiohttp).** Auto-instrumentation works, but be careful with context propagation across `asyncio.gather` and similar — manual spans may need `tracer.start_as_current_span` with explicit context.
- **Forking servers (Gunicorn pre-fork, uWSGI).** The OTel SDK initializes per-worker. Use `--preload` for Gunicorn to share the initialization, or accept the small startup cost per worker.
- **`OTEL_PROPAGATORS`.** Default is `tracecontext,baggage` — W3C standards. If interoperating with an older system using B3, set `OTEL_PROPAGATORS=b3,tracecontext,baggage`.

## What auto-instrumentation covers

Run `opentelemetry-bootstrap --action=list` to see which instrumentations are installed. Typical coverage:

- **Web frameworks:** Django, Flask, FastAPI, Pyramid, Starlette, Tornado, Falcon
- **HTTP clients:** requests, urllib, urllib3, aiohttp, httpx
- **Databases:** SQLAlchemy, asyncpg, psycopg2, pymongo, redis, elasticsearch
- **Queues:** Celery, Kafka (confluent-kafka), pika (RabbitMQ)
- **gRPC:** grpcio-server, grpcio-client
- **Logging:** stdlib logging

For frameworks not covered, write manual spans around the operations you care about. Don't try to monkeypatch your own auto-instrumentation — write explicit instrumentation in your business logic instead.
