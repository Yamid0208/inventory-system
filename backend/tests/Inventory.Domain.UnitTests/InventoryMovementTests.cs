using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class InventoryMovementTests
{
    [Fact]
    public void Constructor_ValidArguments_CreatesMovementSuccessfully()
    {
        var movement = new InventoryMovement(
            movementNumber: "MOV-2026-001",
            productId: 10,
            type: MovementType.AdjustmentIn,
            quantityDelta: 25,
            previousStock: 50,
            newStock: 75,
            unitPrice: 145.50m,
            userId: 1,
            reference: "Conteo Físico",
            notes: "Ajuste de inventario periódico"
        );

        Assert.Equal("MOV-2026-001", movement.MovementNumber);
        Assert.Equal(10, movement.ProductId);
        Assert.Equal(MovementType.AdjustmentIn, movement.Type);
        Assert.Equal(25, movement.QuantityDelta);
        Assert.Equal(50, movement.PreviousStock);
        Assert.Equal(75, movement.NewStock);
        Assert.Equal(145.50m, movement.UnitPrice);
        Assert.Equal(1, movement.UserId);
        Assert.Equal("Conteo Físico", movement.Reference);
    }

    [Fact]
    public void Constructor_ZeroQuantityDelta_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new InventoryMovement(
            movementNumber: "MOV-001",
            productId: 1,
            type: MovementType.AdjustmentIn,
            quantityDelta: 0,
            previousStock: 10,
            newStock: 10,
            unitPrice: 20m,
            userId: 1
        ));
    }

    [Fact]
    public void Constructor_NegativeStocks_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new InventoryMovement(
            movementNumber: "MOV-002",
            productId: 1,
            type: MovementType.AdjustmentOut,
            quantityDelta: -5,
            previousStock: -1,
            newStock: 0,
            unitPrice: 20m,
            userId: 1
        ));

        Assert.Throws<ArgumentOutOfRangeException>(() => new InventoryMovement(
            movementNumber: "MOV-003",
            productId: 1,
            type: MovementType.AdjustmentOut,
            quantityDelta: -5,
            previousStock: 10,
            newStock: -1,
            unitPrice: 20m,
            userId: 1
        ));
    }

    [Fact]
    public void ProductUpdateStock_SufficientStock_UpdatesCurrentStockCorrectly()
    {
        var product = new Product("SKU-TEST-01", "Producto Test", 1, 1, 100m, 150m, 5);
        Assert.Equal(0, product.CurrentStock);

        // Entrada +20
        product.UpdateStock(20);
        Assert.Equal(20, product.CurrentStock);

        // Salida -8
        product.UpdateStock(-8);
        Assert.Equal(12, product.CurrentStock);
    }

    [Fact]
    public void ProductUpdateStock_NegativeResultingStock_ThrowsInvalidOperationException_RN001()
    {
        var product = new Product("SKU-TEST-02", "Producto Test 2", 1, 1, 50m, 80m, 5);
        product.UpdateStock(10);

        // Intentar retirar 15 unidades cuando solo hay 10 (RN-001)
        var exception = Assert.Throws<InvalidOperationException>(() => product.UpdateStock(-15));
        Assert.Contains("Stock insuficiente", exception.Message);
    }
}
