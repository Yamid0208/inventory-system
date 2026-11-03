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

    [Fact]
    public void SalesAnalyticsSummaryDto_ShouldComputePeriodGrowthDeltasCorrectly()
    {
        // Comparativa: Ventas mes actual $25.000.000 vs mes anterior $20.000.000 => +25.0%
        decimal currentRevenue = 25000000m;
        decimal prevRevenue = 20000000m;
        decimal revenueDelta = Math.Round(((currentRevenue - prevRevenue) / prevRevenue) * 100m, 1);

        int currentTx = 120;
        int prevTx = 100;
        decimal txDelta = Math.Round(((decimal)(currentTx - prevTx) / prevTx) * 100m, 1);

        decimal currentTicket = currentRevenue / currentTx; // 208,333.33
        decimal prevTicket = prevRevenue / prevTx;           // 200,000.00
        decimal ticketDelta = Math.Round(((currentTicket - prevTicket) / prevTicket) * 100m, 1);

        var dto = new SalesAnalyticsSummaryDto(
            TotalRevenue: currentRevenue,
            NetRevenue: 21008403.36m,
            Tax: 3991596.64m,
            TransactionCount: currentTx,
            AverageTicket: Math.Round(currentTicket, 2),
            UnitsSold: 350,
            PrevTotalRevenue: prevRevenue,
            PrevTransactionCount: prevTx,
            PrevAverageTicket: prevTicket,
            RevenueGrowthPct: revenueDelta,
            TransactionsGrowthPct: txDelta,
            TicketGrowthPct: ticketDelta,
            PaymentMethods: new List<PaymentMethodBreakdownDto>()
        );

        Assert.Equal(25000000m, dto.TotalRevenue);
        Assert.Equal(25.0m, dto.RevenueGrowthPct);
        Assert.Equal(20.0m, dto.TransactionsGrowthPct);
        Assert.Equal(4.2m, dto.TicketGrowthPct);
    }

    [Fact]
    public void SalesByCategoryDto_ShouldVerifySharePercentageAndUnits()
    {
        var category = new SalesByCategoryDto(
            CategoryId: 10,
            CategoryName: "Audio Profesional",
            UnitsSold: 25,
            TotalRevenue: 15000000m,
            SharePercentage: 60.0m,
            TransactionCount: 18
        );

        Assert.Equal(10, category.CategoryId);
        Assert.Equal("Audio Profesional", category.CategoryName);
        Assert.Equal(25, category.UnitsSold);
        Assert.Equal(15000000m, category.TotalRevenue);
        Assert.Equal(60.0m, category.SharePercentage);
        Assert.Equal(18, category.TransactionCount);
    }

    [Fact]
    public void HourlyActivityDto_ShouldFlagPeakHourCorrectly()
    {
        var peak = new HourlyActivityDto(
            Hour: 15,
            HourLabel: "15:00 - 15:59",
            TransactionCount: 42,
            TotalRevenue: 8500000m,
            IsPeakHour: true
        );

        var regular = new HourlyActivityDto(
            Hour: 9,
            HourLabel: "09:00 - 09:59",
            TransactionCount: 5,
            TotalRevenue: 600000m,
            IsPeakHour: false
        );

        Assert.True(peak.IsPeakHour);
        Assert.False(regular.IsPeakHour);
        Assert.Equal("15:00 - 15:59", peak.HourLabel);
    }

    [Fact]
    public void SalesByEmployeeDto_ShouldComputeAverageTicketAndContribution()
    {
        var employee = new SalesByEmployeeDto(
            UserId: 4,
            EmployeeName: "Carlos Vendedor",
            Role: "Seller",
            TransactionCount: 50,
            TotalRevenue: 10000000m,
            AverageTicket: 200000m,
            SharePercentage: 40.0m
        );

        Assert.Equal(4, employee.UserId);
        Assert.Equal("Carlos Vendedor", employee.EmployeeName);
        Assert.Equal(200000m, employee.AverageTicket);
        Assert.Equal(40.0m, employee.SharePercentage);
    }
}
