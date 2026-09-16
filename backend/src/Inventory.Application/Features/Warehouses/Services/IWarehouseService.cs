using Inventory.Application.Features.Warehouses.DTOs;

namespace Inventory.Application.Features.Warehouses.Services;

public interface IWarehouseService
{
    Task<IReadOnlyList<WarehouseDto>> GetWarehousesAsync(CancellationToken cancellationToken = default);
    Task<WarehouseDto> GetWarehouseByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<WarehouseDto>> GetWarehousesByAdminUserIdAsync(int adminUserId, CancellationToken cancellationToken = default);
    Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseRequest request, CancellationToken cancellationToken = default);
    Task<WarehouseDto> CreateAdminWithWarehouseAsync(CreateAdminWithWarehouseRequest request, CancellationToken cancellationToken = default);
    Task<WarehouseDto> UpdateWarehouseAsync(int id, UpdateWarehouseRequest request, CancellationToken cancellationToken = default);
    Task<WarehouseDto> ToggleStatusAsync(int id, CancellationToken cancellationToken = default);
}
