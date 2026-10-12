# Quarkus idioms

Idiomatic Quarkus for example and tutorial code. Authority: `lgtm-quarkus` (and
`lgtm-spring-boot` for the Spring-side equivalents), the Quarkus guides, and the
RESTEasy Reactive reference. Severity tiers match the SKILL: **reinvented** >
**deprecated** > **structure** > **style**.

The guiding rule: prefer the build-time, annotation-driven, CDI-managed way
Quarkus is built around. Quarkus does its work at build time; code that reaches
for runtime reflection or hand-rolled plumbing is usually fighting the framework.

## RESTEasy Reactive parameter annotations (reinvented / deprecated)

RESTEasy Reactive adds `@RestHeader`, `@RestQuery`, `@RestPath`, `@RestForm`,
`@RestCookie`, `@RestMatrix`. They infer the name from the parameter and read as
less noise than the JAX-RS originals. Prefer them in new RESTEasy Reactive code;
raw JAX-RS annotations still work, so this is `watch`, not an error — flag it when
the surrounding code already uses the `@Rest*` forms.

```java
// before — raw JAX-RS, name repeated
public Response get(@HeaderParam("X-Tenant") String tenant,
                    @QueryParam("page") int page) { ... }

// after — RESTEasy Reactive, name inferred from the parameter
public Response get(@RestHeader("X-Tenant") String tenant,
                    @RestQuery int page) { ... }
```

Worse is hand-parsing: a method that takes the raw `HttpHeaders` and loops to
pull one value is reinventing the binding (`ban`). Bind the parameter.

## Constructor injection over field injection (structure)

Constructor injection is testable without a CDI container and makes
dependencies explicit and final. Field `@Inject` is idiomatic only where
constructor injection cannot reach (some framework-instantiated classes).

```java
// before — field injection
@ApplicationScoped
public class OrderService {
    @Inject OrderRepository repo;
    @Inject EventBus bus;
}

// after — constructor injection, final fields
@ApplicationScoped
public class OrderService {
    private final OrderRepository repo;
    private final EventBus bus;
    OrderService(OrderRepository repo, EventBus bus) {
        this.repo = repo;
        this.bus = bus;
    }
}
```

## Records for DTOs (structure / style)

Immutable carriers — request/response bodies, events, value objects — are
records. A mutable class with getters/setters for a DTO is non-idiomatic in
Java 17+ and this collection targets JDK 25.

```java
// before
public class OrderResponse {
    private String id; private BigDecimal total;
    public String getId() { return id; } public void setId(String id) { this.id = id; }
    // ...
}

// after
public record OrderResponse(String id, BigDecimal total) {}
```

Keep a class when the type needs mutability, inheritance, or JPA entity
semantics — a Panache entity is not a record.

## Bean scopes (structure)

Default to `@ApplicationScoped` for services and clients. `@Singleton` skips the
client proxy and is a micro-optimization that breaks some interceptors — use it
only deliberately. `@RequestScoped` for per-request state. A service with no
scope annotation that is `@Inject`ed is a finding.

## Mutiny `Uni` / `Multi` for reactive and streaming (reinvented / structure)

In reactive endpoints and clients, return `Uni<T>` (one value) or `Multi<T>`
(a stream). Do not block a reactive thread with `.await()` to return a plain
value, and do not hand-roll a `CompletableFuture` chain where Mutiny reads
clearly. Explain `Uni`/`Multi` on first use in prose, once.

```java
// before — blocking the event loop to unwrap
public Order get(Long id) {
    return repo.findById(id).await().indefinitely();
}

// after — return the Uni, let the framework subscribe
public Uni<Order> get(Long id) {
    return repo.findById(id);
}
```

Server-Sent Events / streaming: return `Multi<T>` with
`@RestStreamElementType(MediaType.APPLICATION_JSON)` rather than manually
writing to the response.

## Custom media types via `@Provider` MessageBodyWriter (reinvented)

