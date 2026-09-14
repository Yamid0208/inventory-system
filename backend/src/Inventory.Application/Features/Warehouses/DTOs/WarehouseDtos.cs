namespace Inventory.Application.Features.Warehouses.DTOs;

public record WarehouseDto(
    int Id,
    string Name,
    string Code,
    string? Address,
    string? City,
    string? Phone,
    int AdminUserId,
    string AdminUserName,
    string AdminUserEmail,
    bool IsActive,
    int EmployeeCount,
    DateTimeOffset CreatedAt
);

public record CreateWarehouseRequest(
    string Name,
    string Code,
    int AdminUserId,
    string? Address = null,
    string? City = null,
    string? Phone = null
);

public record UpdateWarehouseRequest(
    string Name,
    string Code,
    string? Address = null,
    string? City = null,
    string? Phone = null
);

public record CreateAdminWithWarehouseRequest(
    string AdminFullName,
    string AdminEmail,
    string AdminPassword,
    string WarehouseName,
    string WarehouseCode,
    string? WarehouseAddress = null,
    string? WarehouseCity = null,
    string? WarehousePhone = null
);
