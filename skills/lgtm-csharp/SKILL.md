---
name: lgtm-csharp
description: Scaffold a .NET 10 / C# 14 project with full dev toolchain on Fedora, local tools only, no containers. dotnet CLI + NuGet (SDK 10.0.113, verified 2026-10-29), nullable reference types enabled, a shared Directory.Build.props, xUnit v3 + dotnet test, NSubstitute mocking, Roslyn analyzers + .editorconfig with warnings-as-errors, structured console and file logging for Claude, and a check-prereqs script. Use whenever starting a new .NET or C# project, setting up .NET dev prerequisites, or wiring up test infrastructure. Also triggers for "new .NET project", "new C# project", "set up dotnet", ".NET prerequisites", "C# testing setup", "xUnit setup", or any request combining .NET/C# with testing or logging scaffolding. The .NET/C# sibling of lgtm-quarkus, lgtm-spring-boot, and lgtm-python.
---

# lgtm-csharp Skill

A skill that scaffolds a .NET 10 / C# 14 project with a complete development
toolchain, from prerequisites through structured logging for Claude Code and a
layered test framework. It is the .NET/C# sibling of `lgtm-quarkus`,
`lgtm-spring-boot`, and `lgtm-python`.

The output is a project-ready setup: prerequisites verified, nullable reference
types on from the first line, logging wired for AI-assisted diagnosis, and test
infrastructure scaffolded. Everything runs from the `dotnet` CLI on the local
machine.

## Platform policy: Fedora, local tools, no containers

This skill targets **Fedora 44 with local tools only**. There are no containers
anywhere in the workflow. It does not emit a `Containerfile` or `Dockerfile`, and
it does not reach for Testcontainers, compose, or any container runtime. This is
the deliberate difference from `lgtm-spring-boot` and `lgtm-python`, which both
ship UBI 10 Containerfiles. State this plainly to the user when they expect a
container path: there is not one here.

Other platform rules that follow from local-only:

- **No Windows, no Visual Studio.** Visual Studio does not run on Linux. Do not
  reference `.sln` double-click rituals, "press F5", Solution Explorer, or IDE
  screenshots. Editors are **VS Code with the C# Dev Kit** or **JetBrains Rider**.
  All build, test, run, and package steps go through the `dotnet` CLI.
- **Case-sensitive filesystem, `/` path separators, LF line endings.** Namespaces
  and file names must match case. The `.editorconfig` pins `end_of_line = lf`.

## When to use this skill

Use whenever the user is:

- **Starting a new .NET or C# project** and needs the full toolchain from scratch.
- **Setting up prerequisites** for an existing .NET project (dotnet SDK, editor,
  git).
- **Setting up test infrastructure** (xUnit v3 unit tests, NSubstitute mocking,
  `dotnet test`).
- **Adding structured logging** for post-run AI-assisted diagnosis.
- **Enforcing analysis and style** with Roslyn analyzers, `.editorconfig`, and
  warnings-as-errors.

## What the skill does NOT do

- It does not produce a container image. No `Containerfile`, no Dockerfile, no
  Testcontainers. The platform is local tools on Fedora.
- It does not scaffold Kubernetes or an OpenShift path. Those siblings are for
  container-based stacks; this one is not.
- It does not scaffold an observability stack (Grafana, Loki, Tempo, Mimir).
  Example apps log to the console and to a rotating file. See
  `references/logging.md`.
- It does not produce tutorial prose or documentation sites. Pair with
  `lgtm-jekyll` or `lgtm-tutorial`.
- It does not install the .NET SDK itself. It produces the commands and verifies
  they succeed. The user runs the installs.

## Workflow

When invoked, do this in order:

1. **Check prerequisites.** Verify or guide installation of each tool. Use
   `references/prerequisites.md` for the full checklist and install commands, and
   drop in `templates/check-prereqs.sh.template` as `scripts/check-prereqs.sh`.

2. **Scaffold or update the project.** Create a new project or solution with
   `dotnet new`, or update an existing one. Add the shared `Directory.Build.props`
   and `.editorconfig` so nullable reference types, analyzers, and
   warnings-as-errors apply from the start. Use `references/dependencies.md`.

