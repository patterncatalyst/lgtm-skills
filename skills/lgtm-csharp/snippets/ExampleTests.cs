// Sample xUnit v3 + NSubstitute tests, nullable reference types enabled.
// Shows Fact, Theory, and the three NSubstitute moves: Substitute.For, Returns,
// Received. No Setup, no .Object, no telemetry.
using NSubstitute;
using Xunit;

namespace MyService.Core.Tests;

// ── Types under test, shown here so the sample is self-contained ──
public record OrderRequest(string Sku, int Quantity);
public record Order(int Id, string Sku, int Quantity);

public interface IOrderRepository
{
    Task<Order> SaveAsync(Order order, CancellationToken ct);
}

public interface INotifier
{
    Task OrderPlacedAsync(int orderId, CancellationToken ct);
}

public sealed class OrderService(IOrderRepository repository, INotifier notifier)
{
    public async Task<Order> PlaceAsync(OrderRequest request, CancellationToken ct)
    {
        var saved = await repository.SaveAsync(
            new Order(0, request.Sku, request.Quantity), ct);
        await notifier.OrderPlacedAsync(saved.Id, ct);
        return saved;
    }
}

// ── Tests ────────────────────────────────────────────────────────
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

        Order placed = await service.PlaceAsync(new OrderRequest("widget", 3), CancellationToken.None);

        Assert.Equal(42, placed.Id);
        await repository.Received(1).SaveAsync(
            Arg.Is<Order>(o => o.Sku == "widget" && o.Quantity == 3),
            Arg.Any<CancellationToken>());
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

    [Theory]
    [InlineData("widget", 1)]
    [InlineData("gadget", 10)]
    public async Task Preserves_request_fields(string sku, int quantity)
    {
        var repository = Substitute.For<IOrderRepository>();
        repository.SaveAsync(Arg.Any<Order>(), Arg.Any<CancellationToken>())
            .Returns(call => call.Arg<Order>() with { Id = 1 });

        var service = new OrderService(repository, Substitute.For<INotifier>());

        Order placed = await service.PlaceAsync(new OrderRequest(sku, quantity), CancellationToken.None);

        Assert.Equal(sku, placed.Sku);
        Assert.Equal(quantity, placed.Quantity);
    }
}
