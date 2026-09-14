using Inventory.Application.Common.Models;
using Inventory.Application.Features.Inventory.DTOs;

namespace Inventory.Application.Features.Inventory.Services;

public interface IInventoryService
{
    Task<PagedResult<InventoryMovementDto>> GetKardexAsync(KardexFilterRequest request, CancellationToken cancellationToken = default);
    Task<InventoryMovementDto> CreateAdjustmentAsync(CreateStockAdjustmentRequest request, int userId, CancellationToken cancellationToken = default);
    Task<InventoryMovementDto> ProcessReturnAsync(ProcessReturnRequest request, int userId, CancellationToken cancellationToken = default);
    Task<byte[]> ExportKardexCsvAsync(KardexFilterRequest request, CancellationToken cancellationToken = default);
}
