using FluentValidation;
using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Interfaces;
using Inventory.Application.Features.Suppliers.DTOs;
using Inventory.Application.Features.Suppliers.Services;
using Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using ValidationException = Inventory.Application.Common.Exceptions.ValidationException;

namespace Inventory.Infrastructure.Services;

public class SupplierService : ISupplierService
{
    private readonly IApplicationDbContext _context;
    private readonly IValidator<CreateSupplierRequest> _createValidator;
    private readonly IValidator<UpdateSupplierRequest> _updateValidator;

    public SupplierService(
        IApplicationDbContext context,
        IValidator<CreateSupplierRequest> createValidator,
        IValidator<UpdateSupplierRequest> updateValidator)
    {
        _context = context;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<IReadOnlyList<SupplierDto>> GetAllAsync(
        string? search = null,
        bool? isActive = null,
        int? warehouseId = null,
        IReadOnlyList<int>? allowedWarehouseIds = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Suppliers.AsNoTracking();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(s => s.WarehouseId == warehouseId.Value);
        }
        else if (allowedWarehouseIds != null)
        {
            query = query.Where(s => s.WarehouseId.HasValue && allowedWarehouseIds.Contains(s.WarehouseId.Value));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s => s.Name.ToLower().Contains(term) ||
                                     s.TaxId.ToLower().Contains(term) ||
                                     (s.ContactName != null && s.ContactName.ToLower().Contains(term)) ||
                                     (s.Email != null && s.Email.ToLower().Contains(term)));
        }

        if (isActive.HasValue)
        {
            query = query.Where(s => s.IsActive == isActive.Value);
        }

        return await query
            .OrderBy(s => s.Name)
            .Select(s => new SupplierDto
            {
                Id = s.Id,
                Name = s.Name,
                TaxId = s.TaxId,
                ContactName = s.ContactName,
                Email = s.Email,
                Phone = s.Phone,
                Address = s.Address,
                IsActive = s.IsActive,
                ProductCount = s.Products.Count(p => !p.IsDeleted),
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt,
                WarehouseId = s.WarehouseId
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<SupplierDto> GetByIdAsync(int id, int? warehouseId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Suppliers
            .AsNoTracking()
            .Where(s => s.Id == id);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(s => s.WarehouseId == warehouseId.Value);
        }

        var supplier = await query
            .Select(s => new SupplierDto
            {
                Id = s.Id,
                Name = s.Name,
                TaxId = s.TaxId,
                ContactName = s.ContactName,
                Email = s.Email,
                Phone = s.Phone,
                Address = s.Address,
                IsActive = s.IsActive,
                ProductCount = s.Products.Count(p => !p.IsDeleted),
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt,
                WarehouseId = s.WarehouseId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (supplier == null)
        {
            throw new NotFoundException("Proveedor", id);
        }

        return supplier;
    }

    public async Task<SupplierDto> CreateAsync(CreateSupplierRequest request, CancellationToken cancellationToken = default)
    {
        var validationResult = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var supplier = new Supplier(
            request.Name,
            request.TaxId,
            request.ContactName,
            request.Email,
            request.Phone,
            request.Address);

        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            supplier.AssignWarehouse(request.WarehouseId.Value);
        }

        _context.Suppliers.Add(supplier);
        await _context.SaveChangesAsync(cancellationToken);

        return new SupplierDto
        {
            Id = supplier.Id,
            Name = supplier.Name,
            TaxId = supplier.TaxId,
            ContactName = supplier.ContactName,
            Email = supplier.Email,
            Phone = supplier.Phone,
            Address = supplier.Address,
            IsActive = supplier.IsActive,
            ProductCount = 0,
            CreatedAt = supplier.CreatedAt,
            UpdatedAt = supplier.UpdatedAt,
            WarehouseId = supplier.WarehouseId
        };
    }

    public async Task<SupplierDto> UpdateAsync(int id, UpdateSupplierRequest request, CancellationToken cancellationToken = default)
    {
        var validationResult = await _updateValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var supplier = await _context.Suppliers
            .Include(s => s.Products)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (supplier == null)
        {
            throw new NotFoundException("Proveedor", id);
        }

        // Comprobación de unicidad de TaxId excluyendo el actual dentro del mismo almacén
        var normalizedTaxId = request.TaxId.Trim().ToUpperInvariant();
        var existsDuplicate = await _context.Suppliers
            .AnyAsync(s => s.Id != id && s.WarehouseId == supplier.WarehouseId && s.TaxId.ToUpper() == normalizedTaxId, cancellationToken);

        if (existsDuplicate)
        {
            throw new ConflictException($"Ya existe otro proveedor registrado con el identificador fiscal '{request.TaxId.Trim()}'.");
        }

        supplier.Update(
            request.Name,
            request.TaxId,
            request.ContactName,
            request.Email,
            request.Phone,
            request.Address);

        await _context.SaveChangesAsync(cancellationToken);

        return new SupplierDto
        {
            Id = supplier.Id,
            Name = supplier.Name,
            TaxId = supplier.TaxId,
            ContactName = supplier.ContactName,
            Email = supplier.Email,
            Phone = supplier.Phone,
            Address = supplier.Address,
            IsActive = supplier.IsActive,
            ProductCount = supplier.Products.Count(p => !p.IsDeleted),
            CreatedAt = supplier.CreatedAt,
            UpdatedAt = supplier.UpdatedAt,
            WarehouseId = supplier.WarehouseId
        };
    }

    public async Task<SupplierDto> ToggleStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var supplier = await _context.Suppliers
            .Include(s => s.Products)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (supplier == null)
        {
            throw new NotFoundException("Proveedor", id);
        }

        if (isActive)
        {
            supplier.Activate();
        }
        else
        {
            supplier.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new SupplierDto
        {
            Id = supplier.Id,
            Name = supplier.Name,
            TaxId = supplier.TaxId,
            ContactName = supplier.ContactName,
            Email = supplier.Email,
            Phone = supplier.Phone,
            Address = supplier.Address,
            IsActive = supplier.IsActive,
            ProductCount = supplier.Products.Count(p => !p.IsDeleted),
            CreatedAt = supplier.CreatedAt,
            UpdatedAt = supplier.UpdatedAt
        };
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var supplier = await _context.Suppliers
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (supplier == null)
        {
            throw new NotFoundException("Proveedor", id);
        }

        // RN-006: Integridad de Proveedores
        var hasProducts = await _context.Products
            .AnyAsync(p => p.SupplierId == id && !p.IsDeleted, cancellationToken);

        if (hasProducts)
        {
            throw new BusinessRuleViolationException(
                "RN-006",
                $"No es posible eliminar el proveedor '{supplier.Name}' porque tiene productos o movimientos vinculados en el catálogo. Desactiva el proveedor en su lugar.");
        }

        _context.Suppliers.Remove(supplier);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
