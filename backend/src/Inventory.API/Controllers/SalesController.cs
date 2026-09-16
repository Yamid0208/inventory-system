using System.Security.Claims;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Sales.DTOs;
using Inventory.Application.Features.Sales.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class SalesController : BaseApiController
{
    private readonly ISaleService _saleService;

    public SalesController(ISaleService saleService)
    {
        _saleService = saleService;
    }

    /// <summary>
    /// Lista paginada de ventas con filtros. Scoped automáticamente por el almacén del usuario actual.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(PagedResult<SaleDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<SaleDto>>> GetSales(
        [FromQuery] SaleFilterRequest request,
        CancellationToken cancellationToken)
    {
        var role = GetCurrentUserRole();
        if (!IsSuperAdmin())
        {
            var allowed = await GetAuthorizedWarehouseIdsAsync(cancellationToken);
            if (role == "Seller" || role == "Warehouse")
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

        var result = await _saleService.GetSalesAsync(request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene el detalle completo de una venta y sus productos asociados.
    /// </summary>
    [HttpGet("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(SaleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SaleDto>> GetSaleById(int id, CancellationToken cancellationToken)
    {
        var sale = await _saleService.GetSaleByIdAsync(id, cancellationToken);
        return Ok(sale);
    }

    /// <summary>
    /// Registra una nueva venta, validando existencias (RN-001) y deduciendo stock atómicamente.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin,Seller")]
    [ProducesResponseType(typeof(SaleDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<SaleDto>> CreateSale(
        [FromBody] CreateSaleRequest request,
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

        var sale = await _saleService.CreateSaleAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetSaleById), new { id = sale.Id }, sale);
    }

    /// <summary>
    /// Cancela una venta, reingresando los productos al inventario y registrando el retorno en Kardex.
    /// </summary>
    [HttpPatch("{id:int}/cancel")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CancelSale(int id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdClaim, out var userId);
        if (userId <= 0)
        {
            userId = 1;
        }

        await _saleService.CancelSaleAsync(id, userId, cancellationToken);
        return NoContent();
    }
}
