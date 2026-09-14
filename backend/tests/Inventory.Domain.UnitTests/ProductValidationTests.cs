using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Interfaces;
using Inventory.Application.Features.Products.DTOs;
using Inventory.Application.Features.Products.Validators;
using Inventory.Domain.Entities;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class ProductValidationTests
{
    [Fact]
    public void CalculateStockStatus_WhenStockIsZero_ReturnsOutOfStock()
    {
        var status = ProductDto.CalculateStockStatus(0, 10);
        Assert.Equal("OutOfStock", status);
    }

    [Fact]
    public void CalculateStockStatus_WhenStockIsBelowOrEqualToMinimum_ReturnsLowStock()
    {
        var status1 = ProductDto.CalculateStockStatus(5, 10);
        var status2 = ProductDto.CalculateStockStatus(10, 10);

        Assert.Equal("LowStock", status1);
        Assert.Equal("LowStock", status2);
    }

    [Fact]
    public void CalculateStockStatus_WhenStockIsAboveMinimum_ReturnsInStock()
    {
        var status = ProductDto.CalculateStockStatus(15, 10);
        Assert.Equal("InStock", status);
    }

    [Fact]
    public void Product_Constructor_SetsNormalizedSkuAndRoundedPrices()
    {
        var product = new Product("  sku-abc-123  ", "Teclado Mecánico", 1, 1, 45.555m, 89.995m, 5);

        Assert.Equal("SKU-ABC-123", product.Sku);
        Assert.Equal(45.56m, product.PurchasePrice);
        Assert.Equal(90.00m, product.SalePrice);
        Assert.Equal(0, product.CurrentStock);
        Assert.True(product.IsActive);
    }

    [Fact]
    public void Product_Update_UpdatesFieldsAndSetsUpdatedAt()
    {
        var product = new Product("SKU-1", "Original", 1, 1, 10m, 20m, 5);
        product.Update("Actualizado", 2, 2, 15m, 30m, 10, "Nueva desc", "https://img.local/1.jpg");

        Assert.Equal("Actualizado", product.Name);
        Assert.Equal(2, product.CategoryId);
        Assert.Equal(2, product.SupplierId);
        Assert.Equal(15.00m, product.PurchasePrice);
        Assert.Equal(30.00m, product.SalePrice);
        Assert.Equal(10, product.MinimumStock);
        Assert.NotNull(product.UpdatedAt);
    }

    [Fact]
    public void Product_UpdateStock_AllowsIncrementAndValidDecrement()
    {
        var product = new Product("SKU-1", "Mouse", 1, 1, 10m, 20m, 5);
        product.UpdateStock(50);
        Assert.Equal(50, product.CurrentStock);

        product.UpdateStock(-20);
        Assert.Equal(30, product.CurrentStock);
    }

    [Fact]
    public void Product_UpdateStock_ResultingInNegativeStock_ThrowsInvalidOperationException_RN001()
    {
        var product = new Product("SKU-1", "Mouse", 1, 1, 10m, 20m, 5);
        product.UpdateStock(10);

        Assert.Throws<InvalidOperationException>(() => product.UpdateStock(-15));
    }

    [Fact]
    public void BusinessRuleViolationException_ForRN007_CarriesRuleCode()
    {
        var ex = new BusinessRuleViolationException("RN-007", "No es posible eliminar el producto porque tiene 10 unidades en stock.");
        Assert.Equal("RN-007", ex.RuleCode);
        Assert.Contains("10 unidades", ex.Message);
    }
}
