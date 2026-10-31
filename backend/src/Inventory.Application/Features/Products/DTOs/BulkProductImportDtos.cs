using System.Text.Json.Serialization;

namespace Inventory.Application.Features.Products.DTOs;

public class ProductImportRowDto
{
    public int RowNumber { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string? SupplierName { get; set; }
    public decimal PurchasePrice { get; set; }
    public decimal SalePrice { get; set; }
    public int InitialStock { get; set; }
    public int MinimumStock { get; set; } = 5;
    public string? Description { get; set; }
    public bool IsValid { get; set; } = true;
    public bool IsExisting { get; set; }
    public List<string> ValidationErrors { get; set; } = new();
}

public class BulkImportRequest
{
    public int? WarehouseId { get; set; }

    [JsonPropertyName("updateExisting")]
    public bool UpdateExisting { get; set; } = true;

    [JsonPropertyName("updateExistingProducts")]
    public bool UpdateExistingProducts
    {
        get => UpdateExisting;
        set => UpdateExisting = value;
    }

    private List<ProductImportRowDto> _items = new();

    [JsonPropertyName("products")]
    public List<ProductImportRowDto> Products
    {
        get => _items;
        set => _items = value ?? new();
    }

    [JsonPropertyName("items")]
    public List<ProductImportRowDto> Items
    {
        get => _items;
        set => _items = value ?? new();
    }
}

public class BulkImportResultDto
{
    [JsonPropertyName("totalProcessed")]
    public int TotalProcessed { get; set; }

    [JsonPropertyName("createdCount")]
    public int CreatedCount { get; set; }

    [JsonPropertyName("productsCreated")]
    public int ProductsCreated
    {
        get => CreatedCount;
        set => CreatedCount = value;
    }

    [JsonPropertyName("updatedCount")]
    public int UpdatedCount { get; set; }

    [JsonPropertyName("productsUpdated")]
    public int ProductsUpdated
    {
        get => UpdatedCount;
        set => UpdatedCount = value;
    }

    [JsonPropertyName("errorCount")]
    public int ErrorCount { get; set; }

    [JsonPropertyName("errorsCount")]
    public int ErrorsCount
    {
        get => ErrorCount;
        set => ErrorCount = value;
    }

    [JsonPropertyName("details")]
    public List<string> Details { get; set; } = new();

    [JsonPropertyName("messages")]
    public List<string> Messages
    {
        get => Details;
        set => Details = value ?? new();
    }
}
