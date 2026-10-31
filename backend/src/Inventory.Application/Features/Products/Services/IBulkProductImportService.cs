using Inventory.Application.Features.Products.DTOs;

namespace Inventory.Application.Features.Products.Services;

public interface IBulkProductImportService
{
    Task<byte[]> GenerateExcelTemplateAsync(CancellationToken cancellationToken = default);
    Task<List<ProductImportRowDto>> ParseExcelAsync(Stream fileStream, CancellationToken cancellationToken = default);
    Task<List<ProductImportRowDto>> ParseImageWithGeminiAsync(Stream imageStream, string mimeType, CancellationToken cancellationToken = default);
    Task<BulkImportResultDto> CommitBulkImportAsync(BulkImportRequest request, int userId, string userEmail, CancellationToken cancellationToken = default);
}
