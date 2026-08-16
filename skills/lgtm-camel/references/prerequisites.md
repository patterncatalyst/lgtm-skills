# Camel Prerequisites

Everything needed to build and run Camel on Quarkus projects. Install in this order.

## 1. SDKMAN

Manages JDK, Maven, JBang, and Quarkus CLI.

```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk version
```

## 2. JDK 25

```bash
sdk install java 25-tem
java -version   # should show 25.x
```

If Temurin 25 isn't listed yet:

```bash
sdk list java | grep 25
# Pick any 25.x vendor (e.g. 25-open)
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
```

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
