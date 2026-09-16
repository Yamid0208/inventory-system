using System.Security.Claims;
using Inventory.Application.Features.Categories.DTOs;
using Inventory.Application.Features.Categories.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Inventory.API.Controllers;

[Authorize]
public class CategoriesController : BaseApiController
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse,Seller")]
    [ProducesResponseType(typeof(IReadOnlyList<CategoryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<CategoryDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] int? warehouseId,
        CancellationToken cancellationToken)
    {
        IReadOnlyList<int>? allowedWarehouseIds = null;
        if (!IsSuperAdmin())
        {
            allowedWarehouseIds = await GetAuthorizedWarehouseIdsAsync(cancellationToken);
        }

        int? filterWarehouseId = warehouseId;
        if (GetCurrentUserRole() == "Warehouse" || GetCurrentUserRole() == "Seller")
        {
            filterWarehouseId = GetCurrentWarehouseId();
        }

        var categories = await _categoryService.GetAllAsync(search, isActive, filterWarehouseId, allowedWarehouseIds, cancellationToken);
        return Ok(categories);
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse,Seller")]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoryDto>> GetById(int id, CancellationToken cancellationToken)
    {
        int? warehouseId = null;
        if (!IsSuperAdmin())
        {
            warehouseId = GetCurrentWarehouseId();
        }

        var category = await _categoryService.GetByIdAsync(id, warehouseId, cancellationToken);
        return Ok(category);
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryDto>> Create(
        [FromBody] CreateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsSuperAdmin() && !request.WarehouseId.HasValue)
        {
            var allowed = await GetAuthorizedWarehouseIdsAsync(cancellationToken);
            request.WarehouseId = allowed.FirstOrDefault() > 0 ? allowed.First() : GetCurrentWarehouseId();
        }

        var created = await _categoryService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CategoryDto>> Update(
        int id,
        [FromBody] UpdateCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await _categoryService.UpdateAsync(id, request, cancellationToken);
        return Ok(updated);
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "SuperAdmin,Admin,Warehouse")]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategoryDto>> ToggleStatus(
        int id,
        [FromBody] UpdateCategoryStatusRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await _categoryService.ToggleStatusAsync(id, request.IsActive, cancellationToken);
        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _categoryService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
