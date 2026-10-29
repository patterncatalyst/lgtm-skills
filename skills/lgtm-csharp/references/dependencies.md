# Dependencies, build settings, and analysis

Common NuGet packages by shape, plus the shared build configuration that turns on
nullable reference types, Roslyn analyzers, and warnings-as-errors for every
project. Survey the latest stable version with `dotnet package search <id>` or
nuget.org before pinning. No containers are involved anywhere here.

## Shared build settings: Directory.Build.props

Place `snippets/Directory.Build.props` at the repo root. MSBuild walks up from each
project and imports the nearest one, so every project inherits these without
per-project duplication:

- `TargetFramework` `net10.0`
- `LangVersion` `14.0`
- `Nullable` `enable` (nullable reference types on everywhere)
- `ImplicitUsings` `enable`
- `TreatWarningsAsErrors` `true`
- `EnforceCodeStyleInBuild` `true` (so `.editorconfig` style rules fail the build)
- `AnalysisLevel` `latest-recommended` (the recommended Roslyn analyzer set)

A project can still override a single property locally when it genuinely must, but
the default is inheritance from the root.

## Style and analyzers: .editorconfig

Place `snippets/.editorconfig` at the repo root. It pins:

- `end_of_line = lf` and `charset = utf-8` (the filesystem is case-sensitive and
  uses `/` separators; line endings are LF)
- C# conventions: file-scoped namespaces, `var` usage, expression-bodied members,
  `using` placement
- Analyzer and compiler diagnostic severities, raised to `error` for the nullable
  (`CS8600`..`CS8655`) and key quality (`CA`) rules so they fail the build rather
  than reaching a test

`dotnet build` applies these through `EnforceCodeStyleInBuild`. `dotnet format`
reformats and fixes fixable violations in place:

```bash
dotnet format            # fix style + whitespace across the solution
dotnet format --verify-no-changes   # CI gate: non-zero if anything is unformatted
```

## Central Package Management (version pinning in one place)

For a multi-project solution, pin every package version once in a
`Directory.Packages.props` at the repo root and reference packages without an
inline version. This is the idiomatic .NET equivalent of a BOM.

```xml
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <!-- Survey + pin the latest stable at project creation:
         dotnet package search <id>   /   nuget.org -->
    <PackageVersion Include="Serilog.Extensions.Hosting" Version="__PINNED__" />
    <PackageVersion Include="Serilog.Sinks.File" Version="__PINNED__" />
    <PackageVersion Include="Serilog.Sinks.Console" Version="__PINNED__" />

    <!-- test stack -->
    <PackageVersion Include="xunit.v3" Version="__PINNED__" />
    <PackageVersion Include="xunit.runner.visualstudio" Version="__PINNED__" />
    <PackageVersion Include="Microsoft.NET.Test.Sdk" Version="__PINNED__" />
    <PackageVersion Include="NSubstitute" Version="__PINNED__" />
  </ItemGroup>
</Project>
```

Each `.csproj` then uses `<PackageReference Include="xunit.v3" />` with no version.
Add a package with `dotnet add package <id>` and move the generated version into
`Directory.Packages.props`.

## Core (every project)

The logging and configuration plumbing is in the shared framework; you add the
file sink and the analyzers.

| Package | Purpose |
|---|---|
| `Microsoft.Extensions.Logging` | `ILogger<T>` abstraction (built into the host for web apps) |
| `Serilog.Extensions.Hosting` + `Serilog.Sinks.Console` + `Serilog.Sinks.File` | Console plus rotating file logging for Claude diagnosis (see `references/logging.md`) |

## Web API

```bash
dotnet new webapi -n MyService.Api -o src/MyService.Api
```

| Package | Purpose |
|---|---|
| (built in) ASP.NET Core minimal APIs | routing, DI, model binding, ProblemDetails |
| `Microsoft.AspNetCore.OpenApi` | OpenAPI document generation (built into the web SDK) |
| `Microsoft.Extensions.Http.Resilience` | `IHttpClientFactory` typed clients with Polly v8 resilience |

Bind the body to a record parameter, return `TypedResults`, register health checks
with `AddHealthChecks()`, and configure logging and HTTP clients through the host.
See the `lgtm-idiomatic-review` .NET idioms for the authoritative shapes.

## Relational data (PostgreSQL)

| Package | Purpose |
|---|---|
| `Npgsql.EntityFrameworkCore.PostgreSQL` | EF Core provider for PostgreSQL |
| `Microsoft.EntityFrameworkCore.Design` | `dotnet ef` migrations tooling |
| `Npgsql.DependencyInjection` | `AddNpgsqlDataSource` for raw-SQL chapters |

```bash
dotnet tool install --global dotnet-ef   # once per machine
dotnet ef migrations add Initial
dotnet ef database update
```

## Messaging (Kafka)

| Package | Purpose |
|---|---|
| `Confluent.Kafka` | Kafka producer/consumer client |

Run the consumer loop inside a `BackgroundService` whose `ExecuteAsync` honours the
cancellation token.

## LLM / AI

Describe the capability generically and implement it with an open-source client.
Do not pull a proprietary cloud SDK into examples unless the user has explicitly
decided to (see the dependency policy in `SKILL.md`).

## Testing

See `references/testing.md` for the full test stack. The packages are `xunit.v3`,
`xunit.runner.visualstudio`, `Microsoft.NET.Test.Sdk`, and `NSubstitute`.

## Package discovery

```bash
dotnet package search Serilog.Sinks.File --take 5    # search nuget.org from the CLI
dotnet list package --outdated                        # flag pins that have moved
dotnet list package --vulnerable                      # flag known-vulnerable pins
```
