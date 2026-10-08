# Testing Infrastructure

Multi-layer test strategy for Spring Boot projects.

## Test layers

| Layer | Framework | Scope | Speed | Maven phase |
|---|---|---|---|---|
| 1. Unit tests | JUnit 5 (JUnit Jupiter) + Spring Boot Test (`@SpringBootTest`, `@WebMvcTest`) | Single class/slice logic | Seconds | `test` (surefire) |
| 2. Integration tests | Testcontainers + JUnit, with Spring Boot `@ServiceConnection` | Cross-service flows, real infra | Minutes | `verify` (failsafe) |
| 3. API tests | Newman (Postman CLI) | HTTP contract validation | Seconds | Script or CI stage |

### Naming convention

- `*Test.java` — unit tests, run by surefire
- `*IT.java` — integration tests, run by failsafe

## Layer 1: Unit tests

### Maven dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

`spring-boot-starter-test` pulls in JUnit Jupiter, Spring Test, AssertJ,
Mockito, and JSONassert. Versions come from `spring-boot-starter-parent` (or
`spring-boot-dependencies` if you're not using the parent POM).

### Pattern: REST endpoint test (`@WebMvcTest`)

```java
@WebMvcTest(GreetingController.class)
class GreetingControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    void helloEndpointReturnsGreeting() throws Exception {
        mockMvc.perform(get("/hello"))
            .andExpect(status().isOk())
            .andExpect(content().string("Hello"));
    }
}
```

### Pattern: full context test (`@SpringBootTest`)

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class GreetingApplicationTest {

    @Autowired
    TestRestTemplate restTemplate;

    @Test
    void helloEndpointReturnsGreeting() {
        ResponseEntity<String> response = restTemplate.getForEntity("/hello", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo("Hello");
    }
}
```

For reactive stacks, swap `TestRestTemplate` for `WebTestClient`.

### Pattern: Micrometer metric assertion

```java
@SpringBootTest
class MetricsTest {

    @Autowired
    MeterRegistry registry;

    @Test
    void processedCounterIncrements() {
        // trigger processing...

        Counter counter = registry.find("app.processed.total")
            .tag("type", "widget")
            .counter();
        assertThat(counter).isNotNull();
        assertThat(counter.count()).isGreaterThan(0);
    }
}
```

### Pattern: Actuator health check

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthEndpointTest {

    @Autowired
    TestRestTemplate restTemplate;

    @Test
    void actuatorHealthReportsUp() {
        ResponseEntity<String> response = restTemplate.getForEntity("/actuator/health", String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
    }
}
```

## Layer 2: Testcontainers integration tests

### Maven dependencies

```xml
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>kafka</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
```

Add to `dependencyManagement` (Testcontainers is not covered by
`spring-boot-dependencies`):

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>testcontainers-bom</artifactId>
            <version>1.20.4</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### Maven plugin config

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <includes><include>**/*Test.java</include></includes>
        <excludes><exclude>**/*IT.java</exclude></excludes>
    </configuration>
</plugin>
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

### Pattern: `@ServiceConnection` integration test

Spring Boot's `@ServiceConnection` auto-configures the datasource/broker
connection properties from the running container — no manual
`@DynamicPropertySource` wiring needed.

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:17.2");

    @Autowired
    OrderRepository orderRepository;

    @Test
    void savesAndLoadsOrder() {
        Order saved = orderRepository.save(new Order("widget", 3));
        assertThat(orderRepository.findById(saved.getId())).isPresent();
    }
}
```

### Running

```bash
mvn test                    # Layer 1 only (surefire)
mvn verify                  # Layer 1 + 2 (surefire + failsafe)
mvn verify -DskipUTs        # Layer 2 only (failsafe), if surefire skip is wired
```

## Layer 3: Newman / Postman API tests

### Postman collection structure

```
test-data/
├── postman/
│   ├── my-service.postman_collection.json
│   └── local.postman_environment.json
```

### Running with Newman

```bash
newman run test-data/postman/my-service.postman_collection.json \
    -e test-data/postman/local.postman_environment.json \
    -r cli,htmlextra \
    --reporter-htmlextra-export test-data/postman/report.html
```

### CI integration

```yaml
test:api:
  stage: test
  image: postman/newman:6-alpine
  script:
    - newman run test-data/postman/*.postman_collection.json
        -e test-data/postman/ci.postman_environment.json
        --reporters cli,junit
        --reporter-junit-export results/newman-report.xml
  artifacts:
    when: always
    reports:
      junit: results/newman-report.xml
```

## Micrometer + OpenTelemetry starters

Add at project creation for observability from day one:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-spring-boot-starter</artifactId>
</dependency>
```

Pin the OpenTelemetry instrumentation BOM in `dependencyManagement`:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.opentelemetry.instrumentation</groupId>
            <artifactId>opentelemetry-instrumentation-bom</artifactId>
            <version>2.11.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### Verifying metrics endpoint

```bash
curl -s http://localhost:8080/actuator/prometheus | grep app_
```

### Verifying health endpoint

```bash
curl -s http://localhost:8080/actuator/health | jq
```
