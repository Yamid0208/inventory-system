using Inventory.Application.Features.Reports.DTOs;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class ReportDtoTests
{
    [Fact]
    public void PagedReportResultDto_ShouldHoldCorrectPaginationData()
    {
        var items = new List<string> { "item1", "item2" };
        var result = new PagedReportResultDto<string>(
            Items: items,
            TotalCount: 20,
            PageNumber: 2,
            PageSize: 10,
            TotalPages: 2,
            TotalAmount: 150000m,
            TotalQuantity: 20
        );

        Assert.Equal(2, result.Items.Count);
        Assert.Equal(20, result.TotalCount);
        Assert.Equal(2, result.PageNumber);
        Assert.Equal(10, result.PageSize);
        Assert.Equal(2, result.TotalPages);
        Assert.Equal(150000m, result.TotalAmount);
        Assert.Equal(20, result.TotalQuantity);
    }

    [Fact]
    public void LowStockReportItemDto_ShouldStoreFieldsCorrectly()
    {
        var item = new LowStockReportItemDto(
            Id: 1,
            Sku: "SKU-001",
            Name: "Taladro Inalámbrico",
            CategoryName: "Herramientas",
            SupplierName: "Ferretería Central",
            CurrentStock: 2,
            MinimumStock: 10,
            Deficit: 8,
            PurchasePrice: 50000m,
            EstimatedRestockCost: 400000m,
            Status: "Bajo Stock"
        );

        Assert.Equal("SKU-001", item.Sku);
        Assert.Equal(8, item.Deficit);
        Assert.Equal(400000m, item.EstimatedRestockCost);
        Assert.Equal("Bajo Stock", item.Status);
    }
}
