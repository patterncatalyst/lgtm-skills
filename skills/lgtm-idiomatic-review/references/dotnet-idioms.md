# .NET idioms

Idiomatic .NET 10, ASP.NET Core minimal APIs, and C# 14 for example and tutorial
code. Authority: the collection's dependency and platform policy (upstream OSS,
pinned, no vendor-cloud SDKs), `lgtm-docker-stack` for the OTLP and compose wiring,
and the ASP.NET Core 10 and .NET docs on learn.microsoft.com. Severity tiers match
the SKILL: **reinvented** > **deprecated** > **structure** > **style**.

The guiding rule: the generic host, DI container, options, logging, health
checks, and `IHttpClientFactory` already cover service plumbing. Code that
replaces the host lifetime, parses JSON by hand, or opens connections per call is
usually working around them.

## Health checks, not hand-mapped `/healthz` (reinvented)

Register checks with `AddHealthChecks()` and map them with `MapHealthChecks`,
splitting liveness and readiness by tag. Dependency checks belong to readiness
only. For EF Core use `AddDbContextCheck<T>()`
(`Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore`).

```csharp
// before
app.MapGet("/readyz", async (NpgsqlDataSource db) => {
    try { await using var c = await db.OpenConnectionAsync(); return Results.Ok(new { ready = true }); }
    catch { return Results.Json(new { ready = false }, statusCode: 503); }
});

// after
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
    .AddDbContextCheck<OrdersDb>(tags: ["ready"]);

app.MapHealthChecks("/healthz", new() { Predicate = r => r.Tags.Contains("live") });
app.MapHealthChecks("/readyz", new() { Predicate = r => r.Tags.Contains("ready") });
```

Keep the existing paths; a renamed probe URL is a behavior change.

## Host lifetime and shutdown (reinvented)

The default `ConsoleLifetime` turns SIGTERM into `IHostApplicationLifetime.StopApplication`;
Kestrel then stops accepting and drains in-flight requests within
`HostOptions.ShutdownTimeout`. Replacing `IHostLifetime` with a no-op and
re-implementing the sequence with `PosixSignalRegistration` duplicates that. The
pre-stop delay belongs to the platform (`lifecycle.preStop.sleep` on the
Deployment). Cleanup hooks into `ApplicationStopping` / `ApplicationStopped`, or
`IHostedLifecycleService` for ordered steps.

```csharp
// before
builder.Services.AddSingleton<IHostLifetime, ManualLifetime>();
PosixSignalRegistration.Create(PosixSignal.SIGTERM, ctx => { ctx.Cancel = true; /* flip, sleep, stop */ });

// after
builder.Services.Configure<HostOptions>(o => o.ShutdownTimeout = TimeSpan.FromSeconds(20));
app.Lifetime.ApplicationStopping.Register(() => readiness.MarkStopping());
```

Long-running work (a Kafka consumer loop) is a `BackgroundService` whose
`ExecuteAsync(CancellationToken stoppingToken)` honours the token, not a
`while (true)` loop in top-level statements that the host never sees.

## EF Core over hand-written ADO.NET CRUD (reinvented)

When a table maps to an entity, a `DbContext` with `DbSet<T>` and migrations
(`dotnet ef migrations add`) replaces `NpgsqlCommand` text, parameter lists, and
`reader.GetString(0)` loops. Npgsql stays the driver underneath through
`Npgsql.EntityFrameworkCore.PostgreSQL`.

```csharp
// before
await using var cmd = conn.CreateCommand();
cmd.CommandText = "SELECT id, sku, quantity, status FROM orders ORDER BY created_at DESC LIMIT 50";
await using var reader = await cmd.ExecuteReaderAsync();
while (await reader.ReadAsync()) orders.Add(new { id = reader.GetString(0), /* ... */ });

// after
builder.Services.AddDbContext<OrdersDb>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

app.MapGet("/orders", (OrdersDb db, CancellationToken ct) =>
    db.Orders.OrderByDescending(o => o.CreatedAt).Take(50).ToListAsync(ct));
```

Where raw SQL is the point (outbox polling, `COPY`, a driver chapter), register
the data source with `builder.Services.AddNpgsqlDataSource(cs)`
(`Npgsql.DependencyInjection`) instead of `new NpgsqlDataSourceBuilder(cs).Build()`
plus a manual `Dispose` in `ApplicationStopped`; the container owns disposal.

## Binding, validation, results (reinvented / structure)

Bind the body to a record parameter; do not parse `HttpContext.Request.Body` with
`JsonDocument`. On .NET 10, `builder.Services.AddValidation()` validates
DataAnnotations on minimal API parameters and returns a 400 ProblemDetails.
Return `TypedResults` so the OpenAPI document knows the shapes, and group routes
with `MapGroup`.

