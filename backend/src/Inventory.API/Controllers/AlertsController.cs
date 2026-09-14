using System.Security.Claims;
using Inventory.Application.Features.Alerts.DTOs;
using Inventory.Application.Features.Alerts.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class AlertsController : ControllerBase
{
    private readonly IAlertService _alertService;

    public AlertsController(IAlertService alertService)
    {
        _alertService = alertService;
    }

    /// <summary>
    /// Lista de productos en niveles críticos de existencia con cantidades sugeridas de reabastecimiento y costo estimado.
    /// </summary>
    [HttpGet("stock")]
    [ProducesResponseType(typeof(IReadOnlyList<StockAlertDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<StockAlertDto>>> GetStockAlerts(
        [FromQuery] StockAlertFilterRequest request,
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "SuperAdmin" && !request.WarehouseId.HasValue)
        {
            var wid = GetCurrentWarehouseId();
            if (wid.HasValue)
            {
                request = request with { WarehouseId = wid.Value };
            }
        }

        var alerts = await _alertService.GetStockAlertsAsync(request, cancellationToken);
        return Ok(alerts);
    }

    /// <summary>
    /// Resumen consolidado del número de alertas activas por severidad y presupuesto total de reposición.
    /// </summary>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(StockAlertSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<StockAlertSummaryDto>> GetAlertsSummary(
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        int? warehouseId = null;
        if (role != "SuperAdmin")
        {
            warehouseId = GetCurrentWarehouseId();
        }

        var summary = await _alertService.GetAlertsSummaryAsync(warehouseId, cancellationToken);
        return Ok(summary);
    }

    private int? GetCurrentWarehouseId()
    {
        var whClaim = User.FindFirst("warehouseId")?.Value;
        return int.TryParse(whClaim, out var wid) && wid > 0 ? wid : null;
    }
}
