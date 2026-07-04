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

## Containerfile

Standard Quarkus container build, no special OTel handling needed:

```containerfile
# Build
FROM docker.io/library/maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn package --no-transfer-progress -DskipTests

# Runtime
FROM registry.access.redhat.com/ubi9/openjdk-21-runtime:1.24
COPY --from=build /build/target/quarkus-app/ /deployments/
EXPOSE 8080
CMD ["java", "-jar", "/deployments/quarkus-run.jar"]
```

## Common pitfalls

- **CDI bean methods not traced.** Auto-instrumentation only covers REST endpoints and infrastructure (JDBC, Kafka, etc.) by default. Use `@WithSpan` on methods you want explicitly traced.
- **Custom tracer name conflict.** Don't manually create a `TracerProvider` — Quarkus provides one. `@Inject Tracer tracer` gets you the right instance.
- **Logback configuration ignored.** Quarkus uses JBoss Logging, not Logback or Log4j directly. Don't drop in a `logback.xml`; use `application.properties` settings.

## What the extension does for free

When you add `quarkus-opentelemetry`, you automatically get:

- HTTP server spans for every REST request
- HTTP client spans for outgoing calls via Quarkus REST Client
- JDBC spans for database queries (if `quarkus-jdbc-*` is on classpath)
- Kafka producer/consumer spans (if `quarkus-kafka-client` is on classpath)
- gRPC spans (if `quarkus-grpc` is on classpath)
- Resilience4j spans for circuit breakers, retries (if `quarkus-smallrye-fault-tolerance` is on classpath)

For most apps, this covers 90% of what you'd want traced. Custom spans are for business logic the framework can't reasonably auto-trace.
