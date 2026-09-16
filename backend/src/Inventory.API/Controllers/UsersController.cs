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
        int? warehouseId = null;

        if (role == "Admin")
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out var userId))
            {
                var userWarehouses = await _warehouseService.GetWarehousesByAdminUserIdAsync(userId, cancellationToken);
                var validIds = userWarehouses.Select(w => w.Id).ToList();

                if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
                {
                    if (validIds.Contains(request.WarehouseId.Value))
                    {
                        warehouseId = request.WarehouseId.Value;
                    }
                    else
                    {
                        return Ok(new PagedResult<UserDetailDto>(Array.Empty<UserDetailDto>(), 0, request.PageNumber, request.PageSize));
                    }
                }
                else if (validIds.Count == 1)
                {
                    warehouseId = validIds[0];
                }
            }
        }
        else if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            warehouseId = request.WarehouseId.Value;
        }

        var result = await _userService.GetUsersAsync(request, warehouseId, role, cancellationToken);
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
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        var user = await _userService.GetUserByIdAsync(id, null, role, cancellationToken);
        return Ok(user);
    }

    /// <summary>
    /// Registra una nueva cuenta de usuario.
    /// Si quien crea es un Admin, solo puede crear empleados (Warehouse o Seller) para sus propios almacenes.
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

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out var userId);
            var userWarehouses = await _warehouseService.GetWarehousesByAdminUserIdAsync(userId, cancellationToken);
            var validIds = userWarehouses.Select(w => w.Id).ToList();

            if (validIds.Count == 0)
            {
                return BadRequest(new { message = "El administrador actual no tiene sedes o almacenes asignados." });
            }

            if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
            {
                if (!validIds.Contains(request.WarehouseId.Value))
                {
                    return BadRequest(new { message = "El almacén seleccionado no pertenece a sus sedes autorizadas." });
                }
            }
            else
            {
                request = request with { WarehouseId = validIds.First() };
            }
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

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out var userId);
            var userWarehouses = await _warehouseService.GetWarehousesByAdminUserIdAsync(userId, cancellationToken);
            var validIds = userWarehouses.Select(w => w.Id).ToList();

            if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0 && !validIds.Contains(request.WarehouseId.Value))
            {
                return BadRequest(new { message = "El almacén seleccionado no pertenece a sus sedes autorizadas." });
            }
        }

        var updated = await _userService.UpdateUserAsync(id, request, null, role, cancellationToken);
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
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        var updated = await _userService.ToggleUserStatusAsync(id, currentUserId, null, role, cancellationToken);
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
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        await _userService.ResetPasswordAsync(id, request, null, role, cancellationToken);
        return NoContent();
    }
}
