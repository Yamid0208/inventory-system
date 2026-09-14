namespace Inventory.Application.Features.Products.DTOs;

public class ProductDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = string.Empty;
    public decimal PurchasePrice { get; set; }
    public decimal SalePrice { get; set; }
    public int CurrentStock { get; set; }
    public int MinimumStock { get; set; }
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; }
    public string StockStatus { get; set; } = "InStock";
    public string RowVersion { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public int? WarehouseId { get; set; }

    public static string CalculateStockStatus(int currentStock, int minimumStock)
    {
        if (currentStock <= 0) return "OutOfStock";
        if (currentStock <= minimumStock) return "LowStock";
        return "InStock";
    }
}
