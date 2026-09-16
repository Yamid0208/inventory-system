namespace Inventory.Application.Features.Customers.DTOs;

public record CustomerDto(
    int Id,
    string Name,
    string? TaxId,
    string? Email,
    string? Phone,
    string? Address,
    string? City,
    string? Notes,
    bool IsActive,
    DateTimeOffset CreatedAt,
    int? WarehouseId = null
);

public record CreateCustomerRequest(
    string Name,
    string? TaxId = null,
    string? Email = null,
    string? Phone = null,
    string? Address = null,
    string? City = null,
    string? Notes = null,
    int? UserId = null,
    int? WarehouseId = null
);

public record UpdateCustomerRequest(
    string Name,
    string? TaxId = null,
    string? Email = null,
    string? Phone = null,
    string? Address = null,
    string? City = null,
    string? Notes = null
);

public record CustomerFilterRequest(
    string? Search = null,
    bool? IsActive = null,
    int PageNumber = 1,
    int PageSize = 10,
    int? UserId = null,
    bool? OnlyMine = null,
    int? WarehouseId = null,
    IReadOnlyList<int>? AllowedWarehouseIds = null
);

public record CustomerSummaryDto(
    int TotalCustomers,
    int ActiveCustomers,
    int InactiveCustomers
);
