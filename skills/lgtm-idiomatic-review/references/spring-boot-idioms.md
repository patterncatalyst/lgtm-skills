# Spring Boot idioms

Idiomatic Spring Boot 4.1 (Spring Framework 7, Jakarta EE 11, Jackson 3, JDK 25)
for example and tutorial code. Authority: `lgtm-spring-boot` (starters, OTel Java
agent, Testcontainers, UBI 10), the Spring Boot 4.1 reference, and the Spring
Framework 7 reference. Severity tiers match the SKILL: **reinvented** >
**deprecated** > **structure** > **style**.

The guiding rule: let auto-configuration, Actuator, and the Spring abstractions
do the plumbing. A hand-written `/healthz`, a JVM signal handler, or a
`JdbcTemplate` CRUD layer usually means a starter and two properties were skipped.

## Health via Actuator probes, not a `/healthz` controller (reinvented)

`spring-boot-starter-actuator` exposes `/actuator/health/liveness` and
`/actuator/health/readiness` as health groups. Add dependency checks to the
readiness group; liveness must not depend on external systems. A custom check is
a `HealthIndicator` bean (Boot 4 package `org.springframework.boot.health.contributor`).

```java
// before — hand-written probes
@GetMapping("/readyz")
ResponseEntity<Map<String, Object>> readyz() {
    try { jdbc.queryForObject("SELECT 1", Integer.class); return ResponseEntity.ok(Map.of("ready", true)); }
    catch (Exception e) { return ResponseEntity.status(503).body(Map.of("ready", false)); }
}
```

```properties
# after — application.properties
management.endpoint.health.group.readiness.include=readinessState,db
# also serve the groups at /livez and /readyz on the main port
management.endpoint.health.probes.add-additional-paths=true
```

```java
@Component
class InventoryHealthIndicator implements HealthIndicator {   // shows up as "inventory"
    public Health health() { return client.ping() ? Health.up().build() : Health.down().build(); }
}
```

Changing the probe URL is a behavior change (compose healthchecks, Helm probes,
`verify.sh`). Keep the path with `add-additional-paths`, or escalate the rename.

## Graceful shutdown, not `sun.misc.Signal` (reinvented / deprecated — `ban`)

Graceful shutdown is on by default for all embedded servers; the drain bound is
`spring.lifecycle.timeout-per-shutdown-phase`. `server.shutdown=graceful` is
redundant (keep it if the chapter shows it explicitly). `sun.misc.Signal` is a
JDK-internal API; replacing the JVM's TERM handling bypasses the shutdown hook
ordering Spring relies on. The pre-stop delay that lets endpoints update belongs
to the platform, as the Boot docs recommend.

```java
// before — internal API, System.exit from a signal thread
Signal.handle(new Signal("TERM"), s -> { state.markShuttingDown(); /* sleep, then */ System.exit(0); });
```

```properties
# after
spring.lifecycle.timeout-per-shutdown-phase=20s
```

```yaml
# Deployment: delay SIGTERM until endpoints drop the Pod (Kubernetes 1.32+)
lifecycle:
  preStop:
    sleep: { seconds: 5 }
```

Cleanup goes in `@PreDestroy` or a `SmartLifecycle` bean; a readiness change is
`AvailabilityChangeEvent.publish(publisher, source, ReadinessState.REFUSING_TRAFFIC)`.

## Spring Data repositories over hand-written CRUD (reinvented)

When a table maps to an entity, a `JpaRepository` gives save, find, paging, and
derived queries. A `JdbcTemplate` class that re-implements insert/find-by-id/list
with a hand-written `RowMapper` is the reinvention. `JdbcClient` (Framework 6.1+)
is the right tool for work that is SQL by nature: reporting queries, `SKIP LOCKED`
outbox polling, upserts.

```java
// before
jdbc.update("INSERT INTO orders (id, sku, quantity) VALUES (?, ?, ?)", id, sku, qty);
jdbc.query("SELECT * FROM orders", (rs, n) -> new Order(rs.getString("id"), ...));

// after
interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findTop50ByOrderByCreatedAtDesc();
}

// SQL-shaped work stays SQL, through JdbcClient
jdbc.sql("SELECT id, payload FROM outbox ORDER BY id LIMIT :n FOR UPDATE SKIP LOCKED")
    .param("n", batch).query(OutboxRow.class).list();
```

Schema comes from Flyway migrations (`lgtm-spring-boot` dependencies), not
`ddl-auto=update`.

## `@Transactional` boundaries (structure)

Put `@Transactional` on the service method that owns the unit of work, not on
controllers and not as manual `setAutoCommit(false)`. A self-invocation bypasses
the proxy, so the annotation does nothing there. Read paths use `readOnly = true`.

## Typed configuration with `@ConfigurationProperties` records (structure)

Group related settings into a record bound by prefix, and enable it with
`@ConfigurationPropertiesScan`. Do not read `System.getenv` in application code;
relaxed binding already maps `DRAIN_DELAY` to `drain.delay`.

```java
// before
long delay = Long.parseLong(System.getenv().getOrDefault("DRAIN_DELAY_SECONDS", "5"));

// after
@ConfigurationProperties("drain")
record DrainProperties(@DefaultValue("5s") Duration delay) {}
```

A single `@Value("${x}")` is fine; five `@Value` fields for one concern is a record.

