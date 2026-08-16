# Camel Testing

Three testing approaches, from fastest to most comprehensive.

## 1. Route unit tests — MockEndpoint + AdviceWith

Fast inner-loop tests that run in seconds. No external infrastructure.

### Framework

`camel-quarkus-junit5` (Camel on Quarkus) or `camel-test-junit5` (standalone).

### Maven dependency (Camel on Quarkus)

```xml
<dependency>
    <groupId>org.apache.camel.quarkus</groupId>
    <artifactId>camel-quarkus-junit5</artifactId>
    <scope>test</scope>
</dependency>
```

### Maven dependency (standalone)

```xml
<dependency>
    <groupId>org.apache.camel</groupId>
    <artifactId>camel-test-junit5</artifactId>
    <scope>test</scope>
</dependency>
```

### Pattern: AdviceWith to mock endpoints

```java
@QuarkusTest
class MyRouteTest extends CamelQuarkusTestSupport {

    @Override
    public boolean isUseAdviceWith() { return true; }

    @Test
    void happyPath_routesToOutput() throws Exception {
        AdviceWith.adviceWith(context, "my-route", a -> {
            a.replaceFromWith("direct:test-input");
            a.mockEndpointsAndSkip("kafka:output-topic");
        });
        context.start();

        MockEndpoint output = getMockEndpoint("mock:kafka:output-topic");
        output.expectedMessageCount(1);
        output.expectedHeaderReceived("processed", true);

        template.sendBody("direct:test-input", testPayload());

        output.assertIsSatisfied();
    }

    @Test
    void errorPath_routesToDlq() throws Exception {
        AdviceWith.adviceWith(context, "my-route", a -> {
            a.replaceFromWith("direct:test-input");
            a.mockEndpointsAndSkip("kafka:output-topic");
            a.mockEndpointsAndSkip("kafka:my-route.dlq");
        });
        context.start();

        MockEndpoint dlq = getMockEndpoint("mock:kafka:my-route.dlq");
        dlq.expectedMessageCount(1);

        template.sendBody("direct:test-input", invalidPayload());

        dlq.assertIsSatisfied();
    }
}
```

### Generate test skeletons with MCP

Use the Camel MCP tool to bootstrap tests:

```
camel_route_test_scaffold → generates JUnit 5 test with MockEndpoint
```

### Key AdviceWith operations

| Operation | Use case |
|---|---|
| `replaceFromWith("direct:test")` | Replace the consumer (e.g. Kafka) with a direct endpoint |
| `mockEndpointsAndSkip("kafka:*")` | Mock and skip real endpoints |
| `mockEndpoints("kafka:*")` | Mock but still send to real endpoint |
| `weaveAddLast().to("mock:result")` | Add a mock at the end |
| `weaveById("processor-id").replace().to("mock:replaced")` | Replace a specific node |

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
mvn test                    # unit tests only
mvn verify                  # unit + integration
mvn verify -DskipUnitTests  # integration only
```
