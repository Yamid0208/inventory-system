namespace Inventory.Application.Features.Products.DTOs;

public record ProductBatchDto(
    int Id,
    int ProductId,
    string BatchNumber,
    DateTimeOffset? ManufacturingDate,
    DateTimeOffset ExpirationDate,
    int InitialQuantity,
    int CurrentQuantity,
    bool IsActive,
    int DaysToExpiration,
    string Status
);

public record CreateProductBatchRequest(
    string BatchNumber,
    DateTimeOffset ExpirationDate,
    int InitialQuantity,
    DateTimeOffset? ManufacturingDate = null
);
