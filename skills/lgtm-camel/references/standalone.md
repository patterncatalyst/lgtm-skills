# Standalone Camel Main

Use standalone Camel Main when you don't need the full Quarkus ecosystem — 
lightweight integrations, CLI tools, or environments where Quarkus is overkill.

## When to use standalone vs. Camel on Quarkus

| Criterion | Standalone | Camel on Quarkus |
|---|---|---|
| CDI injection | Camel's built-in registry | Full CDI container |
| Dev mode / live reload | `camel run --dev` | `quarkus dev` |
| Health/metrics endpoints | Manual setup | Built-in (`/q/health`, `/q/metrics`) |
| Native compilation | Not supported | GraalVM native-image |
| Container image size | Smaller (~100MB) | Larger (~200MB) but optimized |
| Startup time | Fast | Faster with native |
| Extension ecosystem | Camel components only | Camel + Quarkus extensions |

## Creating a standalone project

### From CLI prototype

```bash
camel init my-route.java
camel run my-route.java --dev           # prototype
camel export --runtime=camel-main       # export to Maven project
```

### From scratch

```bash
mvn archetype:generate \
    -DarchetypeGroupId=org.apache.camel.archetypes \
    -DarchetypeArtifactId=camel-archetype-main \
    -DarchetypeVersion=4.10.0
```

## Main class

```java
import org.apache.camel.main.Main;

public class App {
    public static void main(String[] args) throws Exception {
        Main main = new Main();
        main.configure().addRoutesBuilder(MyRoute.class);
        main.run(args);
    }
}
```

## Configuration

In `src/main/resources/application.properties`:

```properties
camel.main.name=my-integration
camel.main.routes-include-pattern=classpath:routes/*.java

camel.component.kafka.brokers=localhost:9092
```

## Testing

Same MockEndpoint + AdviceWith patterns work. Use `camel-test-junit5` instead
of `camel-quarkus-junit5`:

```xml
<dependency>
    <groupId>org.apache.camel</groupId>
    <artifactId>camel-test-junit5</artifactId>
    <scope>test</scope>
</dependency>
```
