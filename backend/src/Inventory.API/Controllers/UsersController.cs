using System.Security.Claims;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Users.DTOs;
using Inventory.Application.Features.Users.Services;
using Inventory.Application.Features.Warehouses.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize(Roles = "SuperAdmin,Admin")]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _userService;
    private readonly IWarehouseService _warehouseService;

    public UsersController(IUserManagementService userService, IWarehouseService warehouseService)
    {
        _userService = userService;
        _warehouseService = warehouseService;
    }

    /// <summary>
    /// Lista paginada de usuarios con filtros de rol, estado y búsqueda.
    /// SuperAdmin ve todos los usuarios o filtra por almacén; Admin solo ve los empleados de su propio almacén.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<UserDetailDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<UserDetailDto>>> GetUsers(
        [FromQuery] UserAdminFilterRequest request,
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role == "Admin")
        {
            var warehouseId = await GetCurrentAdminWarehouseIdAsync(cancellationToken);
            if (warehouseId.HasValue)
            {
                request = request with { WarehouseId = warehouseId.Value };
            }
        }

        var result = await _userService.GetUsersAsync(request, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Obtiene el detalle de un usuario por su identificador.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDetailDto>> GetUserById(int id, CancellationToken cancellationToken)
    {
        var user = await _userService.GetUserByIdAsync(id, cancellationToken);
        return Ok(user);
    }

    /// <summary>
    /// Registra una nueva cuenta de usuario.
    /// Si quien crea es un Admin, solo puede crear empleados (Warehouse o Seller) para su propio almacén.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserDetailDto>> CreateUser(
        [FromBody] CreateUserAdminRequest request,
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (role == "Admin")
        {
            if (request.Role == "Admin" || request.Role == "SuperAdmin")
            {
                return BadRequest(new { message = "Los administradores de cliente solo pueden registrar empleados operativos con rol 'Warehouse' o 'Seller'." });
            }

            var warehouseId = await GetCurrentAdminWarehouseIdAsync(cancellationToken);
            if (!warehouseId.HasValue)
            {
                return BadRequest(new { message = "El administrador actual no tiene un almacén asignado." });
            }

            request = request with { WarehouseId = warehouseId.Value };
        }

        var user = await _userService.CreateUserAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, user);
    }

    /// <summary>
    /// Actualiza el nombre, correo o rol de un usuario existente.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDetailDto>> UpdateUser(
        int id,
        [FromBody] UpdateUserAdminRequest request,
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role == "Admin")
        {
            if (request.Role == "Admin" || request.Role == "SuperAdmin")
            {
                return BadRequest(new { message = "No tiene permisos para asignar roles de nivel administrativo." });
            }
            var warehouseId = await GetCurrentAdminWarehouseIdAsync(cancellationToken);
            request = request with { WarehouseId = warehouseId };
        }

        var updated = await _userService.UpdateUserAsync(id, request, cancellationToken);
        return Ok(updated);
    }

    /// <summary>
    /// Activa o desactiva la cuenta de un usuario.
    /// </summary>
    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDetailDto>> ToggleStatus(int id, CancellationToken cancellationToken)
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int.TryParse(idClaim, out var currentUserId);
        var updated = await _userService.ToggleUserStatusAsync(id, currentUserId, cancellationToken);
        return Ok(updated);
    }

    /// <summary>
    /// Restablece administrativamente la contraseña de un usuario.
    /// </summary>
    [HttpPost("{id:int}/reset-password")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResetPassword(
        int id,
        [FromBody] ResetUserPasswordRequest request,
        CancellationToken cancellationToken)
    {
        await _userService.ResetPasswordAsync(id, request, cancellationToken);
        return NoContent();
    }

    private async Task<int?> GetCurrentAdminWarehouseIdAsync(CancellationToken cancellationToken)
    {
        var whClaim = User.FindFirst("warehouseId")?.Value;
        if (int.TryParse(whClaim, out var wid) && wid > 0)
        {
            return wid;
        }

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
        {
            var wh = await _warehouseService.GetWarehouseByAdminUserIdAsync(userId, cancellationToken);
            return wh?.Id;
        }

        return null;
    }
}
