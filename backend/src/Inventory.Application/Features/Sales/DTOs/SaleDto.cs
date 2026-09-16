namespace Inventory.Application.Features.Sales.DTOs;

public record SaleItemDto(
    int Id,
    int ProductId,
    string ProductSku,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal,
    decimal Tax,
    decimal Total
);

public record SalePaymentDto(
    int Id,
    string Method,
    decimal Amount,
    string? Reference
);

public record SaleDto(
    int Id,
    string SaleNumber,
    string CustomerName,
    string? CustomerTaxId,
    string? CustomerEmail,
    int UserId,
    string UserName,
    DateTimeOffset SaleDate,
    string Status,
    string PaymentMethod,
    string InvoiceType,
    decimal Subtotal,
    decimal Tax,
    decimal Total,
    string? Notes,
    IReadOnlyCollection<SaleItemDto> Items,
    IReadOnlyCollection<SalePaymentDto>? Payments = null,
    int? WarehouseId = null,
    string? WarehouseName = null,
    string? WarehouseCode = null
);
