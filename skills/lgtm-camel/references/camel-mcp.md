# Camel MCP Server

Exposes the Camel catalog, route validation, runtime inspection, migration tools,
and OpenAPI scaffolding to Claude Code via the Model Context Protocol.

## Installation

For Claude Code, use the Camel project's plugin (recommended):

```bash
claude plugin marketplace add apache/camel
claude plugin install camel-mcp@camel-marketplace
```

With the Camel CLI installed, a project-scoped `.mcp.json` can instead launch the
server directly. STDIO is the default transport:

```json
{
  "mcpServers": {
    "camel-mcp": {
      "type": "stdio",
      "command": "camel",
      "args": ["mcp"]
    }
  }
}
```

## Tool discovery

Do not duplicate the server's tool inventory in this skill. Once the server is
connected, the MCP client exposes the tools and their current input schemas to the
agent. Inspect that discovered schema before invoking a tool because capabilities
and supported route formats or runtimes can change between Camel versions.

## Development workflow with MCP

Use the discovered tools to look up component options and dependencies, validate
endpoint URIs or supported route formats, diagnose errors, and inspect a running
integration. Generate test scaffolding only when the tool's current schema supports
the route DSL and target runtime; otherwise write the test from
`references/testing.md`. Always run generated code with `mvn test` or `mvn verify`
rather than treating MCP output as verification.
