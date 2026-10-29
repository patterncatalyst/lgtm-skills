# Testing Infrastructure

Test strategy for .NET projects: **xUnit v3** for the test framework,
**NSubstitute** for mocking, and `dotnet test` as the single runner. No
containers, so there is no Testcontainers layer here; integration against real
infrastructure, when a project needs it, runs against locally installed services.

## Why xUnit v3 and NSubstitute

- **xUnit v3** is the current GA line. It is the house test framework for new .NET
  code.
- **NSubstitute** over Moq. Moq's 4.20.0 release bundled SponsorLink, which
  extracted a hashed developer email at build time. NSubstitute has no telemetry
  and the cleanest syntax: no `Setup(...)`, no `.Object`, just
  `Substitute.For<T>()` and method calls. **FakeItEasy** is the named alternative
  if a team prefers it; it is also telemetry-free. Do not advise migrating an
  existing Moq suite; this guidance is for new code.

## Test project layout

One test project per project under test, named `<Project>.Tests`:

```
src/
  MyService.Core/
    MyService.Core.csproj
tests/
  MyService.Core.Tests/
    MyService.Core.Tests.csproj     ← references MyService.Core
    OrderServiceTests.cs
```

Create and wire it from the CLI:

```bash
dotnet new xunit -n MyService.Core.Tests -o tests/MyService.Core.Tests
dotnet add tests/MyService.Core.Tests/MyService.Core.Tests.csproj \
    reference src/MyService.Core/MyService.Core.csproj
dotnet add tests/MyService.Core.Tests/MyService.Core.Tests.csproj package NSubstitute
```

Survey and pin the test package versions at creation (`dotnet package search`), or
manage them centrally in `Directory.Packages.props`. See
`snippets/Example.Tests.csproj` for the package references and
`snippets/ExampleTests.cs` for the test patterns.

> The `dotnet new xunit` template still emits the xUnit **v2** package set (verified
> with SDK 10.0.113 on 2026-10-29: it pins `xunit` 2.9.3). Convert to v3: reference
> `xunit.v3` (4.0.2), `xunit.runner.visualstudio` (4.0.1), and
> `Microsoft.NET.Test.Sdk` (18.11.0), then re-survey for newer stables at creation.

## Running tests

```bash
dotnet test                              # restore, build, run every test project
dotnet test tests/MyService.Core.Tests   # a single project
dotnet test --filter "FullyQualifiedName~OrderService"   # by name
dotnet test --logger "console;verbosity=detailed"        # verbose output
```

For coverage, add `coverlet.collector` to the test project and collect:

```bash
dotnet test --collect:"XPlat Code Coverage"
```

## Running on .NET 10

Two .NET 10 specifics, both verified on 2026-10-29:

- **`dotnet test` needs the MTP opt-in.** The .NET 10 SDK removed the legacy VSTest
  path, so a v3 project fails with *"Testing with VSTest target is no longer
  supported"* until the project sets
  `<TestingPlatformDotnetTestSupport>true</TestingPlatformDotnetTestSupport>` (see
  `snippets/Example.Tests.csproj`). xUnit v3 projects are self-executing, so
  `dotnet run` also runs the suite directly through the Microsoft.Testing.Platform runner.
- **xUnit v3 ships analyzers, and `xUnit1051` fights warnings-as-errors.** Any call
  that accepts a `CancellationToken` triggers `xUnit1051`, which the house
  `TreatWarningsAsErrors` turns into a build failure. Pass
  `TestContext.Current.CancellationToken` to those calls rather than suppressing the rule.

## Pattern: plain unit test

```csharp
public class MoneyTests
{
    [Fact]
    public void Add_sums_amounts()
    {
        var result = Money.Add(new Money(2), new Money(3));
        Assert.Equal(new Money(5), result);
    }

    [Theory]
    [InlineData(1, 1, 2)]
    [InlineData(0, 5, 5)]
    public void Add_is_commutative(int a, int b, int expected)
    {
        Assert.Equal(expected, Money.Add(new Money(a), new Money(b)).Amount);
        Assert.Equal(expected, Money.Add(new Money(b), new Money(a)).Amount);
    }
}
```

## Pattern: NSubstitute mocking

NSubstitute needs no `Setup`/`Verify` scaffolding. Create the substitute, stub
return values with `Returns`, and assert calls with `Received`.

```csharp
public class OrderServiceTests
{
    [Fact]
    public async Task Places_order_and_notifies()
    {
        var repository = Substitute.For<IOrderRepository>();
        var notifier = Substitute.For<INotifier>();
        repository.SaveAsync(Arg.Any<Order>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Order>() with { Id = 42 });

        var service = new OrderService(repository, notifier);

        var placed = await service.PlaceAsync(new OrderRequest("widget", 3), CancellationToken.None);

        Assert.Equal(42, placed.Id);
        await repository.Received(1).SaveAsync(
            Arg.Is<Order>(o => o.Sku == "widget"), Arg.Any<CancellationToken>());
        await notifier.Received(1).OrderPlacedAsync(42, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Surfaces_repository_failure()
    {
        var repository = Substitute.For<IOrderRepository>();
        repository.SaveAsync(Arg.Any<Order>(), Arg.Any<CancellationToken>())
            .Returns<Order>(_ => throw new InvalidOperationException("db down"));

        var service = new OrderService(repository, Substitute.For<INotifier>());

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.PlaceAsync(new OrderRequest("widget", 3), CancellationToken.None));
    }
}
```

Notes, nullable-aware:

- `Substitute.For<T>()` returns a non-null `T`, so it assigns cleanly to a
  non-nullable field or `var`.
- Use `Arg.Any<T>()` and `Arg.Is<T>(predicate)` for argument matching.
- Assert interactions with `Received(n)` / `DidNotReceive()`; stub values with
  `Returns`.

## Pattern: ASP.NET Core minimal API test

For an HTTP-level test of a web project, host it in-memory with
`WebApplicationFactory<T>` (from `Microsoft.AspNetCore.Mvc.Testing`) and exercise
it over `HttpClient`. This stays in-process, so it needs no container.

```csharp
public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    public HealthEndpointTests(WebApplicationFactory<Program> factory) => _factory = factory;

    [Fact]
    public async Task Healthz_reports_ok()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/healthz");
        Assert.True(response.IsSuccessStatusCode);
    }
}
```

## Reading test failures with Claude Code

`dotnet test` prints failures to the console, and the app under test writes to its
rotating log file (see `references/logging.md`). After a failing run, Claude Code
reads both: the test output for the assertion that failed, and
`logs/<app>.log` for the surrounding application log lines.
