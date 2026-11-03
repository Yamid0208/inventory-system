using Inventory.Application.Features.Reports.DTOs;

namespace Inventory.Application.Features.Reports.Services;

public interface IReportExportService
{
    // Catálogo general y exportaciones existentes
    Task<ReportsCatalogSummaryDto> GetCatalogSummaryAsync(int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<byte[]> ExportProductsCsvAsync(int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<byte[]> ExportInventoryKardexCsvAsync(DateTimeOffset? startDate, DateTimeOffset? endDate, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<byte[]> ExportSalesCsvAsync(DateTimeOffset? startDate, DateTimeOffset? endDate, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<byte[]> ExportPurchasesCsvAsync(DateTimeOffset? startDate, DateTimeOffset? endDate, int? warehouseId = null, CancellationToken cancellationToken = default);

    // Endpoints de datos tabulares paginados
    Task<PagedReportResultDto<ProductReportItemDto>> GetProductsDataAsync(
        int? warehouseId = null,
        string? searchTerm = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<PagedReportResultDto<InventoryKardexReportItemDto>> GetInventoryKardexDataAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        string? searchTerm = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<PagedReportResultDto<SalesReportItemDto>> GetSalesDataAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        string? searchTerm = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<PagedReportResultDto<PurchasesReportItemDto>> GetPurchasesDataAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        string? searchTerm = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<PagedReportResultDto<LowStockReportItemDto>> GetLowStockDataAsync(
        int? warehouseId = null,
        string? searchTerm = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    // --- NUEVAS CAPACIDADES INSINCRO POS ---
    // 1. Ventas: Métricas avanzadas y Top Productos
    Task<SalesSummaryMetricsDto> GetSalesSummaryMetricsAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TopProductReportDto>> GetTopProductsAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        string? searchTerm = null,
        int top = 10,
        bool ascending = false,
        CancellationToken cancellationToken = default);

    // 2. Finanzas: Rentabilidad y Utilidad Bruta con Costo Histórico (CMV)
    Task<ProfitabilitySummaryDto> GetProfitabilityReportAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        string? searchTerm = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportProfitabilityCsvAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default);

    // 3. Caja POS: Conciliación, Cierres y Arqueos (Efectivo vs Digital)
    Task<CashRegisterReconciliationSummaryDto> GetCashRegisterReconciliationAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        string? searchTerm = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<byte[]> ExportCashReconciliationCsvAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default);

    // 4. Actividad & Auditoría
    Task<PagedReportResultDto<AuditActivityReportItemDto>> GetAuditActivityAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        string? entityName = null,
        string? searchTerm = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);
}
