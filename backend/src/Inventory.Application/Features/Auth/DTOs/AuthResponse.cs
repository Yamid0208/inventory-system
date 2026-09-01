namespace Inventory.Application.Features.Auth.DTOs;

public record AuthResponse(
    string AccessToken,
    UserDto User,
    DateTimeOffset ExpiresAt,
    string RefreshToken // Usado internamente por el Controller para setear la cookie HttpOnly
);
