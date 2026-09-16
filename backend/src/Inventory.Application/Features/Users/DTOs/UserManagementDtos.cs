namespace Inventory.Application.Features.Users.DTOs;

public record UserDetailDto(
    int Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    int? WarehouseId = null,
    string? WarehouseName = null
);

public record CreateUserAdminRequest(
    string FullName,
    string Email,
    string Password,
    string Role,
    int? WarehouseId = null
);

public record UpdateUserAdminRequest(
    string FullName,
    string Email,
    string Role,
    int? WarehouseId = null
);

public record ResetUserPasswordRequest(
    string NewPassword
);

public record UserAdminFilterRequest(
    string? Role = null,
    bool? IsActive = null,
    string? Search = null,
    int PageNumber = 1,
    int PageSize = 10,
    int? WarehouseId = null,
    IReadOnlyList<int>? AllowedWarehouseIds = null
);
