# OpenTelemetry + Micrometer on Spring Boot 4.x

Verified against **Spring Boot 4.1.1 + Java 25** on a Grafana LGTM stack.

## Use the OpenTelemetry Java agent, not the Spring Boot starter

The `opentelemetry-spring-boot-starter` is built against Spring Boot 3.x
autoconfiguration and Jackson 2 (`com.fasterxml.jackson`). Spring Boot 4 moves to
Jackson 3 (`tools.jackson`), Jakarta EE 11, and Spring Framework 7, and the
starter fails to load there. Do not use it on Boot 4.x.

Instead attach the **OpenTelemetry Java agent** at runtime:

```
-javaagent:/otel/opentelemetry-javaagent.jar
```

The agent is version-agnostic and needs no application code. It auto-instruments
HTTP (server + client), gRPC, JDBC, and Kafka; bridges Micrometer meters to OTLP;
injects `trace_id`/`span_id` into the logback MDC; and propagates W3C trace
context and baggage. Configure it with the standard env the stack already sets
(`OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`,
`OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`).

Bundle the agent jar into the image at build time via the
`maven-dependency-plugin` (pinned coordinates) rather than `curl`-ing it in the
Containerfile.

- Metrics + exemplars: add Micrometer for application meters; the agent exports
  them over OTLP, and exemplars link histogram buckets to trace IDs.
- Logs: ship logback over OTLP (or to a file the Collector tails) with the MDC
  `trace_id`/`span_id` the agent injects.
- Baggage: set business context as baggage (e.g. `cart.id`); it rides the same
  propagation and shows up as a span attribute downstream.
- Profiles: attach the **Grafana Pyroscope Java agent** alongside, gated by
  `PYROSCOPE_ADDRESS`.

## Spring Boot 4.x runtime gotchas (hit during real builds)

- **Kafka autoconfiguration is modular now.** The bare
  `org.springframework.kafka:spring-kafka` dependency does not bring
  `KafkaAutoConfiguration`/`KafkaTemplate` on Boot 4 — use
  `org.springframework.boot:spring-boot-starter-kafka`.
- **Non-web services exit immediately.** A gRPC- or Kafka-only service has only
  daemon threads and exits 0 at startup. Set `spring.main.keep-alive=true`.
- **Rootless-podman UBI write permissions.** UBI OpenJDK images run as uid 185
  while `/deployments` is root-owned; create and `chown` a writable log dir (or
  drive the logback file path with an env var) so file logging works.
- **Jackson 3.** Inject `tools.jackson.databind.ObjectMapper`; its methods throw
  unchecked exceptions (no checked `JsonProcessingException`).

## Stack note (not Spring-specific)

With the `grafana/otel-lgtm` all-in-one image, the Collector must export traces
to Tempo's **OTLP ingest** (`4418` HTTP / `4417` gRPC), not Tempo's query API
(`3200`). Exporting to `3200` silently drops every span.
