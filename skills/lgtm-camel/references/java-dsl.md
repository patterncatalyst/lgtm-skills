# Camel Java DSL Patterns

Java DSL is the default. Each route gets its own `RouteBuilder` class with
a descriptive route ID.

## Basic route structure

```java
import org.apache.camel.builder.RouteBuilder;

public class MyRoute extends RouteBuilder {

    @Override
    public void configure() throws Exception {
        from("kafka:my-topic?groupId=my-group")
            .routeId("my-route")
            .log("Received: ${body}")
            .to("direct:process");
    }
}
```

On Quarkus, annotate with `@ApplicationScoped`:

```java
import jakarta.enterprise.context.ApplicationScoped;
import org.apache.camel.builder.RouteBuilder;

@ApplicationScoped
public class MyRoute extends RouteBuilder {

    @Override
    public void configure() throws Exception {
        from("kafka:my-topic?groupId=my-group")
            .routeId("my-route")
            .to("direct:process");
    }
}
```

## Common EIP patterns

### Content-Based Router

```java
from("direct:input")
    .routeId("content-router")
    .choice()
        .when(jsonpath("$.priority").isEqualTo("high"))
            .to("kafka:fast-lane")
        .when(jsonpath("$.priority").isEqualTo("low"))
            .to("kafka:slow-lane")
        .otherwise()
            .to("kafka:default-lane")
    .end();
```

### Splitter (process items individually)

```java
from("file:input?noop=true")
    .routeId("csv-splitter")
    .unmarshal().csv()
    .split(body())
        .to("direct:process-row")
    .end();
```

### Aggregator (collect results)

```java
from("direct:results")
    .routeId("result-aggregator")
    .aggregate(header("correlationId"), new MyAggregationStrategy())
        .completionSize(5)
        .completionTimeout(30_000)
        .to("direct:batch-complete");
```

### Wire Tap (audit without blocking)

```java
from("direct:process")
    .routeId("audited-process")
    .wireTap("kafka:audit-topic")
    .to("direct:next-step");
```

### Error Handler with DLQ

```java
errorHandler(deadLetterChannel("kafka:my-route.dlq")
    .maximumRedeliveries(3)
    .redeliveryDelay(1000)
    .retryAttemptedLogLevel(LoggingLevel.WARN)
    .useOriginalMessage());

from("kafka:my-topic")
    .routeId("with-dlq")
    .process(exchange -> { /* may throw */ })
    .to("kafka:output-topic");
```

### Idempotent Consumer

```java
from("kafka:my-topic")
    .routeId("idempotent-consumer")
    .idempotentConsumer(
        header("messageId"),
        JdbcMessageIdRepository.jpaMessageIdRepository(dataSource, "my_processor"))
    .to("direct:process");
```

### Processor (custom logic)

```java
from("direct:enrich")
    .routeId("enrichment")
    .process(exchange -> {
        String body = exchange.getIn().getBody(String.class);
        exchange.getIn().setBody(transform(body));
        exchange.getIn().setHeader("enriched", true);
    })
    .to("direct:next");
```

### Bean binding (CDI on Quarkus)

```java
from("direct:process")
    .routeId("bean-processor")
    .bean(MyService.class, "processMessage")
    .to("direct:next");
```

## Common component URIs

| Component | URI pattern |
|---|---|
| Kafka | `kafka:topicName?groupId=X&brokers=localhost:9092` |
| REST | `rest:get:hello` or `platform-http:/hello` |
| File | `file:directory?noop=true&include=.*\\.csv` |
| SFTP | `sftp:host:port/path?username=X&password=Y` |
| Timer | `timer:name?period=5000` |
| Direct | `direct:routeName` (synchronous in-process) |
| SEDA | `seda:routeName` (async in-process queue) |
| SQL | `sql:SELECT * FROM table?dataSource=#ds` |
| HTTP | `https:hostname/path` |
| Log | `log:category?level=INFO` |
| Mock | `mock:endpoint` (testing only) |

## Properties configuration

In `application.properties` (Quarkus) or `application.camel.properties`:

```properties
camel.component.kafka.brokers=localhost:9092
camel.component.kafka.schema-registry-u-r-l=http://localhost:8081/apis/ccompat/v7

my.route.input-topic=lw.vulns.package.ingested
my.route.output-topic=lw.vulns.enriched
```

Reference in routes:

```java
from("kafka:{{my.route.input-topic}}")
    .routeId("configurable-route")
    .to("kafka:{{my.route.output-topic}}");
```