For a custom representation — the NDJSON lesson — register a
`MessageBodyWriter`/`MessageBodyReader` as a `@Provider` (or a `@ServerExceptionMapper`
companion) and return the domain object with the right `@Produces`. Do not
serialize to a `String` by hand inside the resource method and write bytes to
the response.

```java
// before — hand-rolled serialization in the resource
@GET @Produces("application/x-ndjson")
public Response stream() {
    StringBuilder sb = new StringBuilder();
    for (Order o : orders) sb.append(mapper.writeValueAsString(o)).append('\n');
    return Response.ok(sb.toString()).build();
}

// after — a provider owns the media type, the resource returns domain objects
@Provider @Produces("application/x-ndjson")
public class NdjsonBodyWriter implements MessageBodyWriter<List<Order>> { ... }

@GET @Produces("application/x-ndjson")
public List<Order> stream() { return orders; }
```

## Error mapping with `@ServerExceptionMapper` → Problem (reinvented / structure)

Map exceptions to responses with `@ServerExceptionMapper` (RESTEasy Reactive) or
a JAX-RS `ExceptionMapper`, emitting an RFC 9457 `application/problem+json` body.
Do not catch-and-build an error `Response` in every resource method, and do not
let stack traces leak to the client.

```java
// before — ad hoc error building, repeated per method
try { ... } catch (NotFoundException e) {
    return Response.status(404).entity("not found").build();
}

// after — one mapper, Problem body, reused everywhere
@ServerExceptionMapper
public RestResponse<ProblemDetail> handle(NotFoundException e) {
    return RestResponse.status(Response.Status.NOT_FOUND, ProblemDetail.of(e));
}
```

## Configuration: `application.properties` + `@ConfigProperty` (reinvented / structure)

Read config through `@ConfigProperty` or a `@ConfigMapping` interface, sourced
from `application.properties`/`application.yaml` and profiles. Do not read
`System.getenv` / `System.getProperty` by hand, and do not hardcode values a
reader will need to change.

```java
// before
String url = System.getenv("PAYMENT_URL");

// after
@ConfigProperty(name = "payment.url") String url;
// or a typed group:
@ConfigMapping(prefix = "payment") interface PaymentConfig { URI url(); Duration timeout(); }
```

## Panache (structure) — only when an ORM is present

With Hibernate ORM with Panache, use the active-record (`PanacheEntity`) or
repository (`PanacheRepository`) idioms and the derived/named queries, not a
hand-written `EntityManager` CRUD layer for the common cases. Keep the
`EntityManager` for genuinely complex queries.

## Health via SmallRye Health (reinvented)

Expose readiness/liveness with `@Readiness`/`@Liveness` `HealthCheck` beans
(`quarkus-smallrye-health`), surfaced at `/q/health`. Do not hand-build a
`/health` endpoint that returns a hand-made JSON blob.

## Logging: JBoss Logging, never `System.out` (style / ban in app code)

Use the Quarkus logger (`io.quarkus.logging.Log` static API, or a JBoss Logging
`Logger`). `System.out.println` / `System.err.println` and `e.printStackTrace()`
in application or service code bypass the log configuration, formatting, and the
structured file logging the scaffold wires for Claude. The scanner flags these.

```java
// before
System.out.println("order placed: " + id);
catch (Exception e) { e.printStackTrace(); }

// after
Log.infof("order placed: %s", id);
catch (Exception e) { Log.error("order placement failed", e); }
```

Keep `System.out` only in a `main` method whose job is CLI output, or in a quoted
example of what not to do.

## Build-time over runtime reflection (structure)

Prefer extensions and build-time wiring (`@RegisterForReflection` only where a
library forces runtime reflection) over reflective lookups in application code.
If the code calls `Class.forName`, builds objects by reflection, or scans the
classpath at runtime for something an extension or CDI already provides, that is
a reinvented-wheel finding — especially because it breaks native image builds.
