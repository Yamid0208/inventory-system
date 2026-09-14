using System.Security.Claims;
using Inventory.Domain.Constants;
using Inventory.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

public record RolePermissionMatrixItem(
    string Role,
    string DisplayName,
    string Description,
    IReadOnlyList<string> Permissions
);

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    /// <summary>
    /// Retorna la matriz completa de roles del sistema y sus permisos granulares asignados.
    /// </summary>
    [HttpGet("matrix")]
    [ProducesResponseType(typeof(IReadOnlyList<RolePermissionMatrixItem>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<RolePermissionMatrixItem>> GetMatrix()
    {
        var result = new List<RolePermissionMatrixItem>
        {
            new(
                Role: "Admin",
                DisplayName: "Administrador del Sistema",
                Description: "Acceso ilimitado a catálogo, movimientos de Kardex, compras, ventas, usuarios y configuración.",
                Permissions: RolePermissions.GetPermissionsForRole(UserRole.Admin)
            ),
            new(
                Role: "Warehouse",
                DisplayName: "Bodega y Almacén",
                Description: "Gestión operativa de catálogo, ajustes de inventario, recepción de compras y reportes.",
                Permissions: RolePermissions.GetPermissionsForRole(UserRole.Warehouse)
            ),
            new(
                Role: "Seller",
                DisplayName: "Vendedor / Comercial",
                Description: "Consulta de existencias disponibles, facturación de ventas y seguimiento comercial.",
                Permissions: RolePermissions.GetPermissionsForRole(UserRole.Seller)
            )
        };

        return Ok(result);
    }

    /// <summary>
    /// Retorna la lista de permisos efectivos del usuario autenticado en la sesión actual.
    /// </summary>
    [HttpGet("my-permissions")]
    [ProducesResponseType(typeof(IReadOnlyList<string>), StatusCodes.Status200OK)]
    public ActionResult<IReadOnlyList<string>> GetMyPermissions()
    {
        var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrWhiteSpace(roleClaim) || !Enum.TryParse<UserRole>(roleClaim, true, out var role))
        {
            return Ok(Array.Empty<string>());
        }

        var permissions = RolePermissions.GetPermissionsForRole(role);
        return Ok(permissions);
    }
}
