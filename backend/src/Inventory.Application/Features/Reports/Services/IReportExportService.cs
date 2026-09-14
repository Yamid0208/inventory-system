using Inventory.Application.Features.Reports.DTOs;

namespace Inventory.Application.Features.Reports.Services;

public interface IReportExportService
{
    Task<byte[]> ExportProductsCsvAsync(int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<byte[]> ExportInventoryKardexCsvAsync(DateTimeOffset? startDate, DateTimeOffset? endDate, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<byte[]> ExportSalesCsvAsync(DateTimeOffset? startDate, DateTimeOffset? endDate, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<byte[]> ExportPurchasesCsvAsync(DateTimeOffset? startDate, DateTimeOffset? endDate, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<ReportsCatalogSummaryDto> GetCatalogSummaryAsync(int? warehouseId = null, CancellationToken cancellationToken = default);
}
