namespace Inventory.Application.Features.Auth.DTOs;

public record UserDto(
    int Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive
);
