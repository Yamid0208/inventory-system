namespace Inventory.Application.Features.Sales.DTOs;

public record SaleFilterRequest(
    string? Status = null,
    string? PaymentMethod = null,
    DateTimeOffset? StartDate = null,
    DateTimeOffset? EndDate = null,
    string? Search = null,
    int PageNumber = 1,
    int PageSize = 10,
    int? UserId = null,
    bool? OnlyMine = null,
    int? WarehouseId = null
);

public record CreateSaleItemRequest(
    int ProductId,
    int Quantity,
    decimal UnitPrice,
    decimal TaxRate = 0.19m
);

public record CreateSaleRequest(
    string CustomerName,
    string? CustomerTaxId,
    string? CustomerEmail,
    string PaymentMethod,
    string InvoiceType,
    DateTimeOffset SaleDate,
    string? Notes,
    List<CreateSaleItemRequest> Items,
    int? WarehouseId = null
);
