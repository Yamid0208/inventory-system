using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class SaleTests
{
    [Fact]
    public void SaleItem_CalculatesSubtotalTaxAndTotalCorrectly()
    {
        // 3 unidades a $280.00 con IVA del 19%
        var item = new SaleItem(
            productId: 1,
            quantity: 3,
            unitPrice: 280.00m,
            taxRate: 0.19m
        );

        Assert.Equal(840.00m, item.Subtotal);
        Assert.Equal(159.60m, item.Tax);
        Assert.Equal(999.60m, item.Total);
    }

    [Fact]
    public void SaleItem_InvalidQuantityOrPrice_ThrowsException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new SaleItem(1, 0, 100m));
        Assert.Throws<ArgumentOutOfRangeException>(() => new SaleItem(1, -2, 100m));
        Assert.Throws<ArgumentOutOfRangeException>(() => new SaleItem(1, 1, -10m));
    }

    [Fact]
    public void Sale_AddItems_RecalculatesTotalsAccurately()
    {
        var sale = new Sale(
            saleNumber: "VEN-20260902-001",
            customerName: "Corporación ABC S.A.",
            userId: 1,
            saleDate: DateTimeOffset.UtcNow,
            paymentMethod: PaymentMethod.CreditCard
        );

        var item1 = new SaleItem(1, 2, 500m, 0.19m); // Subtotal: 1000, Tax: 190, Total: 1190
        var item2 = new SaleItem(2, 1, 250m, 0.19m); // Subtotal: 250, Tax: 47.50, Total: 297.50

        sale.AddItem(item1);
        sale.AddItem(item2);

        Assert.Equal(1250.00m, sale.Subtotal);
        Assert.Equal(237.50m, sale.Tax);
        Assert.Equal(1487.50m, sale.Total);
    }

    [Fact]
    public void Sale_Cancel_SetsStatusCancelled()
    {
        var sale = new Sale(
            saleNumber: "VEN-20260902-002",
            customerName: "Juan Pérez",
            userId: 1,
            saleDate: DateTimeOffset.UtcNow,
            paymentMethod: PaymentMethod.Cash
        );

        sale.Cancel();
        Assert.Equal(SaleStatus.Cancelled, sale.Status);

        // No se puede cancelar nuevamente
        Assert.Throws<InvalidOperationException>(() => sale.Cancel());
    }

    [Fact]
    public void Sale_AddMultiplePayments_RegistersCorrectly()
    {
        var sale = new Sale(
            saleNumber: "VEN-20260916-003",
            customerName: "Melissa Rodríguez",
            userId: 1,
            saleDate: DateTimeOffset.UtcNow,
            paymentMethod: PaymentMethod.Mixed
        );

        var payment1 = new SalePayment(PaymentMethod.Cash, 50000m);
        var payment2 = new SalePayment(PaymentMethod.Nequi, 100000m, "REF-NQ-12345");

        sale.AddPayment(payment1);
        sale.AddPayment(payment2);

        Assert.Equal(2, sale.Payments.Count);
        Assert.Equal(150000m, sale.Payments.Sum(p => p.Amount));
        Assert.Equal(PaymentMethod.Mixed, sale.PaymentMethod);
        Assert.Contains(sale.Payments, p => p.Method == PaymentMethod.Nequi && p.Reference == "REF-NQ-12345");
    }

    [Fact]
    public void SalePayment_InvalidAmount_ThrowsException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new SalePayment(PaymentMethod.Cash, 0m));
        Assert.Throws<ArgumentOutOfRangeException>(() => new SalePayment(PaymentMethod.Nequi, -100m));
    }
}
