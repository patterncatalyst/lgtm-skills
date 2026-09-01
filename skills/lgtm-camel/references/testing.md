# Camel Testing

Check the project's Camel Quarkus version against the official
[Camel Quarkus testing guide](https://camel.apache.org/camel-quarkus/next/user-guide/testing.html)
and use the [AdviceWith reference](https://camel.apache.org/manual/advice-with.html)
for the complete weaving API.

Use the smallest test that proves the behavior, then add integration coverage at
the boundaries:

1. Plain JUnit tests for processors, beans, converters, and aggregation strategies.
2. JVM route tests with `MockEndpoint` and, when route rewriting is necessary,
   `AdviceWith`.
3. Integration tests with real protocols and services through Quarkus Dev Services,
   Camel test-infra, Testcontainers, or Citrus.

## 1. Route tests — MockEndpoint + AdviceWith

`AdviceWith` rewrites an existing route for a test. Prefer ordinary endpoint or
bean replacement through Quarkus test configuration when that is sufficient; use
AdviceWith when the test must replace the consumer, skip a producer, or weave route
nodes.

### Dependencies

Camel on Quarkus uses the current `camel-quarkus-junit` artifact:

```xml
<dependency>
    <groupId>org.apache.camel.quarkus</groupId>
    <artifactId>camel-quarkus-junit</artifactId>
    <scope>test</scope>
</dependency>
```

`camel-quarkus-junit` was introduced in Camel Quarkus 3.31. For an older platform
line, use the dependency documented by that line. For standalone Camel 4.17 and
newer use:

```xml
<dependency>
    <groupId>org.apache.camel</groupId>
    <artifactId>camel-test-junit6</artifactId>
    <scope>test</scope>
</dependency>
```

For Camel 4.16 and older, use `camel-test-junit5`.

### Camel Quarkus lifecycle

- Advise routes defined in application code, not routes created by a test's
  `createRouteBuilder()` override.
- For advice shared by every test method, apply it in `@BeforeEach` or
  `doBeforeEach`. Do not call `context.stop()`, `context.start()`, or override the
  deprecated `isUseAdviceWith()` hook.
- For different advice in each test method, use `adviceRoute(routeId, advice)`,
  which stops, advises, and starts that route.
- `CamelQuarkusTestSupport` and AdviceWith are JVM-mode techniques. Native tests run
  out of process; exercise them through HTTP, messaging, files, or another external
  boundary.
- Camel Quarkus shares its `CamelContext` across tests. Advice cleanup is automatic
  in current versions, but use a distinct Quarkus test profile when the application
  must be restarted with different build-time configuration.
- If a real consumer must never make even a brief connection attempt, disable its
  auto-startup in the test profile or provide the required test infrastructure.

### Pattern: advise an existing application route

Give important route nodes stable IDs in production code:

```java
from("kafka:{{route.input-topic}}")
    .routeId("my-route")
    .process(this::process)
        .id("process-order")
    .to("kafka:{{route.output-topic}}")
        .id("output");
```

Apply common advice before each test. Camel Quarkus 3.38 and newer automatically
start unadvised route definitions after the callback and restore advised route
definitions between test methods, as documented in the
[3.38.0 release notes](https://github.com/apache/camel-quarkus/releases/tag/3.38.0).
For an older Camel Quarkus line, follow that version's testing guide because the
lifecycle differs:

```java
@QuarkusTest
class MyRouteTest extends CamelQuarkusTestSupport {

    @BeforeEach
    void adviseRoute() throws Exception {
        AdviceWith.adviceWith(context, "my-route", advice -> {
            advice.replaceFromWith("direct:test-input");
            advice.weaveById("output").replace().to("mock:output").id("output");
        });
    }

    @Test
    void happyPath_routesToOutput() throws Exception {
        MockEndpoint output = getMockEndpoint("mock:output");
        output.expectedMessageCount(1);
        output.expectedHeaderReceived("processed", true);

        template.sendBody("direct:test-input", testPayload());

        output.assertIsSatisfied();
    }
}
```

### Key AdviceWith operations

| Operation | Use case |
|---|---|
| `replaceFromWith("direct:test")` | Replace an external consumer with a test-controlled input |
| `mockEndpointsAndSkip("kafka:orders-out?*")` | Mock matching producers and do not call the real endpoint |
| `mockEndpoints("kafka:orders-out?*")` | Observe matching sends but still call the real endpoint |
| `weaveById("processor-id").replace().to("mock:replaced")` | Precisely replace a node carrying a stable ID |
| `weaveByToUri("https://api.example.com/*").remove()` | Select endpoint nodes by URI |
| `weaveByType(FilterDefinition.class).selectIndex(0)` | Select a particular EIP node by model type |
| `weaveAddFirst()` / `weaveAddLast()` | Add steps at the start or end of the route |

Matching tries exact values, then trailing-wildcard patterns, then regular
expressions. Endpoint option order can vary, so use `?*` after the stable URI part.
Avoid broad patterns such as `kafka:*`; they can affect unrelated endpoints. Prefer
stable node IDs where possible.

### MCP-generated tests

Inspect the connected MCP tool schema before using test scaffolding. The supported
DSLs and runtimes are version-dependent, and generated output still requires review
and an actual `mvn test` or `mvn verify` run.

## 2. Citrus integration tests

Cross-route flows with real Kafka, Postgres, etc. via Testcontainers.

### Maven dependencies

```xml
<dependency>
    <groupId>org.citrusframework</groupId>
    <artifactId>citrus-quarkus</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.citrusframework</groupId>
    <artifactId>citrus-camel</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.citrusframework</groupId>
    <artifactId>citrus-kafka</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.citrusframework</groupId>
    <artifactId>citrus-http</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.citrusframework</groupId>
    <artifactId>citrus-validation-json</artifactId>
    <scope>test</scope>
</dependency>
```

### Critical: Citrus + Quarkus CamelContext binding

Use the **Citrus** `@BindToRegistry` annotation, not the Camel one:

```java
import org.citrusframework.spi.BindToRegistry;  // NOT org.apache.camel

@QuarkusTest
@CitrusSupport
class MyRouteIT {

    @Inject
    @BindToRegistry
    CamelContext camelContext;

    @CitrusResource
    TestCaseRunner t;
}
```

### Camel CLI test command

The Camel CLI also supports running Citrus tests directly:

```bash
camel test                         # run Citrus tests in current project
```

## 3. Newman / Postman API tests

For routes that expose REST endpoints via `platform-http` or `rest` DSL:

```bash
newman run test-data/postman/my-api.postman_collection.json \
    -e test-data/postman/local.postman_environment.json
```

## Maven configuration

```xml
<!-- surefire: unit tests (*Test.java) -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <includes><include>**/*Test.java</include></includes>
        <excludes><exclude>**/*IT.java</exclude></excludes>
    </configuration>
</plugin>

<!-- failsafe: integration tests (*IT.java) -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-failsafe-plugin</artifactId>
    <executions>
        <execution>
            <goals>
                <goal>integration-test</goal>
                <goal>verify</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

### Running

```bash
mvn test                    # tests executed by Surefire
mvn verify                  # Surefire + Failsafe lifecycle
```
