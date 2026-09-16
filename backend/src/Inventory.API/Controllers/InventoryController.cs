using System.Security.Claims;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Inventory.DTOs;
using Inventory.Application.Features.Inventory.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class InventoryController : BaseApiController
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    /// <summary>
    /// Consulta paginada y filtrada del Kardex de movimientos de inventario. Scoped por almacén.
    /// </summary>
    [HttpGet("kardex")]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(PagedResult<InventoryMovementDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<InventoryMovementDto>>> GetKardex(
        [FromQuery] KardexFilterRequest request,
        CancellationToken cancellationToken)
    {
        var role = GetCurrentUserRole();
        if (!IsSuperAdmin())
        {
            var allowed = await GetAuthorizedWarehouseIdsAsync(cancellationToken);
            if (role == "Warehouse" || role == "Seller")
            {
                var wid = GetCurrentWarehouseId();
                if (wid.HasValue && wid.Value > 0)
                {
                    request = request with { WarehouseId = wid.Value };
                }
            }

            if (request.WarehouseId.HasValue)
            {
                if (!allowed.Contains(request.WarehouseId.Value))
                {
                    return Forbid();
                }
            }
            else
            {
                request = request with { AllowedWarehouseIds = allowed };
            }
        }

        var result = await _inventoryService.GetKardexAsync(request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Registra un ajuste manual de stock (Entrada o Salida) con validación atómica y trazabilidad (RN-001).
    /// </summary>
    [HttpPost("adjustments")]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(InventoryMovementDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<InventoryMovementDto>> CreateAdjustment(
        [FromBody] CreateStockAdjustmentRequest request,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdClaim, out var userId);
        if (userId <= 0)
        {
            userId = 1;
        }

        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "SuperAdmin" && !request.WarehouseId.HasValue)
        {
            request = request with { WarehouseId = GetCurrentWarehouseId() };
        }

        var movement = await _inventoryService.CreateAdjustmentAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetKardex), new { productId = movement.ProductId }, movement);
    }

    /// <summary>
    /// Procesa una devolución de cliente (reingreso de stock) o devolución a proveedor (salida con RN-001).
    /// </summary>
    [HttpPost("returns")]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(InventoryMovementDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<InventoryMovementDto>> ProcessReturn(
        [FromBody] ProcessReturnRequest request,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdClaim, out var userId);
        if (userId <= 0)
        {
            userId = 1;
        }

        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "SuperAdmin" && !request.WarehouseId.HasValue)
        {
            request = request with { WarehouseId = GetCurrentWarehouseId() };
        }

        var movement = await _inventoryService.ProcessReturnAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetKardex), new { productId = movement.ProductId }, movement);
    }

    /// <summary>
    /// Exporta el reporte de Kardex filtrado en formato CSV con codificación UTF-8 BOM.
    /// </summary>
    [HttpGet("export-kardex")]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportKardex(
        [FromQuery] KardexFilterRequest request,
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (!IsSuperAdmin())
        {
            var allowed = await GetAuthorizedWarehouseIdsAsync(cancellationToken);
            if (role == "Warehouse" || role == "Seller")
            {
                var wid = GetCurrentWarehouseId();
                if (wid.HasValue && wid.Value > 0)
                {
                    request = request with { WarehouseId = wid.Value };
                }
            }

            if (request.WarehouseId.HasValue)
            {
                if (!allowed.Contains(request.WarehouseId.Value))
                {
                    return Forbid();
                }
            }
            else
            {
                request = request with { AllowedWarehouseIds = allowed };
            }
        }

        var csvBytes = await _inventoryService.ExportKardexCsvAsync(request, cancellationToken);
        var filename = $"Kardex_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
        return File(csvBytes, "text/csv; charset=utf-8", filename);
    }
}
