using System.Security.Claims;
using Inventory.Application.Features.Dashboard.DTOs;
using Inventory.Application.Features.Dashboard.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    /// <summary>
    /// Retorna el resumen consolidado de KPIs ejecutivos, valuación, alertas y distribución por categorías.
    /// Para Admin y empleados filtra automáticamente por su almacén asignado.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(DashboardSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(
        [FromQuery] bool? onlyMine,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(idClaim, out var currentUserId);
        var email = User.FindFirst(ClaimTypes.Email)?.Value;

        int? filterUserId = (onlyMine == true || email == "demo.limpio@sgi.local") ? currentUserId : null;

        int? filterWarehouseId = warehouseId;
        if (role != "SuperAdmin")
        {
            var whClaim = User.FindFirst("warehouseId")?.Value;
            if (int.TryParse(whClaim, out var wid) && wid > 0)
            {
                filterWarehouseId = wid;
            }
        }

        var summary = await _dashboardService.GetSummaryAsync(filterUserId, filterWarehouseId, cancellationToken);
        return Ok(summary);
    }
}
