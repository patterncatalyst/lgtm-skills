# MCP servers for .NET development

The honest situation, stated plainly. Unlike `lgtm-quarkus` (which pairs with the
Quarkus Agent MCP) and `lgtm-camel` (the Apache Camel MCP), **there is no
dev-assistant MCP server for .NET** at that level. Nothing scaffolds, runs,
searches docs, and inspects a running app the way the Quarkus Agent MCP does. Keep
the .NET toolchain **CLI-based**: `dotnet new`, `dotnet build`, `dotnet test`,
`dotnet run`.

## Scaffolding and docs: use the CLI and Microsoft Learn (default)

Generate projects with the `dotnet` CLI:

```bash
dotnet new console -n MyService -o src/MyService
dotnet new webapi  -n MyService.Api -o src/MyService.Api
dotnet new xunit   -n MyService.Tests -o tests/MyService.Tests
```

For documentation, the authoritative sources are **Microsoft Learn**
(<https://learn.microsoft.com/dotnet/>) and the **C# language specification**, not
blog posts. Check the API, configuration, and version matrix there first.

## The usable MCP: the official NuGet MCP server

Microsoft ships an official **NuGet MCP server** for package search and management.
It is the one MCP worth adding to a .NET dev workflow, and its scope is packages
(search, version lookup, add/update), not app scaffolding or runtime inspection.

- It is **launched with `dnx`**, the dotnet tool-execution command added in the
  **.NET 10 SDK**. The .NET 10 SDK is therefore a prerequisite, which this skill
  already pins.
- Configure it in the MCP client (for example a repo-local `.mcp.json`):

```json
{
  "servers": {
    "nuget": {
      "command": "dnx",
      "args": ["Microsoft.Extensions.AI.Templates.NuGetMcpServer", "--yes"]
    }
  }
}
```

> Confirm the exact package id and launch arguments against the current NuGet MCP
> server documentation on Microsoft Learn before wiring it in; the `dnx`-launched
> package id is what moves between releases. The function it provides (package
> search and management) is low-risk, but pin and review as with any MCP server,
> and give it no secrets.

## The C# MCP SDK is for building servers, not dev-assist

The official **`ModelContextProtocol` C# SDK** (v2.x, a Microsoft and Anthropic
collaboration) is a library for **building** MCP servers in C#. It is not a
development assistant. Reach for it only when a service needs to **expose itself**
as an MCP server to AI clients, which is a different use from assisting .NET
development. Do not install it expecting Quarkus-Agent-style help; it will not
scaffold, run, or inspect your project.

## Summary

| Need | Tool |
|---|---|
| Scaffold, build, test, run | `dotnet` CLI |
| API and language docs | Microsoft Learn + the C# language spec |
| Package search / management | official NuGet MCP server (`dnx`, needs .NET 10 SDK) |
| Build an MCP server in C# | `ModelContextProtocol` C# SDK (v2.x) - not dev-assist |
| Quarkus-Agent-style dev MCP | does not exist for .NET |
