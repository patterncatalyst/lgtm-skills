# MCP servers for Spring Boot development

Unlike `lgtm-quarkus` (which pairs with the Quarkus Agent MCP) and `lgtm-camel`
(the Apache Camel MCP), **there is no dev-assistant MCP server for Spring Boot**
at that level — nothing that scaffolds, runs, searches docs, and inspects a
running app the way the Quarkus Agent MCP does. Keep the Spring Boot toolchain
**CLI-based**.

## Scaffolding: use the CLI (default)

Generate projects with the Spring Boot CLI or `start.spring.io` directly:

```bash
spring init --build=maven --java-version=25 \
  --dependencies=web,actuator,testcontainers my-service
# or: curl https://start.spring.io/starter.zip -d ... -o my-service.zip
```

No MCP server is needed for this, and it fits the house CLI-over-GUI preference.

## Optional (vet before use): Spring Initializr MCP

`github.com/hpalma/springinitializr-mcp` is a community, single-maintainer MCP
server that wraps Spring Initializr so an assistant can generate/download
projects. It is **optional and not a default**. If you adopt it:

- Pin a specific commit, read the source, and run it sandboxed.
- Give it no secrets or credentials (MCP servers run with tool access).
- It mostly calls `start.spring.io`, so its function is low-risk, but the trust
  bar is "review it yourself" — it is not an official Spring project.

The CLI above covers the same ground without adding a server.

## Building an MCP server FROM a Spring app (different thing)

Spring AI's MCP Server Boot Starters (`@McpTool`/`@McpResource`, Streamable-HTTP
transport; Spring AI 2.0 + Spring Boot 4.1) let a Spring application *expose
itself* as an MCP server. That is for publishing your service to AI clients, not
for assisting Spring Boot development. Reach for it only when a service needs to
offer MCP tools, not as part of the dev toolchain.

- Spring AI MCP overview: <https://docs.spring.io/spring-ai/reference/api/mcp/mcp-overview.html>
- Spring Initializr MCP (community): <https://github.com/hpalma/springinitializr-mcp>
