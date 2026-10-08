# Prerequisites

Complete toolchain for Spring Boot development. Install in this order.

## 1. SDKMAN

Manages JDK, Maven, and the Spring Boot CLI.

```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk version
```

## 2. JDK 25 (Temurin)

JDK 25 Temurin for both development and compile target. Spring Boot 4 has a
17+ baseline, but this toolchain compiles to JDK 25. Container images use
`ubi10/openjdk-25-runtime`.

```bash
sdk install java 25-tem
java -version   # should show Temurin 25.x
```

### JVM garbage collector

The UBI 10 runtime image defaults to **G1GC**. Shenandoah is available if
lower-latency GC pauses are needed:

```bash
# Default (G1GC) — no flag needed
java -jar app.jar

# Shenandoah — lower pause times, slightly higher throughput cost
java -XX:+UseShenandoahGC -jar app.jar
```

Set in the Containerfile via `JAVA_OPTS_APPEND`, or pass directly:

```bash
java -XX:+UseShenandoahGC -jar app.jar
```

## 3. Maven 3.9

```bash
sdk install maven 3.9.9
mvn -version    # should show 3.9.9
```

Set the compile target in the POM:

```xml
<properties>
    <java.version>25</java.version>
</properties>
```

Or, if not using `spring-boot-starter-parent`'s `java.version` property:

```xml
<properties>
    <maven.compiler.release>25</maven.compiler.release>
</properties>
```

## 4. Spring Boot CLI

Installed via SDKMAN:

```bash
sdk install springboot
spring --version
```

### Key commands

```bash
# Scaffold a project via Spring Initializr (requires network access)
spring init --boot-version=4.1.0 --java-version=25 \
    --dependencies=web,actuator,validation \
    --group-id=com.example --artifact-id=my-service \
    --name=my-service --package-name=com.example.myservice \
    my-service

# Equivalent via curl against start.spring.io
curl https://start.spring.io/starter.zip \
    -d bootVersion=4.1.0 -d javaVersion=25 \
    -d dependencies=web,actuator,validation \
    -d groupId=com.example -d artifactId=my-service \
    -o my-service.zip
```

Pin `--boot-version` to a supported stable 4.1.x release — check
`https://repo1.maven.org/maven2/org/springframework/boot/spring-boot/maven-metadata.xml`
for the newest non-prerelease version. Never scaffold against an unpinned
"latest" default.

## 5. Podman

Container runtime for local dev infrastructure and image builds.

```bash
# Fedora / RHEL
sudo dnf install podman

podman --version          # 4.x+
podman compose version    # built-in subcommand, not podman-compose
```

## 6. Git

```bash
sudo dnf install git
git --version
```

## 7. kcat (Kafka CLI tooling)

This toolchain uses `kcat` for Kafka inspection and ad-hoc produce/consume —
not a browser-based Kafka UI. Grafana is the only GUI in this stack.

```bash
# Fedora / RHEL
sudo dnf install kcat

kcat -V
```

### Common kcat commands

```bash
# List brokers, topics, partitions
kcat -b localhost:9092 -L

# Produce a message
echo '{"id":"1","status":"created"}' | kcat -b localhost:9092 -t orders -P

# Consume from the beginning
kcat -b localhost:9092 -t orders -C -o beginning -e

# Consume as a named group, formatted
kcat -b localhost:9092 -t orders -C -G my-group -f 'Partition %p Offset %o: %s\n'
```

## 8. Newman (optional — API testing)

Newman is the CLI runner for Postman collections.

```bash
# Requires Node.js
sudo dnf install nodejs
npm install -g newman newman-reporter-htmlextra
newman --version
```

## Verify everything

```bash
echo "=== JDK ===" && java -version 2>&1 | head -1
echo "=== Maven ===" && mvn -version 2>&1 | head -1
echo "=== Spring Boot CLI ===" && spring --version
echo "=== Podman ===" && podman --version
echo "=== Git ===" && git --version
echo "=== kcat ===" && kcat -V
echo "=== Newman ===" && newman --version 2>/dev/null || echo "(not installed — optional)"
```
