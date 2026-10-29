# Prerequisites

Complete toolchain for .NET 10 / C# development on **Fedora 44, local tools only**.
There are no containers in this workflow. Install in this order.

## Version matrix (pinned, dated)

Re-verify the newest 10.0.x patch before each release and bump the pin, recording
the date next to it.

| Tool | Pin | Verified |
|---|---|---|
| .NET SDK | 10.0.113 | 2026-10-29 |
| Language | C# 14 | 2026-10-29 |
| Target framework | `net10.0` (LTS, supported to Nov 2028) | 2026-10-29 |
| Test framework | xUnit v3 (GA) | 2026-10-29 |
| Mocking | NSubstitute | 2026-10-29 |

NuGet package patch versions are surveyed and pinned at project creation with
`dotnet package search <id>` or nuget.org. Do not treat any version written into a
snippet as authoritative past its survey date; re-check and pin.

## 1. .NET 10 SDK

The SDK is the single tool for restore, build, test, run, pack, and tool
management. One copy-pasteable block for Fedora 44:

```bash
sudo dnf install -y dotnet-sdk-10.0
dotnet --version        # should report 10.0.x (pin is 10.0.113)
dotnet --list-sdks      # confirm a 10.0.x SDK is present
```

### Pinning an exact SDK without root

Fedora's package gives the newest 10.0.x it carries. To pin an exact SDK into
`$HOME` without touching the system install, use the official install script:

```bash
curl -sSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh
chmod +x /tmp/dotnet-install.sh
/tmp/dotnet-install.sh --version 10.0.113 --install-dir "$HOME/.dotnet"
export PATH="$HOME/.dotnet:$PATH"        # add to ~/.bashrc or ~/.zshrc
dotnet --version                         # 10.0.113
```

Pin the SDK for a repo with a `global.json` at the root so every contributor and CI
run resolves the same SDK:

```json
{
  "sdk": {
    "version": "10.0.113",
    "rollForward": "latestFeature"
  },
  "test": {
    "runner": "Microsoft.Testing.Platform"
  }
}
```

The `test.runner` line makes `dotnet test` use the Microsoft.Testing.Platform runner
that xUnit v3 requires on the .NET 10 SDK. Without it `dotnet test` fails with
"Testing with VSTest target is no longer supported"; the `<TestingPlatformDotnetTestSupport>`
MSBuild property does not substitute for it under the v2 MTP package. See
`references/testing.md`.

## 2. Editor

No Visual Studio. It does not run on Linux. Use one of:

- **VS Code with the C# Dev Kit extension.** Install VS Code, then add the C# Dev
  Kit from the Marketplace. It brings the C# language service, test explorer, and
  debugger that drive the `dotnet` CLI underneath.
- **JetBrains Rider.** A full .NET IDE that runs natively on Linux.

Either way, every build, test, run, and package step in this skill is a `dotnet`
CLI command. Do not rely on IDE-only actions such as "press F5" or Solution
Explorer rituals; a contributor with only the SDK and a text editor must be able
to follow along.

## 3. Git

```bash
sudo dnf install -y git
git --version
```

## 4. check-prereqs script

Drop `templates/check-prereqs.sh.template` into the project as
`scripts/check-prereqs.sh`. It exits non-zero on anything missing (the `dotnet`
CLI on `PATH`, a 10.x SDK installed) so it is safe to run as a CI gate or a first
step in a local setup.

```bash
install -m 0755 scripts/check-prereqs.sh scripts/check-prereqs.sh   # ensure executable
./scripts/check-prereqs.sh
```

## Scaffolding a project

New console app, class library, or web API from the CLI:

```bash
dotnet new console   -n MyService   -o src/MyService
dotnet new classlib  -n MyService.Core -o src/MyService.Core
dotnet new webapi     -n MyService.Api  -o src/MyService.Api

# An optional solution file, created and edited only with the CLI
dotnet new sln -n MyService
dotnet sln add src/MyService/MyService.csproj
```

Place the shared `Directory.Build.props` and `.editorconfig` (from `snippets/`) at
the repo root so nullable reference types, analyzers, and warnings-as-errors apply
to every project without per-project duplication.

## Verify everything

```bash
echo "=== dotnet SDK ===" && dotnet --version && dotnet --list-sdks
echo "=== Git ===" && git --version
echo "=== prereq gate ===" && ./scripts/check-prereqs.sh
```

## Teardown

Local tools, nothing to stop or tear down between runs. To remove build output and
restored packages:

```bash
dotnet clean                                  # remove bin/ and obj/ for the solution
find . -type d \( -name bin -o -name obj \) -prune -exec rm -rf {} +   # hard clean
```

To clear the machine-wide NuGet package cache (rarely needed, forces a full
re-restore):

```bash
dotnet nuget locals all --clear
```

To remove a `$HOME/.dotnet` SDK installed by the install script, delete the
directory and drop it from `PATH`. The `dnf`-installed SDK is removed with
`sudo dnf remove dotnet-sdk-10.0`.
