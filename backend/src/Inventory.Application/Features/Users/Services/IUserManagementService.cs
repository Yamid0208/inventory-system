using Inventory.Application.Common.Models;
using Inventory.Application.Features.Users.DTOs;

namespace Inventory.Application.Features.Users.Services;

public interface IUserManagementService
{
    Task<PagedResult<UserDetailDto>> GetUsersAsync(UserAdminFilterRequest request, CancellationToken cancellationToken = default);
    Task<UserDetailDto> GetUserByIdAsync(int id, int? callerWarehouseId = null, string? callerRole = null, CancellationToken cancellationToken = default);
    Task<UserDetailDto> CreateUserAsync(CreateUserAdminRequest request, CancellationToken cancellationToken = default);
    Task<UserDetailDto> UpdateUserAsync(int id, UpdateUserAdminRequest request, int? callerWarehouseId = null, string? callerRole = null, CancellationToken cancellationToken = default);
    Task<UserDetailDto> ToggleUserStatusAsync(int id, int currentUserId, int? callerWarehouseId = null, string? callerRole = null, CancellationToken cancellationToken = default);
    Task ResetPasswordAsync(int id, ResetUserPasswordRequest request, int? callerWarehouseId = null, string? callerRole = null, CancellationToken cancellationToken = default);
}
