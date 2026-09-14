using Inventory.Application.Common.Models;
using Inventory.Application.Features.Products.DTOs;

namespace Inventory.Application.Features.Products.Services;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetProductsAsync(ProductListRequest request, CancellationToken cancellationToken = default);
    Task<ProductDto> GetProductByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<ProductDto> GetProductBySkuAsync(string sku, CancellationToken cancellationToken = default);
    Task<ProductDto> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken = default);
    Task<ProductDto> UpdateProductAsync(int id, UpdateProductRequest request, CancellationToken cancellationToken = default);
    Task<ProductDto> ToggleStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default);
    Task DeleteProductAsync(int id, CancellationToken cancellationToken = default);
    Task<string> UploadProductImageAsync(int id, Stream imageStream, string fileName, string contentType, CancellationToken cancellationToken = default);
}
