namespace Inventory.Application.Features.Products.DTOs;

public class ProductListRequest
{
    public string? Search { get; set; }
    public int? CategoryId { get; set; }
    public int? SupplierId { get; set; }
    public string? StockStatus { get; set; } // "all", "in_stock", "low_stock", "out_of_stock"
    public bool? IsActive { get; set; }
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public int? WarehouseId { get; set; }
    public IReadOnlyList<int>? AllowedWarehouseIds { get; set; }
}

public class CreateProductRequest
{
    public string Sku { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int CategoryId { get; set; }
    public int SupplierId { get; set; }
    public decimal PurchasePrice { get; set; }
    public decimal SalePrice { get; set; }
    public int MinimumStock { get; set; } = 5;
    public string? ImageUrl { get; set; }
    public int? WarehouseId { get; set; }
}

public class UpdateProductRequest
{
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public int CategoryId { get; set; }
    public int SupplierId { get; set; }
    public decimal PurchasePrice { get; set; }
    public decimal SalePrice { get; set; }
    public int MinimumStock { get; set; } = 5;
    public string? ImageUrl { get; set; }
    public string RowVersion { get; set; } = string.Empty;
}

public class UpdateProductStatusRequest
{
    public bool IsActive { get; set; }
}
