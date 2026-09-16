using System.Security.Claims;
using Inventory.Application.Features.Dashboard.DTOs;
using Inventory.Application.Features.Dashboard.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class DashboardController : BaseApiController
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>
    /// Retorna el resumen consolidado de KPIs ejecutivos, valuación, alertas y distribución por categorías.
    /// Aplica aislamiento estricto de datos por almacén y empresa (Tríada CIA).
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(DashboardSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(
        [FromQuery] bool? onlyMine,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        var role = GetCurrentUserRole();
        var currentUserId = GetCurrentUserId();
        var email = User.FindFirst(ClaimTypes.Email)?.Value;

        int? filterUserId = (onlyMine == true || email == "demo.limpio@sgi.local") ? currentUserId : null;

        IReadOnlyList<int>? allowedWarehouseIds = null;
        if (!IsSuperAdmin())
        {
            allowedWarehouseIds = await GetAuthorizedWarehouseIdsAsync(cancellationToken);
        }

        int? filterWarehouseId = warehouseId;
        if (role == "Warehouse" || role == "Seller")
        {
            var wid = GetCurrentWarehouseId();
            if (wid.HasValue && wid.Value > 0)
            {
                filterWarehouseId = wid.Value;
            }
        }

        if (filterWarehouseId.HasValue && allowedWarehouseIds != null && allowedWarehouseIds.Count > 0 && !allowedWarehouseIds.Contains(filterWarehouseId.Value))
        {
            return Forbid();
        }

        var summary = await _dashboardService.GetSummaryAsync(filterUserId, filterWarehouseId, allowedWarehouseIds, cancellationToken);
        return Ok(summary);
    }
}
