using Inventory.Application.Features.Dashboard.DTOs;

namespace Inventory.Application.Features.Dashboard.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(int? userId = null, int? warehouseId = null, CancellationToken cancellationToken = default);
}
