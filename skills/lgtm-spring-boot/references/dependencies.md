# Recommended Spring Boot Starters

Starter sets by project type. Add at project creation with `spring init
--dependencies=...` or later by editing `pom.xml` directly.

## Core (every project)

```bash
spring init --boot-version=4.1.0 --java-version=25 \
    --dependencies=actuator,prometheus \
    ...
```

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

| Starter | Purpose |
|---|---|
| `spring-boot-starter-actuator` | Health, info, and management endpoints (`/actuator/health`) |
| `micrometer-registry-prometheus` | Metrics export (`/actuator/prometheus`) |
| `opentelemetry-spring-boot-starter` | Distributed tracing (OTLP export), auto-instruments Spring MVC/WebClient/JDBC |

Micrometer Tracing bridges application-level timers/spans to the OTel SDK;
pull in `micrometer-tracing-bridge-otel` if you need Micrometer's `Tracer`
API directly rather than relying solely on the OTel starter's
auto-instrumentation.

## REST API service

```bash
spring init --dependencies=web,validation,actuator ...
```

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
</dependency>
```

| Starter | Purpose |
|---|---|
| `spring-boot-starter-web` | Spring MVC, embedded Tomcat, Jackson 3 (de)serialization |
| `spring-boot-starter-validation` | Bean Validation (Jakarta Validation 3.1) |
| `springdoc-openapi-starter-webmvc-ui` | OpenAPI 3 spec + Swagger UI generation |

For reactive stacks, swap `spring-boot-starter-web` for
`spring-boot-starter-webflux` and the springdoc WebFlux variant.

## Kafka messaging

```bash
spring init --dependencies=kafka ...
```

```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

Inspect and exercise topics from the CLI with `kcat` rather than a GUI — see
`references/prerequisites.md`.

## PostgreSQL / relational

```bash
spring init --dependencies=data-jpa,postgresql,flyway ...
```

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

| Dependency | Purpose |
|---|---|
| `spring-boot-starter-data-jpa` | Spring Data JPA + Hibernate |
| `postgresql` | JDBC driver |
| `flyway-core` + `flyway-database-postgresql` | Versioned schema migrations |

## LLM / AI

```bash
spring init --dependencies=spring-ai-anthropic ...
```

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-starter-model-anthropic</artifactId>
</dependency>
```

Pin the Spring AI BOM in `dependencyManagement` (Spring AI versions move
independently of Spring Boot):

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-bom</artifactId>
            <version>1.1.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

## Containerization

No starter needed — use the UBI 10 Containerfile template from
`templates/Containerfile`, or Spring Boot's built-in buildpacks support:

```bash
mvn spring-boot:build-image
```

Prefer the UBI 10 Containerfile for Red Hat base image consistency with the
rest of this toolchain; reach for `spring-boot:build-image` only for a quick
local image without hand-maintaining a Containerfile.

## Starter discovery

```bash
spring init --list                         # list all available dependencies
spring init --list | grep -i kafka         # search by keyword
```

Or browse interactively at `https://start.spring.io`.
