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

    [Fact]
    public void ProfitabilitySummaryDto_ShouldVerifyGrossMarginCalculations()
    {
        // Ejemplo INSINCRO: Ventas $10.000.000, CMV $6.000.000 => Utilidad $4.000.000, Margen 40%
        decimal revenue = 10000000m;
        decimal cogs = 6000000m;
        decimal grossProfit = revenue - cogs;
        decimal grossMargin = (grossProfit / revenue) * 100m;

        var pagedDetails = new PagedReportResultDto<ProductProfitabilityItemDto>(
            new List<ProductProfitabilityItemDto>(),
            0, 1, 10, 0
        );

        var dto = new ProfitabilitySummaryDto(
            revenue,
            cogs,
            grossProfit,
            grossMargin,
            25,
            pagedDetails
        );

        Assert.Equal(10000000m, dto.TotalRevenue);
        Assert.Equal(6000000m, dto.TotalCostOfGoodsSold);
        Assert.Equal(4000000m, dto.GrossProfit);
        Assert.Equal(40m, dto.GrossMarginPercentage);
    }

    [Fact]
    public void CashRegisterReconciliation_ShouldDifferentiateCashFromElectronicInflow()
    {
        // Regla INSINCRO: Pagos electrónicos no incrementan efectivo físico en gaveta
        decimal initialCash = 100000m;
        decimal cashSales = 850000m;
        decimal otherCashIn = 50000m;
        decimal cashOut = 100000m;
        decimal expectedCash = initialCash + cashSales + otherCashIn - cashOut; // 900.000
        decimal electronicInflow = 450000m; // Tarjeta y transferencia
        decimal actualCash = 890000m;
        decimal difference = actualCash - expectedCash; // -10.000

        var dto = new CashRegisterSessionReportItemDto(
            SessionId: 1,
            SessionNumber: "CJ-2026-001",
            CashierName: "Cajero Principal",
            OpenedAt: DateTimeOffset.UtcNow,
            ClosedAt: DateTimeOffset.UtcNow.AddHours(8),
            Status: "Closed",
            InitialCash: initialCash,
            TotalSales: cashSales + electronicInflow,
            TotalCashInflow: cashSales + otherCashIn,
            TotalCashOutflow: cashOut,
            TotalElectronicInflow: electronicInflow,
            ExpectedCash: expectedCash,
            ActualCash: actualCash,
            Difference: difference,
            DifferenceStatus: "Shortage"
        );

        Assert.Equal(900000m, dto.ExpectedCash);
        Assert.Equal(450000m, dto.TotalElectronicInflow);
        Assert.Equal(-10000m, dto.Difference);
        Assert.Equal("Shortage", dto.DifferenceStatus);
    }
}
