# Prerequisites

Complete toolchain for Quarkus development. Install in this order.

## 1. SDKMAN

Manages JDK, Maven, JBang, and Quarkus CLI.

```bash
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk version
```

## 2. JDK 25

Compile target is Java 21 (`maven.compiler.release=21`), but development and
container images use JDK 25 (`ubi10/openjdk-25-runtime`).

```bash
sdk install java 25-tem
java -version   # should show 25.x
```

If Temurin 25 isn't listed yet:

```bash
sdk list java | grep 25
# Pick any 25.x vendor (e.g. 25-open)
```

## 3. Maven 4

```bash
sdk install maven 4.0.0
mvn -version    # should show 4.0.0
```

## 4. JBang

Required for the Quarkus Agent MCP server and the Camel MCP server.

```bash
sdk install jbang
jbang version
```

## 5. Quarkus CLI

Installed via SDKMAN (uses JBang internally):

```bash
sdk install quarkus
quarkus version
```

### Key commands

```bash
quarkus create app com.example:my-service    # scaffold a project
quarkus ext add health opentelemetry         # add extensions
quarkus ext ls -i -s kafka                   # search available extensions
quarkus dev                                  # live coding mode
quarkus build                                # production build
quarkus image build podman                   # container image via podman
```

## 6. Podman

Container runtime for local dev infrastructure and image builds.

```bash
# Fedora / RHEL
sudo dnf install podman podman-compose

podman --version          # 4.x+
podman-compose version
```

## 7. Git

```bash
sudo dnf install git
git --version
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
echo "=== JBang ===" && jbang version 2>&1 | head -1
echo "=== Quarkus ===" && quarkus version
echo "=== Podman ===" && podman --version
echo "=== Git ===" && git --version
echo "=== Newman ===" && newman --version 2>/dev/null || echo "(not installed — optional)"
```
