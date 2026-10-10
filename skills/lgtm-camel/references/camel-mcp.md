# Camel MCP Server

Exposes the Camel catalog, route validation, runtime inspection, migration tools,
and OpenAPI scaffolding to Claude Code via the Model Context Protocol.

## Installation

The server is published to Maven Central as a runnable artifact,
`org.apache.camel:camel-jbang-mcp:<version>:runner`. Pin it to the same stable
Camel version as the CLI (4.22.1 for `quarkus-camel-bom` 3.40.1; see
`prerequisites.md`). STDIO is the default transport.

```bash
claude mcp add -s user camel-mcp -- jbang -Dquarkus.log.level=WARN org.apache.camel:camel-jbang-mcp:4.22.1:runner
```

Or in `.mcp.json` (project scope):

```json
{
  "mcpServers": {
    "camel-mcp": {
      "type": "stdio",
      "command": "jbang",
      "args": ["-Dquarkus.log.level=WARN", "org.apache.camel:camel-jbang-mcp:4.22.1:runner"]
    }
  }
}
```

New MCP servers load at session start: open a new session (or `/mcp`) and check
`claude mcp list` shows `camel-mcp ... Connected`.

The Camel project also publishes a Claude Code plugin
(`claude plugin marketplace add apache/camel`, then
`claude plugin install camel-mcp@camel-marketplace`). It launches the same
artifact but at `LATEST`, from a marketplace read off the `apache/camel` main
branch. Use the pinned command above unless floating versions are acceptable
for the project.

Alternative: with the Camel CLI installed, `camel mcp` starts the same server
through the `mcp` plugin. Run `camel plugin add mcp` once first; otherwise the
first `camel mcp` prints "Installed plugin: mcp / Please re-run the command" to
stdout and exits, and the MCP client fails to connect.

Note: the 4.22.1 release reports `"version": "4.22.1-SNAPSHOT"` in its MCP
`serverInfo`. That string is a fallback default in the release jar's own
`application.properties`; the artifact is the 4.22.1 release from Maven
Central, not a snapshot build.

## Capabilities

- Catalog exploration for components, EIPs, data formats, languages, Kamelets,
  examples, dependencies, and versions.
- Route, endpoint, configuration, and dependency validation and transformation.
- Test scaffolding, error diagnosis, route diagrams, and security analysis.
- OpenAPI contract-first development and Camel migration assistance.
- Runtime inspection and interaction with running Camel integrations.

## Development workflow with MCP

Use the discovered tools to look up component options and dependencies, validate
endpoint URIs or supported route formats, diagnose errors, and inspect a running
integration. Generate test scaffolding only when the tool's current schema supports
the route DSL and target runtime; otherwise write the test from
`references/testing.md`. Always run generated code with `mvn test` or `mvn verify`
rather than treating MCP output as verification.
