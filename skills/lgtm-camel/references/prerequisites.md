# Camel Prerequisites

Everything needed to build and run Camel on Quarkus projects. Install in this order.

## 1. SDKMAN

Manages JDK, Maven, JBang, and Quarkus CLI.

```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk version
```

## 2. JDK 25 (Temurin)

```bash
sdk install java 25-tem
java -version   # should show Temurin 25.x
```

### JVM garbage collector

The UBI 10 runtime image (`ubi10/openjdk-25-runtime`, OpenJDK 25.0.3 LTS Red Hat
build) defaults to **G1GC**. Shenandoah is available for lower-latency GC pauses:

```bash
java -XX:+UseShenandoahGC -jar app.jar
```

For Camel on Quarkus, set via `application.properties`:

```properties
quarkus.jvm.args=-XX:+UseShenandoahGC
```

## 3. Maven 3.9

```bash
sdk install maven 3.9.9
mvn -version    # should show 3.9.9
```

## 4. JBang

Required for the Camel CLI and Camel MCP server.

```bash
sdk install jbang
jbang version
```

## 5. Quarkus CLI

For Camel on Quarkus projects (the default runtime):

```bash
sdk install quarkus
quarkus version
```

### Adding Camel extensions to a Quarkus project

```bash
quarkus ext add camel-quarkus-core
quarkus ext add camel-quarkus-kafka
quarkus ext add camel-quarkus-rest
quarkus ext add camel-quarkus-jackson
# Search for available Camel extensions
quarkus ext ls -i -s camel
```

## 6. Camel CLI

Install via JBang:

```bash
jbang app install camel@apache/camel
camel version    # should show 4.x
```

### Key commands

```bash
# Prototyping
camel init hello.java                      # scaffold a route file
camel run hello.java                       # run it (auto-resolves deps)
camel run hello.java --dev                 # run with live reload

# Managing running integrations
camel ps                                   # list running processes
camel get                                  # inspect integration details
camel log                                  # tail logs
camel trace                                # trace messages through routes
camel tui                                  # terminal dashboard

# Export to Maven project
camel export --runtime=quarkus             # generate Quarkus Maven project
camel export --runtime=camel-main          # generate standalone project

# Testing
camel test                                 # run Citrus tests

# Local infrastructure for prototyping and tests
camel infra list                           # list available services
camel infra run kafka --background         # start a service
camel infra ps                             # list running services
camel infra get kafka                      # print connection details
camel infra log kafka                      # tail service logs
camel infra restart kafka --background     # restart a service
camel infra stop kafka                     # stop a service
```

`camel infra` complements Quarkus Dev Services. It exposes Camel test-infra
services that may not have an equivalent Quarkus Dev Service and is also useful
when the infrastructure must outlive a single `quarkus dev` or test process.

## 7. Podman (for containerization)

```bash
sudo dnf install podman podman-compose
podman --version    # 4.x+
```

## Verify everything

```bash
echo "=== JDK ===" && java -version 2>&1 | head -1
echo "=== Maven ===" && mvn -version 2>&1 | head -1
echo "=== JBang ===" && jbang version 2>&1 | head -1
echo "=== Quarkus CLI ===" && quarkus version
echo "=== Camel CLI ===" && camel version
echo "=== Podman ===" && podman --version
```
