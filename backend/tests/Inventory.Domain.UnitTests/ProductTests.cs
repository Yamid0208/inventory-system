using Inventory.Domain.Entities;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class ProductTests
{
    [Fact]
    public void Constructor_WithValidData_InitializesProductWithZeroStock()
    {
        var product = new Product(
            sku: "PROD-001",
            name: "Laptop Gamer",
            categoryId: 1,
            supplierId: 1,
            purchasePrice: 750.50m,
            salePrice: 1200.00m,
            minimumStock: 5,
            description: "Laptop de alta gama");

        Assert.Equal("PROD-001", product.Sku);
        Assert.Equal("Laptop Gamer", product.Name);
        Assert.Equal(0, product.CurrentStock);
        Assert.Equal(5, product.MinimumStock);
        Assert.Equal(750.50m, product.PurchasePrice);
        Assert.Equal(1200.00m, product.SalePrice);
        Assert.True(product.IsActive);
        Assert.False(product.IsDeleted);
    }

    [Fact]
    public void Constructor_WithNegativePrices_ThrowsArgumentOutOfRangeException()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new Product("SKU-001", "Producto", 1, 1, purchasePrice: -10m, salePrice: 20m));

        Assert.Throws<ArgumentOutOfRangeException>(() =>
            new Product("SKU-001", "Producto", 1, 1, purchasePrice: 10m, salePrice: -5m));
    }

    [Fact]
    public void UpdateStock_WithPositiveQuantity_IncrementsStock()
    {
        var product = new Product("SKU-001", "Mouse Óptico", 1, 1, 10m, 20m);
        
        product.UpdateStock(15);

        Assert.Equal(15, product.CurrentStock);
        Assert.NotNull(product.UpdatedAt);
    }

    [Fact]
    public void UpdateStock_ResultingInNegativeQuantity_ThrowsInvalidOperationException()
    {
        var product = new Product("SKU-001", "Teclado Mecánico", 1, 1, 30m, 60m);
        product.UpdateStock(10); // Stock = 10

        // Intenta restar 15 unidades cuando solo hay 10 (RN-001)
        var exception = Assert.Throws<InvalidOperationException>(() => product.UpdateStock(-15));
        Assert.Contains("Stock insuficiente", exception.Message);
        Assert.Equal(10, product.CurrentStock); // El stock se mantiene inalterado
    }

    [Fact]
    public void IsLowStock_ReturnsTrueWhenStockIsBelowOrEqualToMinimum()
    {
        var product = new Product("SKU-001", "Monitor 24", 1, 1, 100m, 180m, minimumStock: 5);
        product.UpdateStock(5); // Stock igual al mínimo

        Assert.True(product.IsLowStock());

        product.UpdateStock(1); // Stock = 6 (superior al mínimo)
        Assert.False(product.IsLowStock());
    }
}