3. **Wire up logging.** Add `Microsoft.Extensions.Logging` console output plus a
   rotating file sink so Claude Code can read logs after a crash or test failure.
   Use `references/logging.md`.

4. **Wire up testing.** Add an xUnit v3 test project with NSubstitute and run it
   with `dotnet test`. Use `references/testing.md` and the snippets.

5. **Generate CLAUDE.md** if new project. Include project-specific context for
   Claude Code. Use `templates/CLAUDE.md.template`.

## Dependency and platform policy (non-negotiable)

- **Upstream, latest stable, pinned.** Always promote the upstream project's latest stable
  release (never a prerelease), surveyed upstream at the start of work, and pin it exactly. Step
  back only for an actual incompatibility, and record the hold and its reason next to the pin. A
  "newer than supported" warning or a support matrix that has not caught up is not, on its own, a
  reason to step back. Never a floating tag.
- **Maintained open source first.** Before adding any library, image, service or tool, look for a
  maintained open-source option: an open license, recent releases, and no fees or license keys.
  An archived or unmaintained project is not an option; say so and pick a maintained one.
- **No vendor cloud components unless the user decides otherwise.** Do not bring AWS, Google
  Cloud, Microsoft/Azure or other company-specific services, SDKs or managed offerings into
  examples or recommended solutions (for example `aws-sdk-*`, `boto3`, S3 pre-signed URLs, STS,
  Azure or Google Cloud client libraries) unless the user has explicitly decided to. Describe the
  capability generically and implement it with open-source components. The rule is about
  proprietary and managed services, not about who sponsors an open-source project: the stack
  leans on Red Hat-led open source (UBI images, Quarkus, Strimzi, Apicurio, Debezium, Keycloak),
  and that is welcome. .NET itself, the `dotnet` CLI, and the official NuGet client are
  open source (MIT) and run free on Linux, so they are in scope; the rule bars proprietary
  cloud SDKs, not the runtime.
- **Prefer CNCF and vendor-neutral standards.** When options compete, prefer CNCF projects and
  other vendor-neutral, industry-standard open source: OpenTelemetry, Strimzi, CloudNativePG,
  KEDA, Istio, Kyverno, Falco, and OpenMetadata for metadata catalogs.
- **Generic Kubernetes is the target.** minikube (docker driver, containerd) is the primary
  Kubernetes target because it is generic upstream Kubernetes. OpenShift Local (CRC) appears only
  to show the same examples running on an on-premises Kubernetes distribution: application code,
  images, verification and recommended solutions never depend on OpenShift-, CRC- or ACS-specific
  features. This skill ships no cluster path of its own; when a project later needs one, pair
  with `lgtm-minikube-stack` or `lgtm-crc`.

## Key principles (always apply)

- **The `dotnet` CLI is the single tool.** Restore, build, test, run, pack, and
  tool management all go through `dotnet`. No IDE-only steps, no `.sln`
  double-click, no "press F5". A solution file is optional; when used it is
  created and edited with `dotnet sln`.

- **.NET 10 is the LTS line, supported to November 2028.** Pin the SDK exactly.
  The current pin is **SDK 10.0.113, verified 2026-10-29**. Re-verify the newest
  10.0.x patch before each release and bump the pin, recording the date. Target
  `net10.0`. Do not target an older TFM to work around a tooling gap.

- **C# 14 with nullable reference types enabled everywhere.** Set
  `<LangVersion>14.0</LangVersion>` and `<Nullable>enable</Nullable>` in the
  shared `Directory.Build.props` so every project inherits them. Nullable
  warnings are errors (see below), so a possible-null dereference fails the build
  rather than reaching a test.

- **Warnings are errors, analyzers are on.** `Directory.Build.props` sets
  `TreatWarningsAsErrors=true`, `EnforceCodeStyleInBuild=true`, and an
  `AnalysisLevel` that turns on the recommended Roslyn analyzers. Style and
  analysis rules live in `.editorconfig`, applied by `dotnet build` and
  `dotnet format`.

- **xUnit v3 for tests, run with `dotnet test`.** xUnit v3 is the current GA line.
  One test project per project under test, named `<Project>.Tests`. See
  `references/testing.md`.

