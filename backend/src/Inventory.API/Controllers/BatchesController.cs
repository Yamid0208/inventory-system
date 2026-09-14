using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Inventory.Application.Features.Products.DTOs;
using Inventory.Application.Features.Products.Services;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/products/{productId:int}/batches")]
[Authorize]
public class BatchesController : ControllerBase
{
    private readonly IBatchService _batchService;

    public BatchesController(IBatchService batchService)
    {
        _batchService = batchService;
    }

    /// <summary>
    /// Obtiene todos los lotes activos de un producto ordenados por fecha de caducidad (FEFO).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ProductBatchDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ProductBatchDto>>> GetBatches(
        [FromRoute] int productId,
        CancellationToken cancellationToken)
    {
        var warehouseId = GetCurrentWarehouseId();
        var batches = await _batchService.GetBatchesByProductIdAsync(productId, warehouseId, cancellationToken);
        return Ok(batches);
    }

    /// <summary>
    /// Registra un nuevo lote con fecha de expiración para un producto.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(ProductBatchDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<ProductBatchDto>> CreateBatch(
        [FromRoute] int productId,
        [FromBody] CreateProductBatchRequest request,
        CancellationToken cancellationToken)
    {
        var warehouseId = GetCurrentWarehouseId();
        var batch = await _batchService.CreateBatchAsync(productId, request, warehouseId, cancellationToken);
        return CreatedAtAction(nameof(GetBatches), new { productId }, batch);
    }

    private int? GetCurrentWarehouseId()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role == "SuperAdmin") return null;

        var whClaim = User.FindFirst("warehouseId")?.Value;
        return int.TryParse(whClaim, out var wid) && wid > 0 ? wid : null;
    }
}
