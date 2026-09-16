using System.Security.Claims;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Purchases.DTOs;
using Inventory.Application.Features.Purchases.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class PurchasesController : BaseApiController
{
    private readonly IPurchaseService _purchaseService;

    public PurchasesController(IPurchaseService purchaseService)
    {
        _purchaseService = purchaseService;
    }

    /// <summary>
    /// Lista paginada de órdenes de compra con filtros por proveedor, estado y fecha. Scoped por almacén.
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(PagedResult<PurchaseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PurchaseDto>>> GetPurchases(
        [FromQuery] PurchaseFilterRequest request,
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

        var result = await _purchaseService.GetPurchasesAsync(request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene el detalle completo de una orden de compra con sus líneas de producto.
    /// </summary>
    [HttpGet("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(PurchaseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseDto>> GetPurchaseById(int id, CancellationToken cancellationToken)
    {
        var purchase = await _purchaseService.GetPurchaseByIdAsync(id, cancellationToken);
        return Ok(purchase);
    }

    /// <summary>
    /// Registra una nueva compra a proveedor, incrementando stock atómicamente si autoReceive es true.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(PurchaseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseDto>> CreatePurchase(
        [FromBody] CreatePurchaseRequest request,
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

        var purchase = await _purchaseService.CreatePurchaseAsync(request, userId, cancellationToken);
        return CreatedAtAction(nameof(GetPurchaseById), new { id = purchase.Id }, purchase);
    }

    /// <summary>
    /// Confirma la recepción física de una orden pendiente e incrementa existencias en inventario.
    /// </summary>
    [HttpPatch("{id:int}/receive")]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(PurchaseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PurchaseDto>> ReceivePurchase(int id, CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdClaim, out var userId);
        if (userId <= 0)
        {
            userId = 1;
        }

        var purchase = await _purchaseService.ReceivePurchaseAsync(id, userId, cancellationToken);
        return Ok(purchase);
    }

    /// <summary>
    /// Registra la devolución de productos de una compra recibida a su proveedor, descontando inventario.
    /// </summary>
    [HttpPost("{id:int}/return")]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(PurchaseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PurchaseDto>> ReturnPurchase(
        int id,
        [FromBody] ReturnPurchaseRequest request,
        CancellationToken cancellationToken)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(userIdClaim, out var userId);
        if (userId <= 0)
        {
            userId = 1;
        }

        var purchase = await _purchaseService.ReturnPurchaseAsync(id, request, userId, cancellationToken);
        return Ok(purchase);
    }

    /// <summary>
    /// Cancela una orden de compra en estado pendiente.
    /// </summary>
    [HttpPatch("{id:int}/cancel")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelPurchase(int id, CancellationToken cancellationToken)
    {
        await _purchaseService.CancelPurchaseAsync(id, cancellationToken);
        return NoContent();
    }
}
