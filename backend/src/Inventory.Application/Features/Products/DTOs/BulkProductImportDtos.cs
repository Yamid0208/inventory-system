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
    public List<string> ValidationErrors { get; set; } = new();
}

public class BulkImportRequest
{
    public int? WarehouseId { get; set; }
    public bool UpdateExistingProducts { get; set; } = true;
    public List<ProductImportRowDto> Items { get; set; } = new();
}

public class BulkImportResultDto
{
    public int TotalProcessed { get; set; }
    public int ProductsCreated { get; set; }
    public int ProductsUpdated { get; set; }
    public int ErrorsCount { get; set; }
    public List<string> Messages { get; set; } = new();
}
