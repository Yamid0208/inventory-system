using Inventory.Application.Features.Categories.DTOs;

namespace Inventory.Application.Features.Categories.Services;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> GetAllAsync(string? search = null, bool? isActive = null, int? warehouseId = null, IReadOnlyList<int>? allowedWarehouseIds = null, CancellationToken cancellationToken = default);
    Task<CategoryDto> GetByIdAsync(int id, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<CategoryDto> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken = default);
    Task<CategoryDto> UpdateAsync(int id, UpdateCategoryRequest request, CancellationToken cancellationToken = default);
    Task<CategoryDto> ToggleStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
