# Quarkus Instrumentation

Quarkus has first-class OpenTelemetry support via the `quarkus-opentelemetry` extension. Build-time wiring means startup cost is dramatically lower than the OTel Java agent.

## Setup

### 1. Add the extension to `pom.xml`

```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-opentelemetry</artifactId>
</dependency>
```

Or via the Quarkus CLI:

```bash
quarkus extension add opentelemetry
```

### 2. Configure in `application.properties`

```properties
# Service identification
quarkus.application.name=your-service-name

# OTLP endpoint — use service name inside compose, localhost outside
quarkus.otel.exporter.otlp.endpoint=http://lgtm:4318
quarkus.otel.exporter.otlp.protocol=http/protobuf

# Sampling — keep all traces in dev, lower in production
quarkus.otel.traces.sampler=parentbased_traceidratio
quarkus.otel.traces.sampler.arg=1.0

# Resource attributes
quarkus.otel.resource.attributes=deployment.environment=local,service.version=1.0
```

### 3. Custom spans (when you need them)

Quarkus auto-instruments REST endpoints, CDI beans, JDBC, Kafka, gRPC, and more. Most of the time you don't need to create spans manually. When you do:

```java
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import jakarta.inject.Inject;

@ApplicationScoped
public class OrderService {

    @Inject
    Tracer tracer;

    public void processOrder(Order order) {
        Span span = tracer.spanBuilder("order.process")
            .setAttribute("order.id", order.id())
            .setAttribute("order.total", order.total())
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            // Your business logic here
            doActualProcessing(order);
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR);
            throw e;
        } finally {
            span.end();
        }
    }
}
```

The `@WithSpan` annotation is a simpler alternative for methods you want traced wholesale:

```java
@WithSpan
public void processOrder(@SpanAttribute("order.id") String orderId) {
    // method body runs inside a span named "OrderService.processOrder"
}
```

## Logback correlation

Quarkus's default logging adds trace context to log lines automatically when OTel is enabled. Verify by checking that logs include `traceId` and `spanId`:

```
2026-04-30 10:23:45 INFO  [order-service] (executor-1) [traceId=abc123, spanId=def456] Order processed
```

If your log lines don't show trace IDs, ensure `quarkus.log.console.format` includes them:

```properties
quarkus.log.console.format=%d{HH:mm:ss} %-5p [%c{2.}] (%t) [traceId=%X{traceId},spanId=%X{spanId}] %s%e%n
```

## Dev Services: skip the compose file entirely in dev/test

For `quarkus:dev` and `quarkus:test`, you often don't need a hand-maintained compose
entry for Kafka/Postgres/Redis at all. As long as the relevant extension is on the
classpath and no connection properties are set for the active profile, Quarkus Dev
Services auto-provisions a throwaway container (via Testcontainers under the hood),
wires the connection in, and tears it down afterward:

```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-jdbc-postgresql</artifactId>
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-kafka-client</artifactId>
</dependency>
```

```properties
# Leave datasource/kafka connection properties unset in %dev and %test —
# their absence is what triggers Dev Services.

# Optional: pin the same image versions the compose stack uses, so dev-mode
# behavior doesn't drift from the standing demo stack.
quarkus.datasource.devservices.image-name=docker.io/library/postgres:16-alpine
quarkus.kafka.devservices.image-name=docker.io/apache/kafka:3.8.0
```

Point OTel at the standing `lgtm` container (if one is running) even while using Dev
Services for the data layer — the two aren't mutually exclusive:

```properties
%dev.quarkus.otel.exporter.otlp.endpoint=http://localhost:4318
```

See `references/testcontainers-and-dev-services.md` for the full picture, including
when to disable Dev Services in favor of pointing at the compose stack, and how Ryuk
(the Testcontainers cleanup sidecar) interacts with the Docker socket.

## Containerfile (multi-stage, UBI 10 OpenJDK 25)

```dockerfile
# Build stage
FROM registry.access.redhat.com/ubi10/openjdk-25:1.24-15 AS build
WORKDIR /build
COPY --chown=185 mvnw .
COPY --chown=185 .mvn .mvn
COPY --chown=185 pom.xml .
RUN ./mvnw -B -ntp dependency:go-offline
COPY --chown=185 src ./src
RUN ./mvnw -B -ntp package -DskipTests

# Runtime stage
FROM registry.access.redhat.com/ubi10/openjdk-25-runtime:1.24-15 AS runtime
WORKDIR /deployments
COPY --from=build --chown=185 /build/target/quarkus-app/ ./
EXPOSE 8080
USER 185
ENTRYPOINT ["java", "-jar", "quarkus-run.jar"]
```

See `templates/Containerfile.multistage-ubi` for the fully annotated version with
memory-ergonomics flags and a non-root user note.

## Common pitfalls

- **CDI bean methods not traced.** Auto-instrumentation only covers REST endpoints and infrastructure (JDBC, Kafka, etc.) by default. Use `@WithSpan` on methods you want explicitly traced.
- **Custom tracer name conflict.** Don't manually create a `TracerProvider` — Quarkus provides one. `@Inject Tracer tracer` gets you the right instance.
- **Logback configuration ignored.** Quarkus uses JBoss Logging, not Logback or Log4j directly. Don't drop in a `logback.xml`; use `application.properties` settings.
- **Dev Services silently not activating.** If you've set even one connection property for a service (e.g. `quarkus.datasource.jdbc.url`) in the active profile, Dev Services assumes you want to connect to something real and won't provision a container. Remove all connection properties for that profile to get auto-provisioning back.
- **Dev Services can't find Docker.** Same checklist as any other Testcontainers use — see `references/testcontainers-and-dev-services.md`.

## What the extension does for free

When you add `quarkus-opentelemetry`, you automatically get:

- HTTP server spans for every REST request
- HTTP client spans for outgoing calls via Quarkus REST Client
- JDBC spans for database queries (if `quarkus-jdbc-*` is on classpath)
- Kafka producer/consumer spans (if `quarkus-kafka-client` is on classpath)
- gRPC spans (if `quarkus-grpc` is on classpath)
- Resilience4j spans for circuit breakers, retries (if `quarkus-smallrye-fault-tolerance` is on classpath)

For most apps, this covers 90% of what you'd want traced. Custom spans are for business logic the framework can't reasonably auto-trace.
