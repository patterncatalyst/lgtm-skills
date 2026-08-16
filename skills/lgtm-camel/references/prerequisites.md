# Camel Prerequisites

Assumes SDKMAN, JDK 25, and Maven 4 are already installed (via `lgtm-quarkus`
or manually). This covers the Camel-specific tooling.

## 1. JBang

Required for the Camel CLI and Camel MCP server.

```bash
sdk install jbang
jbang version
```

## 2. Camel CLI

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

# Catalog and validation
camel catalog component kafka              # look up a component
camel validate route.java                  # validate a route

# Testing
camel test                                 # run Citrus tests
```

## 3. Camel TUI

Installed with the Camel CLI — no separate install needed:

```bash
camel tui
```

The TUI provides a terminal dashboard with:
- Route topology visualization
- Message tracing
- Performance metrics
- Source editor
- AI integration for route explanation

Works over SSH, in containers, and in CI environments where a browser isn't available.

## 4. Quarkus CLI (for Camel on Quarkus)

If using Camel on Quarkus (the default):

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

## Verify everything

```bash
echo "=== JBang ===" && jbang version 2>&1 | head -1
echo "=== Camel CLI ===" && camel version
echo "=== Quarkus CLI ===" && quarkus version 2>/dev/null || echo "(not installed — only needed for Camel on Quarkus)"
```
