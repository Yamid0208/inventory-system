namespace Inventory.Application.Features.Categories.DTOs;

public class CreateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? WarehouseId { get; set; }
}

public class UpdateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? WarehouseId { get; set; }
}

public class UpdateCategoryStatusRequest
{
    public bool IsActive { get; set; }
}