```csharp
// before
using var doc = await JsonDocument.ParseAsync(ctx.Request.Body);
var sku = doc.RootElement.GetProperty("sku").GetString()!;

// after
record OrderIn([Required] string Sku, [Range(1, 1000)] int Quantity);

var orders = app.MapGroup("/orders");
orders.MapPost("/", async Task<Created<OrderOut>> (OrderIn input, OrdersDb db, CancellationToken ct) => {
    /* ... */ return TypedResults.Created($"/orders/{order.Id}", order.ToOut());
});
```

## Errors: ProblemDetails and `IExceptionHandler` (reinvented / structure)

`builder.Services.AddProblemDetails()` with `app.UseExceptionHandler()` and
`app.UseStatusCodePages()` gives one RFC 9457 shape. Map domain exceptions in an
`IExceptionHandler` (`AddExceptionHandler<T>()`), not with `try/catch` returning
`Results.Json(new { error = ... })` in each handler.

## Options pattern (structure)

Bind settings to a class or record and validate at startup. Do not read
`Environment.GetEnvironmentVariable` in handlers; configuration already layers
environment variables (`Drain__DelaySeconds`).

```csharp
builder.Services.AddOptions<DrainOptions>()
    .BindConfiguration("Drain").ValidateDataAnnotations().ValidateOnStart();
// inject IOptions<DrainOptions> (or IOptionsMonitor<T> for reloadable values)
```

## Outbound HTTP: `IHttpClientFactory` + resilience (reinvented)

Register typed or named clients with `AddHttpClient<T>()` and add
`AddStandardResilienceHandler()` (`Microsoft.Extensions.Http.Resilience`, Polly v8:
rate limit, total timeout, retry with jitter, circuit breaker, attempt timeout).
`new HttpClient()` per call exhausts sockets; a `for` loop with `Task.Delay` is a
hand-rolled retry. Disable retries for unsafe methods with
`options.Retry.DisableForUnsafeHttpMethods()` when a POST must not repeat.

## Logging and telemetry (style / reinvented)

- `ILogger<T>` with message templates (`LogInformation("order {OrderId}", id)`),
  and `[LoggerMessage]` source-generated methods on hot paths. `Console.WriteLine`
  in service code is `ban`.
- OpenTelemetry .NET: `AddOpenTelemetry().ConfigureResource(r => r.AddService(name))
  .WithTracing(t => t.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation())
  .WithMetrics(...).UseOtlpExporter()`, configured from the standard `OTEL_*`
  environment variables, not a hand-built exporter per signal.

## Caching (reinvented)

`HybridCache` (`Microsoft.Extensions.Caching.Hybrid`, `AddHybridCache()`) gives
local + distributed caching with stampede protection through `GetOrCreateAsync`;
`IDistributedCache` backs it with Redis or another store. A static `Dictionary`
or a manual get/set/expire wrapper is the reinvention, unless the chapter teaches
the cache-aside steps themselves.

## Async, cancellation, DI lifetimes (structure)

- Async all the way: no `.Result`, `.Wait()`, or `.GetAwaiter().GetResult()` on a
  request path. `async void` only for event handlers.
- Accept a `CancellationToken` in handlers and pass it to EF Core, Npgsql, and
  `HttpClient` calls.
- `DbContext` is scoped; a singleton that captures a scoped service is a captive
  dependency. Background services create a scope with `IServiceScopeFactory`.
- `<Nullable>enable</Nullable>` in the project; records for DTOs and events; the
  C# 14 `field` keyword instead of a hand-written backing field for a validated
  property.

## Deprecated for new code (deprecated)

| Before | After |
|--------|-------|
| `Startup.cs` + `WebHost.CreateDefaultBuilder` | `WebApplication.CreateBuilder` in `Program.cs` |
| `Newtonsoft.Json` where defaults suffice | `System.Text.Json` (source-generated contexts for AOT) |
| `new HttpClient()` per request | `IHttpClientFactory` typed clients |
| custom retry loops / Polly v7 policies | `Microsoft.Extensions.Http.Resilience` (Polly v8) |
| `IHostLifetime` replacement for SIGTERM | default `ConsoleLifetime` + `HostOptions.ShutdownTimeout` |

## Do not flag

- Raw Npgsql or `NpgsqlDataSource` in a chapter about SQL, transactions, or the
  outbox, where the SQL is the lesson.
- `Console.WriteLine` in a CLI adapter (`CliPlaceOrder`) whose stdout a test reads.
- `PosixSignalRegistration` where the demo's subject is the signal sequence and
  the prose says so; flag only the replaced `IHostLifetime` if the host could
  carry it.
- Confluent.Kafka consumer loops inside a `BackgroundService`: that is the
  idiomatic shape for that client.
- Generated code (`*.g.cs`, gRPC stubs) and known-bad negative-test inputs.
