using Inventory.Application.Common.Models;
using Inventory.Application.Features.Auth.DTOs;

namespace Inventory.Application.Features.Auth.Services;

public interface IAuthService
{
    Task<Result<AuthResponse>> LoginAsync(LoginRequest request, string? ipAddress, CancellationToken cancellationToken = default);
    Task<Result<AuthResponse>> RefreshTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default);
    Task<Result> RevokeTokenAsync(string refreshToken, string? ipAddress, CancellationToken cancellationToken = default);
    Task<Result<UserDto>> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default);
}
