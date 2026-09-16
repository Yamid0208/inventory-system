using System.Security.Claims;
using Inventory.Application.Common.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Inventory.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public abstract class BaseApiController : ControllerBase
{
    protected int? GetCurrentWarehouseId()
    {
        var whClaim = User.FindFirst("warehouseId")?.Value;
        return int.TryParse(whClaim, out var wid) && wid > 0 ? wid : null;
    }

    protected int GetCurrentUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(idClaim, out var id) ? id : 0;
    }

    protected string GetCurrentUserRole()
    {
        return User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
    }

    protected bool IsSuperAdmin()
    {
        return GetCurrentUserRole() == "SuperAdmin";
    }

    protected async Task<IReadOnlyList<int>> GetAuthorizedWarehouseIdsAsync(CancellationToken cancellationToken = default)
    {
        var role = GetCurrentUserRole();
        var userId = GetCurrentUserId();
        var currentWhId = GetCurrentWarehouseId();

        if (role == "SuperAdmin")
        {
            return Array.Empty<int>();
        }

        var dbContext = HttpContext.RequestServices.GetRequiredService<IApplicationDbContext>();

        if (role == "Admin")
        {
            var ids = await dbContext.Warehouses
                .AsNoTracking()
                .Where(w => w.AdminUserId == userId || (currentWhId.HasValue && w.Id == currentWhId.Value) || w.Employees.Any(u => u.Id == userId))
                .Select(w => w.Id)
                .ToListAsync(cancellationToken);

            if (ids.Count == 0 && currentWhId.HasValue)
            {
                ids.Add(currentWhId.Value);
            }
            else if (ids.Count == 0)
            {
                ids = await dbContext.Warehouses
                    .AsNoTracking()
                    .Where(w => w.IsActive)
                    .Select(w => w.Id)
                    .ToListAsync(cancellationToken);
            }

            return ids;
        }

        if (currentWhId.HasValue && currentWhId.Value > 0)
        {
            return new List<int> { currentWhId.Value };
        }

        return Array.Empty<int>();
    }
}
