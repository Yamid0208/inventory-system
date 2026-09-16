using Inventory.Application.Features.Suppliers.DTOs;

namespace Inventory.Application.Features.Suppliers.Services;

public interface ISupplierService
{
    Task<IReadOnlyList<SupplierDto>> GetAllAsync(string? search = null, bool? isActive = null, int? warehouseId = null, IReadOnlyList<int>? allowedWarehouseIds = null, CancellationToken cancellationToken = default);
    Task<SupplierDto> GetByIdAsync(int id, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<SupplierDto> CreateAsync(CreateSupplierRequest request, CancellationToken cancellationToken = default);
    Task<SupplierDto> UpdateAsync(int id, UpdateSupplierRequest request, CancellationToken cancellationToken = default);
    Task<SupplierDto> ToggleStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);
}
