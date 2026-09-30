# OTLP Endpoints

Trade-offs between OTLP HTTP and OTLP gRPC, and the path/port conventions.

## HTTP (port 4318) vs gRPC (port 4317)

| Factor | HTTP | gRPC |
|---|---|---|
| Wire format | Protobuf over HTTP | Protobuf over HTTP/2 |
| Debuggability | High (curl works) | Low (needs grpcurl) |
| Browser-friendly | Yes | No |
| Firewall-friendly | Yes (standard HTTP) | Sometimes blocked |
| Per-message overhead | Slightly higher | Slightly lower |
| Streaming | No (request/response) | Yes (bidirectional) |
| HTTP/2 required | Optional | Required |
| Default port | 4318 | 4317 |

**Default recommendation: HTTP.** The debuggability advantage outweighs the marginal performance benefit of gRPC for most projects. You can curl-test your OTel pipeline:

```bash
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d @sample-trace.json
```

You can't do that with gRPC. The first time something goes wrong, this matters.

**When to choose gRPC instead:**
- High-volume production environments where the ~5% overhead reduction matters
- Existing infrastructure already gRPC-everywhere
- Streaming requirements (rare for telemetry — most signals are unary)

## Path conventions

OTLP HTTP uses these paths (the gRPC service-method names map to equivalents):

```
POST /v1/traces      Submit a batch of spans
POST /v1/metrics     Submit a batch of metric data points
POST /v1/logs        Submit a batch of log records
```

The full URL has the form:

```
http://lgtm:4318/v1/traces
http://lgtm:4318/v1/metrics
http://lgtm:4318/v1/logs
```

## Environment variables

The standard OTel environment variables work across all SDKs and the Java agent:

```bash
# Single endpoint, SDK appends the path per signal:
OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# Per-signal overrides (rarely needed):
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://lgtm:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://lgtm:4318/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=http://lgtm:4318/v1/logs
```

**Common pitfall.** Some SDKs default to gRPC even if you set `OTEL_EXPORTER_OTLP_ENDPOINT=http://...`. Always set `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf` explicitly if you want HTTP.

**Another pitfall.** Setting the per-signal endpoint variable disables the SDK's automatic path appending — the URL you provide is used as-is. If you do this, include the `/v1/traces` suffix yourself.

## Content types

OTLP HTTP supports two encodings:

- `application/x-protobuf` (default, more efficient)
- `application/json` (debugging, less efficient)

Most SDKs default to protobuf. To force JSON for debugging:

```bash
OTEL_EXPORTER_OTLP_PROTOCOL=http/json
```

JSON is useful when troubleshooting because you can inspect what's being sent. Don't use it in production — payload sizes are 2-3x larger.

## Compression

OTel SDKs support gzip compression for HTTP and gRPC:

```bash
OTEL_EXPORTER_OTLP_COMPRESSION=gzip
```

Pays for itself at any non-trivial volume. Some SDKs default to gzip; some don't. When in doubt, set it.

## TLS

Production deployments should use TLS:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://collector.example.com:4318
OTEL_EXPORTER_OTLP_CERTIFICATE=/path/to/ca.crt
```

For local development, the templates use plaintext HTTP — TLS adds complexity without value in a single-laptop demo.

## Curl-testing a pipeline

When the pipeline isn't working, send a known-good payload by hand:

```bash
# Send a synthetic trace via curl
cat <<'EOF' > /tmp/trace.json
{
  "resourceSpans": [{
    "resource": {
      "attributes": [{
        "key": "service.name",
        "value": {"stringValue": "test-service"}
      }]
    },
    "scopeSpans": [{
      "spans": [{
        "traceId": "5b8aa5a2d2c872e8321cf37308d69df2",
        "spanId": "051581bf3cb55c13",
        "name": "test-span",
        "kind": 1,
        "startTimeUnixNano": "1700000000000000000",
        "endTimeUnixNano": "1700000001000000000"
      }]
    }]
  }]
}
EOF

curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d @/tmp/trace.json
```

If the Collector accepts it (HTTP 200), the path from app to Collector is broken. If the Collector rejects it, the Collector config is broken.

## Connection patterns

Three common patterns in compose:

1. **App → Collector (in-cluster `lgtm` image).** Use `http://lgtm:4318`. The lgtm image embeds the Collector along with the backends.

2. **App → Standalone Collector → Backends.** Run a separate `collector` service in compose with your own config. Use `http://collector:4318` from apps. The Collector then exports to Tempo, Mimir, Loki — either in the same compose stack or external SaaS endpoints.

3. **App → SaaS directly.** Skip the Collector entirely. Apps export to `https://api.honeycomb.io/v1/traces` or equivalent. Loses the benefits of having a Collector (sampling, redaction, cardinality control, routing).

Pattern 1 is the templates' default — simplest. Pattern 2 is the production-grade evolution. Pattern 3 is a fallback for very small deployments.
