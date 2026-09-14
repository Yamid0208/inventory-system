using System.Security.Claims;
using Inventory.Application.Features.Warehouses.DTOs;
using Inventory.Application.Features.Warehouses.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class WarehousesController : ControllerBase
{
    private readonly IWarehouseService _warehouseService;

    public WarehousesController(IWarehouseService warehouseService)
    {
        _warehouseService = warehouseService;
    }

    /// <summary>
    /// Lista todos los almacenes registrados (SuperAdmin) o el almacén asignado al usuario actual (Admin).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<WarehouseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<WarehouseDto>>> GetWarehouses(CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (role == "SuperAdmin")
        {
            var warehouses = await _warehouseService.GetWarehousesAsync(cancellationToken);
            return Ok(warehouses);
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
        {
            var warehouse = await _warehouseService.GetWarehouseByAdminUserIdAsync(userId, cancellationToken);
            if (warehouse != null)
            {
                return Ok(new[] { warehouse });
            }
        }

        return Ok(Array.Empty<WarehouseDto>());
    }

    /// <summary>
    /// Obtiene el detalle de un almacén por su identificador único.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(WarehouseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WarehouseDto>> GetWarehouseById(int id, CancellationToken cancellationToken)
    {
        var warehouse = await _warehouseService.GetWarehouseByIdAsync(id, cancellationToken);
        return Ok(warehouse);
    }

    /// <summary>
    /// Crea un nuevo almacén vinculándolo a un usuario administrador existente (Exclusivo SuperAdmin).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(typeof(WarehouseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<WarehouseDto>> CreateWarehouse(
        [FromBody] CreateWarehouseRequest request,
        CancellationToken cancellationToken)
    {
        var created = await _warehouseService.CreateWarehouseAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetWarehouseById), new { id = created.Id }, created);
    }

    /// <summary>
    /// Crea un nuevo cliente Administrador y su respectivo Almacén en una sola operación atómica (Exclusivo SuperAdmin).
    /// </summary>
    [HttpPost("client-admin")]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(typeof(WarehouseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<WarehouseDto>> CreateAdminWithWarehouse(
        [FromBody] CreateAdminWithWarehouseRequest request,
        CancellationToken cancellationToken)
    {
        var created = await _warehouseService.CreateAdminWithWarehouseAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetWarehouseById), new { id = created.Id }, created);
    }

    /// <summary>
    /// Actualiza los datos de un almacén existente.
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    [ProducesResponseType(typeof(WarehouseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WarehouseDto>> UpdateWarehouse(
        int id,
        [FromBody] UpdateWarehouseRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await _warehouseService.UpdateWarehouseAsync(id, request, cancellationToken);
        return Ok(updated);
    }

    /// <summary>
    /// Activa o desactiva un almacén (Exclusivo SuperAdmin).
    /// </summary>
    [HttpPatch("{id:int}/toggle-status")]
    [Authorize(Roles = "SuperAdmin")]
    [ProducesResponseType(typeof(WarehouseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<WarehouseDto>> ToggleStatus(int id, CancellationToken cancellationToken)
    {
        var updated = await _warehouseService.ToggleStatusAsync(id, cancellationToken);
        return Ok(updated);
    }
}
