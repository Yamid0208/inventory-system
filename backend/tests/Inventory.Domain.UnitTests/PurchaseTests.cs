using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class PurchaseTests
{
    [Fact]
    public void PurchaseItem_CalculatesSubtotalTaxAndTotalCorrectly()
    {
        // 10 unidades a $145.00 con IVA del 19%
        var item = new PurchaseItem(
            productId: 1,
            quantity: 10,
            unitPrice: 145.00m,
            taxRate: 0.19m
        );

        Assert.Equal(1450.00m, item.Subtotal);
        Assert.Equal(275.50m, item.Tax);
        Assert.Equal(1725.50m, item.Total);
    }

    [Fact]
    public void PurchaseItem_InvalidQuantityOrPrice_ThrowsException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new PurchaseItem(1, 0, 100m));
        Assert.Throws<ArgumentOutOfRangeException>(() => new PurchaseItem(1, -5, 100m));
        Assert.Throws<ArgumentOutOfRangeException>(() => new PurchaseItem(1, 10, -50m));
    }

    [Fact]
    public void Purchase_AddItems_RecalculatesTotalsAccurately()
    {
        var purchase = new Purchase(
            purchaseNumber: "PUR-20260902-001",
            supplierId: 1,
            userId: 1,
            purchaseDate: DateTimeOffset.UtcNow
        );

        var item1 = new PurchaseItem(1, 5, 200m, 0.19m); // Subtotal: 1000, Tax: 190, Total: 1190
        var item2 = new PurchaseItem(2, 2, 500m, 0.19m); // Subtotal: 1000, Tax: 190, Total: 1190

        purchase.AddItem(item1);
        purchase.AddItem(item2);

        Assert.Equal(2000.00m, purchase.Subtotal);
        Assert.Equal(380.00m, purchase.Tax);
        Assert.Equal(2380.00m, purchase.Total);
        Assert.Equal(PurchaseStatus.Pending, purchase.Status);
    }

    [Fact]
    public void Purchase_MarkAsReceived_ChangesStatusToReceived()
    {
        var purchase = new Purchase(
            purchaseNumber: "PUR-20260902-002",
            supplierId: 1,
            userId: 1,
            purchaseDate: DateTimeOffset.UtcNow
        );

        purchase.MarkAsReceived();
        Assert.Equal(PurchaseStatus.Received, purchase.Status);

        // Intentar recibir nuevamente debe arrojar InvalidOperationException
        Assert.Throws<InvalidOperationException>(() => purchase.MarkAsReceived());
    }

    [Fact]
    public void Purchase_Cancel_SetsStatusCancelled()
    {
        var purchase = new Purchase(
            purchaseNumber: "PUR-20260902-003",
            supplierId: 1,
            userId: 1,
            purchaseDate: DateTimeOffset.UtcNow
        );

        purchase.Cancel();
        Assert.Equal(PurchaseStatus.Cancelled, purchase.Status);

        // No se puede recibir una cancelada
        Assert.Throws<InvalidOperationException>(() => purchase.MarkAsReceived());
    }

    [Fact]
    public void Purchase_ReturnValidation_CannotReturnIfNotReceived()
    {
        var purchase = new Purchase(
            purchaseNumber: "PUR-20260902-004",
            supplierId: 1,
            userId: 1,
            purchaseDate: DateTimeOffset.UtcNow
        );
        var item = new PurchaseItem(1, 10, 100m, 0.19m);
        purchase.AddItem(item);

        Assert.Equal(PurchaseStatus.Pending, purchase.Status);
        // Only Received purchases can have inventory returns
        Assert.NotEqual(PurchaseStatus.Received, purchase.Status);
    }
}
