using Inventory.Application.Common.Models;
using Inventory.Application.Features.Customers.DTOs;

namespace Inventory.Application.Features.Customers.Services;

public interface ICustomerService
{
    Task<PagedResult<CustomerDto>> GetCustomersAsync(
        CustomerFilterRequest request,
        CancellationToken cancellationToken = default);

    Task<CustomerDto> GetCustomerByIdAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<CustomerDto> CreateCustomerAsync(
        CreateCustomerRequest request,
        CancellationToken cancellationToken = default);

    Task<CustomerDto> UpdateCustomerAsync(
        int id,
        UpdateCustomerRequest request,
        CancellationToken cancellationToken = default);

    Task<CustomerDto> ToggleStatusAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task DeleteCustomerAsync(
        int id,
        CancellationToken cancellationToken = default);

    Task<CustomerSummaryDto> GetSummaryAsync(
        int? userId = null,
        CancellationToken cancellationToken = default);
}
