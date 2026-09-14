using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Interfaces;
using Inventory.Application.Features.Warehouses.DTOs;
using Inventory.Application.Features.Warehouses.Services;
using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class WarehouseService : IWarehouseService
{
    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public WarehouseService(ApplicationDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<IReadOnlyList<WarehouseDto>> GetWarehousesAsync(CancellationToken cancellationToken = default)
    {
        var warehouses = await _context.Warehouses
            .AsNoTracking()
            .Include(w => w.AdminUser)
            .Include(w => w.Employees)
            .OrderBy(w => w.Name)
            .ToListAsync(cancellationToken);

        return warehouses.Select(MapToDto).ToList();
    }

    public async Task<WarehouseDto> GetWarehouseByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var warehouse = await _context.Warehouses
            .AsNoTracking()
            .Include(w => w.AdminUser)
            .Include(w => w.Employees)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (warehouse == null)
        {
            throw new NotFoundException(nameof(Warehouse), id);
        }

        return MapToDto(warehouse);
    }

    public async Task<WarehouseDto?> GetWarehouseByAdminUserIdAsync(int adminUserId, CancellationToken cancellationToken = default)
    {
        var warehouse = await _context.Warehouses
            .AsNoTracking()
            .Include(w => w.AdminUser)
            .Include(w => w.Employees)
            .FirstOrDefaultAsync(w => w.AdminUserId == adminUserId, cancellationToken);

        return warehouse == null ? null : MapToDto(warehouse);
    }

    public async Task<WarehouseDto> CreateWarehouseAsync(CreateWarehouseRequest request, CancellationToken cancellationToken = default)
    {
        var codeNormalized = request.Code.Trim().ToUpperInvariant();
        if (await _context.Warehouses.AnyAsync(w => w.Code == codeNormalized, cancellationToken))
        {
            throw new ConflictException($"Ya existe un almacén registrado con el código '{request.Code}'.");
        }

        var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.AdminUserId, cancellationToken);
        if (adminUser == null)
        {
            throw new NotFoundException(nameof(User), request.AdminUserId);
        }

        var warehouse = new Warehouse(
            request.Name,
            request.Code,
            request.AdminUserId,
            request.Address,
            request.City,
            request.Phone
        );

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync(cancellationToken);

        // Asignar el warehouse al usuario administrador
        adminUser.AssignWarehouse(warehouse.Id);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(warehouse, adminUser.FullName, adminUser.Email);
    }

    public async Task<WarehouseDto> CreateAdminWithWarehouseAsync(CreateAdminWithWarehouseRequest request, CancellationToken cancellationToken = default)
    {
        var emailNormalized = request.AdminEmail.Trim().ToLowerInvariant();
        if (await _context.Users.AnyAsync(u => u.Email == emailNormalized, cancellationToken))
        {
            throw new ConflictException($"Ya existe un usuario registrado con el correo '{request.AdminEmail}'.");
        }

        var codeNormalized = request.WarehouseCode.Trim().ToUpperInvariant();
        if (await _context.Warehouses.AnyAsync(w => w.Code == codeNormalized, cancellationToken))
        {
            throw new ConflictException($"Ya existe un almacén registrado con el código '{request.WarehouseCode}'.");
        }

        // 1. Crear el usuario administrador (cliente)
        var passwordHash = _passwordHasher.Hash(request.AdminPassword);
        var adminUser = new User(
            request.AdminFullName,
            request.AdminEmail,
            passwordHash,
            UserRole.Admin
        );

        _context.Users.Add(adminUser);
        await _context.SaveChangesAsync(cancellationToken);

        // 2. Crear el almacén asignado a este admin
        var warehouse = new Warehouse(
            request.WarehouseName,
            request.WarehouseCode,
            adminUser.Id,
            request.WarehouseAddress,
            request.WarehouseCity,
            request.WarehousePhone
        );

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync(cancellationToken);

        // 3. Vincular el almacén al admin
        adminUser.AssignWarehouse(warehouse.Id);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(warehouse, adminUser.FullName, adminUser.Email);
    }

    public async Task<WarehouseDto> UpdateWarehouseAsync(int id, UpdateWarehouseRequest request, CancellationToken cancellationToken = default)
    {
        var warehouse = await _context.Warehouses
            .Include(w => w.AdminUser)
            .Include(w => w.Employees)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (warehouse == null)
        {
            throw new NotFoundException(nameof(Warehouse), id);
        }

        var codeNormalized = request.Code.Trim().ToUpperInvariant();
        if (await _context.Warehouses.AnyAsync(w => w.Code == codeNormalized && w.Id != id, cancellationToken))
        {
            throw new ConflictException($"Ya existe otro almacén con el código '{request.Code}'.");
        }

        warehouse.Update(request.Name, request.Code, request.Address, request.City, request.Phone);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToDto(warehouse);
    }

    public async Task<WarehouseDto> ToggleStatusAsync(int id, CancellationToken cancellationToken = default)
    {
        var warehouse = await _context.Warehouses
            .Include(w => w.AdminUser)
            .Include(w => w.Employees)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (warehouse == null)
        {
            throw new NotFoundException(nameof(Warehouse), id);
        }

        if (warehouse.IsActive)
        {
            warehouse.Deactivate();
        }
        else
        {
            warehouse.Activate();
        }

        await _context.SaveChangesAsync(cancellationToken);
        return MapToDto(warehouse);
    }

    private static WarehouseDto MapToDto(Warehouse w)
    {
        return new WarehouseDto(
            w.Id,
            w.Name,
            w.Code,
            w.Address,
            w.City,
            w.Phone,
            w.AdminUserId,
            w.AdminUser?.FullName ?? "N/A",
            w.AdminUser?.Email ?? "N/A",
            w.IsActive,
            w.Employees.Count,
            w.CreatedAt
        );
    }

    private static WarehouseDto MapToDto(Warehouse w, string adminName, string adminEmail)
    {
        return new WarehouseDto(
            w.Id,
            w.Name,
            w.Code,
            w.Address,
            w.City,
            w.Phone,
            w.AdminUserId,
            adminName,
            adminEmail,
            w.IsActive,
            0,
            w.CreatedAt
        );
    }
}
