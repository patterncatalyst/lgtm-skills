# Structured Logging for Claude Code

Console output plus a rotating file so Claude Code can read logs after a crash, a
test failure, or unexpected behavior. This is essential for AI-assisted diagnosis.
There is no observability stack and no container here; logging is plain local
files, suited to example and tutorial apps.

## Why file logging matters for AI agents

Console output scrolls away and cannot be retrieved after a process exits. A
rotating file gives Claude Code a persistent, grep-able record of what happened.
The .NET console provider alone is not enough for a post-mortem.

## The abstraction: ILogger<T>

Write application logs through `ILogger<T>` with message templates, never
`Console.WriteLine` in service code. The named placeholders become structured
fields, and the same call renders to both the console and the file.

```csharp
public sealed class OrderService(ILogger<OrderService> logger, IOrderRepository repo)
{
    public async Task<Order> PlaceAsync(OrderRequest request, CancellationToken ct)
    {
        logger.LogInformation("Placing order for {Sku} x{Quantity}", request.Sku, request.Quantity);
        var order = await repo.SaveAsync(request.ToOrder(), ct);
        logger.LogInformation("Placed order {OrderId}", order.Id);
        return order;
    }
}
```

On hot paths, use `[LoggerMessage]` source-generated log methods to avoid
boxing and template parsing per call.

## Console plus rotating file with Serilog

The built-in console provider covers the console. For the rotating file, Serilog
(Apache-2.0, open source) plugs into the generic host and writes a dated,
size-rolled file. Add the packages (survey and pin the versions):

```bash
dotnet add package Serilog.Extensions.Hosting
dotnet add package Serilog.Sinks.Console
dotnet add package Serilog.Sinks.File
```

Wire it into the host in `Program.cs`:

```csharp
using Serilog;

var builder = WebApplication.CreateBuilder(args);   // or Host.CreateApplicationBuilder for a worker

builder.Services.AddSerilog((services, config) => config
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "{Timestamp:HH:mm:ss} {Level:u3} {SourceContext} {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: "logs/app-.log",
        rollingInterval: RollingInterval.Day,
        fileSizeLimitBytes: 10_000_000,
        rollOnFileSizeLimit: true,
        retainedFileCountLimit: 5,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff} {Level:u3} {SourceContext} {Message:lj}{NewLine}{Exception}"));
```

`AddSerilog` routes every `ILogger<T>` call through Serilog's sinks, so application
code keeps using the standard abstraction. The `logs/app-.log` path produces files
such as `logs/app-20261029.log`, rolled daily and at 10 MB, keeping the last five.

### Configuration-driven levels

Put levels in `appsettings.json` so they tune without a rebuild:

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "Microsoft.AspNetCore": "Warning",
        "System.Net.Http.HttpClient": "Warning"
      }
    }
  }
}
```

An `appsettings.Development.json` overrides these for local runs
(`DOTNET_ENVIRONMENT=Development`).

## Lighter alternative without Serilog

If a project wants to stay on the Microsoft logging stack only, a small file
provider such as `NReco.Logging.File` (MIT) plugs a rotating file sink directly
into `Microsoft.Extensions.Logging` with `builder.Logging.AddFile(...)`, no Serilog
dependency. Serilog is the richer default; this is the minimal path.

## Log directory convention

```
project-root/
├── logs/
│   ├── app-20261029.log          ← current day
│   └── app-20261028.log          ← rotated
├── src/
└── tests/
```

Add `logs/` to `.gitignore`.

## Reading logs with Claude Code

After a failure, Claude Code can:

1. Read the file directly: `Read logs/app-20261029.log`
2. Grep for errors: `grep -n 'ERR\|WRN\|Exception' logs/app-20261029.log`
3. Tail the active log while the app runs with `dotnet run` in the background.

The timestamped, level-tagged format with the source context makes it
straightforward for an agent to trace the failure chain.
