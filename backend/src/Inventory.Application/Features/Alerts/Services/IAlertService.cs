using Inventory.Application.Features.Alerts.DTOs;

namespace Inventory.Application.Features.Alerts.Services;

public interface IAlertService
{
    Task<IReadOnlyList<StockAlertDto>> GetStockAlertsAsync(
        StockAlertFilterRequest request,
        CancellationToken cancellationToken = default);

    Task<StockAlertSummaryDto> GetAlertsSummaryAsync(
        int? warehouseId = null,
        CancellationToken cancellationToken = default);
}