- **NSubstitute for mocking, not Moq.** Moq's 4.20.0 bundled SponsorLink, which
  extracted a hashed developer email at build time. NSubstitute has no telemetry
  and the cleanest syntax (no `Setup`, no `.Object`). FakeItEasy is the named
  alternative if a team prefers it. Do not advise migrating an existing Moq suite;
  this guidance is for new code.

- **Structured file logging is non-negotiable for AI-assisted development.** The
  app writes logs to a rotating file that Claude Code can read after a crash or
  test failure, in addition to the console. Console output alone scrolls away and
  cannot be grep'd by an agent post-mortem. See `references/logging.md`.

- **No containers.** This is the platform decision, not an omission. There is no
  Containerfile template and no container-based test layer. Example apps run with
  `dotnet run` and tests with `dotnet test`, both on the local machine.

- **Supported stable releases only, always pinned.** Every package, analyzer, and
  tool is pinned to a supported stable release: the newest non-prerelease version,
  unless an actual incompatibility holds it back (record the hold and reason next
  to the pin). Never a prerelease (`-preview`, `-rc`, `-beta`, `-alpha`), a
  floating version range that resolves to whatever is newest at restore time, or a
  wildcard such as `10.0.*`. Pin NuGet versions in the project file, or centrally
  in `Directory.Packages.props` with Central Package Management, and commit the
  result. Survey the latest stable with `dotnet package search <id>` or nuget.org
  before pinning.

- **Open source only, no fees.** Every runtime, library, analyzer, and tool must
  be usable without a license fee, license key, or paid subscription: anyone who
  clones the project runs it for free. The .NET SDK, the `dotnet` CLI, xUnit,
  NSubstitute, and the Roslyn analyzers are all open source. When a package's
  newest release moves to a commercial license, pin the newest open-source line
  instead and record why next to the pin. Check the license field on nuget.org
  when bumping.

## Reference files

Read these as needed, not preemptively:

- `references/prerequisites.md` - Fedora 44 .NET 10 SDK install (one
  copy-pasteable block), the pinned and dated version matrix, the check-prereqs
  script, editor setup, and teardown.
- `references/dependencies.md` - common NuGet packages by shape, the shared
  `Directory.Build.props`, `.editorconfig`, Roslyn analyzers, warnings-as-errors,
  and Central Package Management.
- `references/testing.md` - xUnit v3 + NSubstitute patterns, test project layout,
  and `dotnet test`.
- `references/logging.md` - console and rotating-file logging for example apps,
  wired through `Microsoft.Extensions.Logging` for Claude Code diagnosis. No
  observability stack, no containers.
- `references/mcp-servers.md` - the honest MCP situation: there is no .NET
  dev-assistant MCP like the Quarkus Agent; the usable one is the official NuGet
  MCP server for packages; the `ModelContextProtocol` C# SDK is for building
  servers, not dev-assist. Microsoft Learn and the C# language spec are the
  authoritative docs.

## Snippets

Drop-in reusable patterns:

- `snippets/Directory.Build.props` - shared build settings (TFM, LangVersion,
  Nullable, ImplicitUsings, TreatWarningsAsErrors, analyzers).
- `snippets/.editorconfig` - style and analyzer severities, LF line endings,
  C# conventions.
- `snippets/ExampleTests.cs` - xUnit v3 `Fact`/`Theory` with NSubstitute
  (`Substitute.For`, `Returns`, `Received`), nullable-aware.
- `snippets/Example.Tests.csproj` - test project showing the test package refs.

## Templates

- `templates/CLAUDE.md.template` - project CLAUDE.md for .NET: dotnet CLI commands,
  test commands, nullable reference types, analyzers, no containers.
- `templates/check-prereqs.sh.template` - exits non-zero on anything missing
  (dotnet SDK present and correct major version), with a teardown note.

## Multi-step work → `lgtm-relay`

For non-trivial projects (multi-project solution, a service plus a worker plus
shared library), use `lgtm-relay`: Opus plans the project and test layout, Sonnet
scaffolds and wires everything, Opus validates against a real `dotnet build` and
`dotnet test` run.
