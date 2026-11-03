using Inventory.Application.Features.Reports.DTOs;

namespace Inventory.Application.Features.Reports.Services;

public interface IReportExportService
{
    Task<byte[]> ExportProductsCsvAsync(int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<byte[]> ExportInventoryKardexCsvAsync(DateTimeOffset? startDate, DateTimeOffset? endDate, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<byte[]> ExportSalesCsvAsync(DateTimeOffset? startDate, DateTimeOffset? endDate, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<byte[]> ExportPurchasesCsvAsync(DateTimeOffset? startDate, DateTimeOffset? endDate, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<ReportsCatalogSummaryDto> GetCatalogSummaryAsync(int? warehouseId = null, CancellationToken cancellationToken = default);

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
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<PagedReportResultDto<SalesReportItemDto>> GetSalesDataAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<PagedReportResultDto<PurchasesReportItemDto>> GetPurchasesDataAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<PagedReportResultDto<LowStockReportItemDto>> GetLowStockDataAsync(
        int? warehouseId = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);
}
