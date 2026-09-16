using Inventory.Application.Features.Alerts.DTOs;
using Inventory.Application.Features.Alerts.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class AlertsController : BaseApiController
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
        var role = GetCurrentUserRole();
        if (role != "SuperAdmin")
        {
            if (role == "Warehouse" || role == "Seller")
            {
                var wid = GetCurrentWarehouseId();
                if (wid.HasValue && wid.Value > 0)
                {
                    request = request with { WarehouseId = wid.Value };
                }
            }
            else if (!request.WarehouseId.HasValue)
            {
                request = request with { WarehouseId = GetCurrentWarehouseId() };
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
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        var role = GetCurrentUserRole();
        int? filterWarehouseId = warehouseId;

        if (role == "Warehouse" || role == "Seller")
        {
            var wid = GetCurrentWarehouseId();
            if (wid.HasValue && wid.Value > 0)
            {
                filterWarehouseId = wid.Value;
            }
        }
        else if (role != "SuperAdmin" && !filterWarehouseId.HasValue)
        {
            filterWarehouseId = GetCurrentWarehouseId();
        }

        var summary = await _alertService.GetAlertsSummaryAsync(filterWarehouseId, cancellationToken);
        return Ok(summary);
    }
}
