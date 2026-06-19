# OpenTelemetry Collector Processors

A reference for the processors you'll actually use, organized by what they solve.

The OpenTelemetry Collector has roughly 50 processors in the contrib distribution. This document covers the dozen that handle 95% of real cases.

## Mandatory in every pipeline

### `memory_limiter`

**Use:** Always. First processor in every pipeline.

**Why:** Without it, a flood of incoming telemetry can OOM-kill the Collector. Your application keeps running; your observability goes dark. The Collector dying is worse than the Collector dropping data.

**Configuration:**

```yaml
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512          # Hard cap
    spike_limit_mib: 128    # Soft cap; refuse new data above this
```

The Collector starts refusing data at `limit_mib - spike_limit_mib` and continues until memory drops back down. Set `limit_mib` to ~75% of the container's `mem_limit`.

### `batch`

**Use:** Always. Last processor in every pipeline before exporters.

**Why:** Batching reduces network round-trips and improves exporter throughput dramatically. The cost is a small additional latency before data appears in backends (200ms-1s typically).

**Configuration:**

```yaml
processors:
  batch:
    timeout: 200ms          # Max wait before flushing partial batch
    send_batch_size: 8192   # Flush when batch hits this many items
```

For development with low traffic, drop `timeout` to 100ms so traces appear faster in Tempo. For production with steady traffic, the defaults are fine.

## Trace pipeline

### `tail_sampling`

**Use:** When you need to sample traces by their characteristics (slow, errored, specific routes) rather than randomly.

**Why:** Head sampling at the application (probabilistic) is fine for cost control but treats every trace as equal. Tail sampling lets you keep the interesting ones and discard the boring ones.

**Cost:** RAM. The Collector buffers each trace until all spans arrive (or `decision_wait` elapses).

See `templates/otel-collector-tail-sampling.yaml` for a complete example. Key policies:

```yaml
policies:
  - name: errors
    type: status_code
    status_code:
      status_codes: [ERROR]

  - name: slow
    type: latency
    latency:
      threshold_ms: 1000

  - name: probabilistic
    type: probabilistic
    probabilistic:
      sampling_percentage: 5
```

Policies are evaluated in order. The first match wins; later policies don't see traces that earlier policies kept.

### `probabilistic_sampler`

**Use:** When you want simple head sampling at the Collector instead of at the app. Cheaper than `tail_sampling` (no buffering) but blind to outcome.

**Why use at Collector vs. at app:** Centralized control. If you want to drop sampling rate during an incident, you change one Collector config instead of redeploying every service.

```yaml
processors:
  probabilistic_sampler:
    sampling_percentage: 10  # Keep 10%
```

## Metric pipeline

### `transform`

**Use:** Modify metric attributes — drop labels, rewrite values, normalize paths.

**Why:** The single best tool for cardinality control. See `otel-collector-cardinality.yaml` for examples.

**Syntax:** Uses OTTL (OpenTelemetry Transformation Language) — declarative, expression-based:

```yaml
processors:
  transform/cleanup:
    metric_statements:
      - context: datapoint
        statements:
          - delete_key(attributes, "user_id")
          - delete_key(attributes, "request_id")
          # Normalize REST paths: /users/42 → /users/:id
          - replace_pattern(attributes["http.target"], "/[0-9]+", "/:id")
```

### `filter`

**Use:** Drop metrics, traces, or logs that match a condition. Belt-and-suspenders against cardinality bombs that escape `transform`.

```yaml
processors:
  filter/safety:
    metrics:
      datapoint:
        - 'Len(attributes) > 20'   # Drop datapoints with too many labels
```

### `attributes`

**Use:** Add, modify, or remove attributes on any signal. Older than `transform`; `transform` can do everything `attributes` does plus more. Use `attributes` only if you specifically want its simpler syntax.

```yaml
processors:
  attributes/redact:
    actions:
      - key: user.email
        action: delete
      - key: deployment.environment
        action: insert
        value: local
```

## Log pipeline

### `attributes` (for redaction)

The same `attributes` processor is the most common log processor. Use it to strip PII or sensitive data before logs reach storage:

```yaml
processors:
  attributes/redact-logs:
    actions:
      - key: password
        action: delete
      - key: api_key
        action: delete
      - key: email
        action: update
        from_attribute: redacted
        value: "[REDACTED]"
```

### `transform` (for log records)

`transform` works on logs too. Use for parsing structured log content out of message bodies, deriving severity from custom fields, etc.

## All pipelines

### `resource`

**Use:** Attach service-level metadata to every signal. Useful when applications don't set their own `service.name` or `deployment.environment`.

```yaml
processors:
  resource:
    attributes:
      - key: deployment.environment
        value: local
        action: upsert        # Set if missing, override if present
      - key: cluster
        value: dev-laptop
        action: insert        # Set only if missing
```

### `routing`

**Use:** Send different signals to different exporters based on attributes. The architectural pattern for "send some signals to vendor X, others to vendor Y."

```yaml
processors:
  routing:
    from_attribute: service.name
    table:
      - value: payment-service
        exporters: [otlphttp/sensitive-backend]
      - value: web-frontend
        exporters: [otlphttp/standard-backend]
    default_exporters: [otlphttp/standard-backend]
```

## Pipeline ordering

Order matters. Recommended order:

1. **`memory_limiter`** — first, always. Protect against OOM.
2. **`resource`** — early. Add metadata before downstream processors filter on it.
3. **`tail_sampling`** or **`probabilistic_sampler`** — sampling decisions affect what later processors see. Sample early.
4. **`transform` / `filter` / `attributes`** — content modifications. Order within this group is sometimes important (filter before transform if transform creates new attributes you don't want filtered, etc.).
5. **`batch`** — last, always. Batching makes export efficient.

## Debugging processors

When a processor isn't working, add a `debug` exporter to a temporary pipeline:

```yaml
exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    traces/debug:
      receivers: [otlp]
      processors: [memory_limiter, your-processor, batch]
      exporters: [debug]
```

This prints every span to stdout. You'll see exactly what your processor produced. Remove after debugging — it's expensive at scale.
