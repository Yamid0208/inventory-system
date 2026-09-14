using Inventory.Application.Features.Products.DTOs;

namespace Inventory.Application.Features.Products.Services;

public interface IBatchService
{
    Task<IReadOnlyList<ProductBatchDto>> GetBatchesByProductIdAsync(int productId, int? warehouseId = null, CancellationToken cancellationToken = default);
    Task<ProductBatchDto> CreateBatchAsync(int productId, CreateProductBatchRequest request, int? warehouseId = null, CancellationToken cancellationToken = default);
}
