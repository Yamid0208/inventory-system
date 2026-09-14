using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Interfaces;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Users.DTOs;
using Inventory.Application.Features.Users.Services;
using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class UserManagementService : IUserManagementService
{
    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public UserManagementService(ApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<PagedResult<UserDetailDto>> GetUsersAsync(
        UserAdminFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Users.AsNoTracking().Include(u => u.Warehouse).AsQueryable();

        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            query = query.Where(u => u.WarehouseId == request.WarehouseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Role) && request.Role != "all")
        {
            if (Enum.TryParse<UserRole>(request.Role, true, out var role))
            {
                query = query.Where(u => u.Role == role);
            }
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(u => u.IsActive == request.IsActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(search) ||
                u.Email.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = users.Select(MapToDto).ToList();
        return new PagedResult<UserDetailDto>(dtos, totalCount, pageNumber, pageSize);
    }

    public async Task<UserDetailDto> GetUserByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            throw new NotFoundException($"El usuario con ID {id} no existe.");
        }

        return MapToDto(user);
    }

    public async Task<UserDetailDto> CreateUserAsync(
        CreateUserAdminRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var emailExists = await _context.Users
            .AnyAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (emailExists)
        {
            throw new ConflictException($"Ya existe un usuario registrado con el correo electrónico '{request.Email}'.");
        }

        if (!Enum.TryParse<UserRole>(request.Role, true, out var role))
        {
            role = UserRole.Seller;
        }

        var passwordHash = _passwordHasher.Hash(request.Password);
        var user = new User(request.FullName, normalizedEmail, passwordHash, role, request.WarehouseId);

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        _context.AuditLogs.Add(new AuditLog(
            "User",
            "Create",
            $"Usuario '{user.FullName}' ({user.Email}) registrado con rol {user.Role}.",
            "Administrador",
            user.Id,
            user.Id.ToString()
        ));
        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(user);
    }

    public async Task<UserDetailDto> UpdateUserAsync(
        int id,
        UpdateUserAdminRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            throw new NotFoundException($"El usuario con ID {id} no existe.");
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (!user.Email.Equals(normalizedEmail, StringComparison.OrdinalIgnoreCase))
        {
            var emailExists = await _context.Users
                .AnyAsync(u => u.Email == normalizedEmail && u.Id != id, cancellationToken);

            if (emailExists)
            {
                throw new ConflictException($"Ya existe otro usuario registrado con el correo '{request.Email}'.");
            }
        }

        if (!Enum.TryParse<UserRole>(request.Role, true, out var role))
        {
            role = user.Role;
        }

        user.Update(request.FullName, normalizedEmail, role, request.WarehouseId ?? user.WarehouseId);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(user);
    }

    public async Task<UserDetailDto> ToggleUserStatusAsync(
        int id,
        int currentUserId,
        CancellationToken cancellationToken = default)
    {
        if (id == currentUserId)
        {
            throw new BusinessRuleViolationException(
                "RN-USR-01",
                "Por motivos de seguridad y continuidad del sistema, no es posible desactivar tu propia cuenta de administrador en sesión.");
        }

        var user = await _context.Users
            .Include(u => u.RefreshTokens)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            throw new NotFoundException($"El usuario con ID {id} no existe.");
        }

        if (user.IsActive)
        {
            user.Deactivate();
            user.RevokeAllRefreshTokens("Desactivado por Administrador");
            _context.AuditLogs.Add(new AuditLog(
                "User",
                "Deactivate",
                $"Cuenta del usuario '{user.FullName}' ({user.Email}) desactivada.",
                "Administrador",
                user.Id,
                user.Id.ToString()
            ));
        }
        else
        {
            user.Activate();
            _context.AuditLogs.Add(new AuditLog(
                "User",
                "Activate",
                $"Cuenta del usuario '{user.FullName}' ({user.Email}) reactivada.",
                "Administrador",
                user.Id,
                user.Id.ToString()
            ));
        }

        await _context.SaveChangesAsync(cancellationToken);
        return MapToDto(user);
    }

    public async Task ResetPasswordAsync(
        int id,
        ResetUserPasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.RefreshTokens)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            throw new NotFoundException($"El usuario con ID {id} no existe.");
        }

        var newHash = _passwordHasher.Hash(request.NewPassword);
        user.SetPasswordHash(newHash);
        user.RevokeAllRefreshTokens("Reinicio de contraseña por Administrador");
        _context.AuditLogs.Add(new AuditLog(
            "User",
            "PasswordReset",
            $"Contraseña restablecida administrativamente para el usuario '{user.FullName}' ({user.Email}).",
            "Administrador",
            user.Id,
            user.Id.ToString()
        ));

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static UserDetailDto MapToDto(User u)
    {
        return new UserDetailDto(
            u.Id,
            u.FullName,
            u.Email,
            u.Role.ToString(),
            u.IsActive,
            u.CreatedAt,
            u.UpdatedAt,
            u.WarehouseId,
            u.Warehouse?.Name
        );
    }
}
