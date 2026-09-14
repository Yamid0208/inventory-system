using Inventory.Application.Common.Models;
using Inventory.Application.Features.Purchases.DTOs;

namespace Inventory.Application.Features.Purchases.Services;

public interface IPurchaseService
{
    Task<PagedResult<PurchaseDto>> GetPurchasesAsync(PurchaseFilterRequest request, CancellationToken cancellationToken = default);
    Task<PurchaseDto> GetPurchaseByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<PurchaseDto> CreatePurchaseAsync(CreatePurchaseRequest request, int userId, CancellationToken cancellationToken = default);
    Task<PurchaseDto> ReceivePurchaseAsync(int id, int userId, CancellationToken cancellationToken = default);
    Task CancelPurchaseAsync(int id, CancellationToken cancellationToken = default);
}
