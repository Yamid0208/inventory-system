using Inventory.Application.Common.Models;
using Inventory.Application.Features.Sales.DTOs;

namespace Inventory.Application.Features.Sales.Services;

public interface ISaleService
{
    Task<PagedResult<SaleDto>> GetSalesAsync(SaleFilterRequest request, CancellationToken cancellationToken = default);
    Task<SaleDto> GetSaleByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<SaleDto> CreateSaleAsync(CreateSaleRequest request, int userId, CancellationToken cancellationToken = default);
    Task CancelSaleAsync(int id, int userId, CancellationToken cancellationToken = default);
}
