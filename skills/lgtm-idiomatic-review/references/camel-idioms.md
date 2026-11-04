# Apache Camel idioms

Idiomatic Apache Camel for example and tutorial code, on either runtime
(Camel Quarkus or Camel on Spring Boot) and in the Java DSL. Authority:
`lgtm-camel`, the Apache Camel component and EIP documentation, and the
runtime's own idioms (`quarkus-idioms.md` / `spring-boot-idioms.md`) for the
host-framework parts. Severity tiers match the SKILL: **reinvented** >
**deprecated** > **structure** > **style**.

The guiding rule: Camel already implements the Enterprise Integration Patterns
and the transport plumbing. Idiomatic Camel expresses the integration in the
DSL and in components, and keeps hand-written Java to the business logic the DSL
calls out to. Code that re-implements routing, marshalling, retry, or
idempotency inside a `.process()` is fighting the framework.

## Express the pattern in the DSL, not in a processor (reinvented)

Content-based routing, splitting, aggregation, filtering, and multicast are DSL
verbs. Reaching into a `.process()` to branch, loop, or fan out by hand throws
away the pattern's name, its tracing, and its error handling.

```java
// before — the router hidden inside a processor
.process(e -> {
    Order o = e.getIn().getBody(Order.class);
    if (o.getAmount() >= 500) e.getIn().setHeader("dest", "express");
    else e.getIn().setHeader("dest", "standard");
})

// after — the Content-Based Router EIP, named
.choice()
    .when(simple("${body.amount} >= 500")).to("direct:express")
    .otherwise().to("direct:standard")
.end()
```

Keep processors and `.bean(...)` targets for business logic (a rule evaluation,
a calculation, a mapping). Keep the routing in the DSL.

## Thin processors; business logic in a bound bean (structure)

A route should read as a pipeline. Put non-trivial logic in a CDI/Spring bean
and call it by name with `.bean("myBean", "method")` or `.to("bean:myBean")`, so
the logic is unit-testable without a `CamelContext` and the route stays legible.

```java
// after — route stays declarative, the bean is testable on its own
.unmarshal().json(Map.class)
.bean("ruleBasedRouter", "evaluate")
.toD("direct:${header.routingDecision}");
```

The `RouteBuilder` itself is a managed bean: `@ApplicationScoped` on Quarkus,
`@Component` on Spring Boot, one route concern per class.

## `toD` for dynamic endpoints, constrained with `allowedSchemes` (reinvented / security)

When the endpoint is chosen at runtime, use the dynamic-to `toD()` with a Simple
expression. Do not build an endpoint URI by string-concatenating request data
into `to(...)`. Because a dynamic URI can carry a value from outside the
application, constrain what it may resolve to with `allowedSchemes`, the same way
you would close any dynamic-URI (SSRF-shaped) seam.

```java
// before — URI built from message data, unconstrained
.to("direct:" + body.get("destination"))

// after — dynamic-to, scheme-constrained
.toD().allowedSchemes("direct").uri("direct:${header.routingDecision}");
```

## Marshal with a data format, not a hand-built ObjectMapper (reinvented)

Camel has data formats for JSON, Avro, Protobuf, CSV, and more. Use
`.marshal().json()` / `.unmarshal().json(Type.class)` rather than constructing an
`ObjectMapper` in a processor. Let Camel's type converters do body conversion
(`getBody(Type.class)`) instead of manual casting and parsing.

## Configuration through property placeholders, never hardcoded (structure)

Endpoint hosts, brokers, credentials, and tuning belong in `{{property}}`
placeholders resolved from `application.properties` / `application.yaml`, not
literal `localhost:9092` in the route. This keeps the same route runnable across
dev, test, and the cluster.

```java
from("kafka:eip.orders.placed?brokers={{kafka.brokers}}&groupId=rule-router")
```

## Error handling: `onException` / dead-letter, not try/catch in a processor (reinvented)

Express failure policy in the DSL: `errorHandler(deadLetterChannel(...))`,
`onException(X.class).maximumRedeliveries(n).redeliveryDelay(...)`, and
`.handled(true)` / `.continued(true)`. A `try/catch` inside a processor bypasses
Camel's redelivery, dead-lettering, and error tracing.

## Idempotency and other EIPs via the DSL (reinvented)

Use `.idempotentConsumer(header("id"), repo)` for duplicate suppression rather
than a hand-rolled seen-set; `.split()` / `.aggregate()` for Splitter and
Aggregator; `.throttle()` / `.delay()` for rate control. Never `Thread.sleep()`
in a route; it blocks the Camel thread and ignores the thread pool.

## Every route gets a `routeId` (style / structure)

Name each route with `.routeId("...")`. Route IDs are how you read logs, drive
the metrics, and control lifecycle (`startRoute` / `stopRoute`). Auto-generated
ids (`route1`, `route2`) make all three harder.

## Testing: `camel-test` + producer templates and `AdviceWith` (structure)

Drive routes with `ProducerTemplate` and assert with `MockEndpoint`
(`camel-test` / `@QuarkusTest` + `CamelTestSupport`). Mock or replace real
endpoints with `AdviceWith` / `@MockEndpoints` instead of standing up live
infrastructure in a unit test. Keep broker- or database-backed checks in the
integration tier.

## Runtime gotchas (deprecated / structure)

- **Quarkus:** the bean language needs the `camel-quarkus-bean` extension. Its
  absence fails at startup with `No language could be found for: bean`, which
  does not name the cause. Add the extension when a route uses `.bean(...)` or a
  `bean:` endpoint.
- **Spring Boot (no web starter):** set `camel.main.run-controller=true` so the
  JVM stays up to run the routes. The property is `camel.main.`, not
  `camel.springboot.`; the latter is silently ignored.