## `RestClient` and HTTP service clients, not `RestTemplate` (deprecated — `ban`)

The Framework 7 reference marks `RestTemplate` deprecated in favor of `RestClient`.
Inject the auto-configured `RestClient.Builder` (`spring-boot-starter-restclient`),
or declare an `@HttpExchange` interface and let Boot build the proxy.

```java
// before
RestTemplate rt = new RestTemplate();
Stock s = rt.getForObject(baseUrl + "/stock/{sku}", Stock.class, sku);

// after — fluent client from the configured builder
Stock s = restClient.get().uri("/stock/{sku}", sku).retrieve().body(Stock.class);

// or — declarative client
@HttpExchange("/stock") interface InventoryClient { @GetExchange("/{sku}") Stock get(@PathVariable String sku); }
@Configuration @ImportHttpServices(group = "inventory", types = InventoryClient.class) class Clients {}
// spring.http.serviceclient.inventory.base-url=http://inventory:8080
```

## Errors: `@RestControllerAdvice` + `ProblemDetail` (reinvented / structure)

One advice class maps exceptions to RFC 9457 bodies. Set
`spring.mvc.problemdetails.enabled=true` for the framework's own errors. Do not
build a custom error map in each controller or catch-and-return 500 by hand.

```java
@RestControllerAdvice
class ApiErrors {
    @ExceptionHandler(OrderNotFound.class)
    ProblemDetail notFound(OrderNotFound e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }
}
```

## Spring for Apache Kafka (reinvented)

Consume with `@KafkaListener`, produce with `KafkaTemplate`, retry and dead-letter
with a `DefaultErrorHandler` bean. A hand-built `KafkaConsumer` poll loop on a
thread, or a sleep-and-retry connect loop, reinvents the listener container. On
Boot 4 the dependency is `spring-boot-starter-kafka`; a bare `spring-kafka` does
not bring the auto-configuration.

```java
@KafkaListener(topics = "orders.placed", groupId = "shipping")
void on(OrderPlaced event) { shipping.schedule(event.orderId()); }

kafka.send("orders.placed", order.id(), event);   // CompletableFuture<SendResult<..>>
```

## Spring Cache abstraction where it fits (reinvented)

`@EnableCaching` plus `@Cacheable` / `@CacheEvict` replaces a hand-kept
`ConcurrentHashMap` or manual get/set around a method; the store (Caffeine, Redis
via `spring-boot-starter-data-redis`) is configuration.

## Injection, DTOs, validation, tests (structure / style)

- Constructor injection with `final` fields; `@Autowired` on a single constructor
  is redundant, and field injection is a finding.
- Request/response bodies and events are records. Validate with
  `jakarta.validation` annotations and `@Valid @RequestBody`, not `if` chains
  that build a 400 by hand.
- `spring.threads.virtual.enabled=true` instead of a custom executor for blocking
  request work; add `spring.main.keep-alive=true` when only virtual or daemon
  threads remain (a Kafka-only or `@Scheduled` service).
- Integration tests use Testcontainers with `@ServiceConnection`, not
  `@DynamicPropertySource` plumbing.

## Observability and logging (reinvented / style)

Follow `lgtm-spring-boot`: the OpenTelemetry Java agent instruments HTTP, JDBC,
and Kafka. Custom spans and timers go through the Micrometer Observation API
(`Observation.createNotStarted("order.place", registry).observe(...)`) or
`@Observed` (needs `management.observations.annotations.enabled=true` and
`spring-boot-starter-aspectj`), not hand-rolled `System.nanoTime()` timing.
Log through SLF4J; `System.out` and `printStackTrace()` are `ban` (shared
patterns with Quarkus).

## Deprecated or removed in Boot 4 (deprecated)

| Before | After |
|--------|-------|
| `extends WebSecurityConfigurerAdapter` (removed) | a `SecurityFilterChain` `@Bean` |
| `com.fasterxml.jackson.databind.*` / `.core.*` | `tools.jackson.databind.*`; `com.fasterxml.jackson.annotation.*` stays |
| `javax.persistence`, `javax.servlet`, `javax.validation` | `jakarta.*` |
| `RestTemplate`, `RestTemplateBuilder` | `RestClient`, HTTP service clients |
| `spring-boot-starter-web`, `spring-boot-starter-aop` | `spring-boot-starter-webmvc`, `spring-boot-starter-aspectj` |
| `@MockBean`, `@SpyBean` | `@MockitoBean`, `@MockitoSpyBean` |
| `opentelemetry-spring-boot-starter` (Boot 3 only) | the OpenTelemetry Java agent (`lgtm-spring-boot`) |

## Do not flag

- `com.fasterxml.jackson.annotation.*` imports: Jackson 3 keeps that package.
- `JdbcClient` or `JdbcTemplate` for queries that are SQL by nature, or a
  chapter whose subject is JDBC itself.
- A demo whose lesson is the in-process shutdown sequence (readiness flip,
  in-flight count) may keep its own handler when the prose says so; it still
  must not use `sun.misc.Signal` if a lifecycle hook can carry it.
- `System.out` in a `main` that is a CLI adapter (`CliPlaceOrder`), where stdout
  is the interface a test reads.
- Explicit cache code in a chapter that teaches cache-aside or stampede control.
- Known-bad manifests or code in negative tests, and `*-before` files.
