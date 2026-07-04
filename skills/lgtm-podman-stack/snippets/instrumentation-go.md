# Go Instrumentation

Go's OpenTelemetry support is mature but more code-heavy than Python or Quarkus — there's no auto-instrumentation mechanism (no bytecode rewriting, no monkey-patching). You import instrumentation libraries explicitly and wire them in.

This is a reasonable trade-off for Go: explicit > magical, and Go's startup is fast enough that runtime instrumentation overhead isn't usually the bottleneck.

## Setup

### 1. Install dependencies

```bash
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/sdk
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
go get go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp
go get go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
```

### 2. Initialize the SDK

Common pattern: a single `telemetry.Init()` function called once at startup, returning a cleanup function deferred in `main`:

```go
package telemetry

import (
    "context"
    "fmt"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

func Init(ctx context.Context, serviceName, otlpEndpoint string) (func(context.Context) error, error) {
    // Resource describes this service
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion("1.0"),
            semconv.DeploymentEnvironment("local"),
        ),
    )
    if err != nil {
        return nil, fmt.Errorf("resource: %w", err)
    }

    // OTLP HTTP exporter
    exporter, err := otlptracehttp.New(ctx,
        otlptracehttp.WithEndpoint(otlpEndpoint),
        otlptracehttp.WithInsecure(),
    )
    if err != nil {
        return nil, fmt.Errorf("exporter: %w", err)
    }

    // Tracer provider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(1.0))),
    )
    otel.SetTracerProvider(tp)

    return tp.Shutdown, nil
}
```

Note that `otlpEndpoint` is the host:port form (`lgtm:4318`), not the URL form (`http://lgtm:4318`). The OTLP HTTP exporter prepends the protocol.

### 3. Wire it into main

```go
package main

import (
    "context"
    "log"
    "net/http"
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
    ctx := context.Background()
    shutdown, err := telemetry.Init(ctx, "your-service", "lgtm:4318")
    if err != nil {
        log.Fatal(err)
    }
    defer shutdown(ctx)

    mux := http.NewServeMux()
    mux.HandleFunc("/hello", helloHandler)

    // Wrap the mux with otelhttp to auto-trace HTTP requests
    handler := otelhttp.NewHandler(mux, "your-service")
    http.ListenAndServe(":8080", handler)
}
```

### 4. Outgoing HTTP calls

Wrap your HTTP client to propagate trace context:

```go
client := http.Client{
    Transport: otelhttp.NewTransport(http.DefaultTransport),
}

resp, err := client.Get("http://other-service/endpoint")
```

The wrapped transport adds W3C trace context headers and creates client spans automatically.

## Custom spans

```go
import "go.opentelemetry.io/otel"

var tracer = otel.Tracer("your-service")

func processOrder(ctx context.Context, order Order) error {
    ctx, span := tracer.Start(ctx, "order.process",
        trace.WithAttributes(
            attribute.String("order.id", order.ID),
            attribute.Int("order.total", order.Total),
        ),
    )
    defer span.End()

    // business logic; pass ctx to downstream calls
    if err := saveToDatabase(ctx, order); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
        return err
    }

    return nil
}
```

The `ctx` carries trace context. Pass it everywhere — to other functions, to database calls, to HTTP clients. The instrumentation libraries pick it up automatically.

## Logging correlation

Standard library `log/slog` (Go 1.21+) supports structured logging. Add trace IDs manually since there's no auto-correlation:

```go
import (
    "log/slog"
    "go.opentelemetry.io/otel/trace"
)

func logWithContext(ctx context.Context) *slog.Logger {
    span := trace.SpanFromContext(ctx)
    spanCtx := span.SpanContext()
    if !spanCtx.IsValid() {
        return slog.Default()
    }
    return slog.Default().With(
        slog.String("trace_id", spanCtx.TraceID().String()),
        slog.String("span_id", spanCtx.SpanID().String()),
    )
}

// Usage:
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    log := logWithContext(ctx)
    log.Info("handling request", "method", r.Method)
}
```

A wrapper like this prevents logs without trace context. Make it the project's logger pattern.

## Metrics

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/metric"
)

var meter = otel.Meter("your-service")

var orderCounter, _ = meter.Int64Counter(
    "orders.processed",
    metric.WithDescription("Number of orders processed"),
)

func processOrder(ctx context.Context, order Order) {
    // ...
    orderCounter.Add(ctx, 1,
        metric.WithAttributes(attribute.String("order.type", order.Type)),
    )
}
```

For metric export, you also need an `MeterProvider` initialized similarly to the `TracerProvider`. The pattern mirrors the trace setup; consolidate both in your `telemetry.Init` function.

## Containerfile

Go's static binary makes this clean:

```containerfile
# Build
FROM docker.io/library/golang:1.26 AS build
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o app ./cmd/yourapp

# Runtime
FROM registry.access.redhat.com/ubi9/ubi-minimal
COPY --from=build /build/app /app
EXPOSE 8080
ENTRYPOINT ["/app"]
```

UBI minimal base images are small (~30 MB), secure, and consistent with production Red Hat / OpenShift environments.

## Common pitfalls

- **Forgetting to pass `ctx`.** If you call a downstream function with `context.Background()` instead of the request context, you've broken the trace. Trace context lives in the context. Always thread the context through.
- **Initializing the SDK twice.** Don't call `Init()` more than once. The OTel global tracer provider is mutable but you shouldn't replace it during runtime.
- **Not deferring `tp.Shutdown(ctx)`.** The batch span processor buffers spans in memory. Without shutdown, the last batch never flushes. Pending spans get lost on exit.
- **OTLP exporter URL format.** `otlptracehttp.WithEndpoint("lgtm:4318")` takes `host:port`. `otlptracehttp.WithEndpointURL("http://lgtm:4318")` takes a full URL. Pick one; don't mix.

## Recommended instrumentation libraries

Beyond `otelhttp`:

- `go.opentelemetry.io/contrib/instrumentation/database/sql/otelsql` — database/sql wrapper
- `go.opentelemetry.io/contrib/instrumentation/github.com/Shopify/sarama/otelsarama` — Sarama Kafka client
- `go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc` — gRPC server and client
- `go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin` — Gin web framework
- `go.opentelemetry.io/contrib/instrumentation/runtime` — Go runtime metrics (goroutines, GC, heap)

Each is a single import + one-liner registration. Add them as needed.
