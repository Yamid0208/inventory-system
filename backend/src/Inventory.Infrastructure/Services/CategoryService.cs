using FluentValidation;
using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Interfaces;
using Inventory.Application.Features.Categories.DTOs;
using Inventory.Application.Features.Categories.Services;
using Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using ValidationException = Inventory.Application.Common.Exceptions.ValidationException;

namespace Inventory.Infrastructure.Services;

public class CategoryService : ICategoryService
{
    private readonly IApplicationDbContext _context;
    private readonly IValidator<CreateCategoryRequest> _createValidator;
    private readonly IValidator<UpdateCategoryRequest> _updateValidator;

    public CategoryService(
        IApplicationDbContext context,
        IValidator<CreateCategoryRequest> createValidator,
        IValidator<UpdateCategoryRequest> updateValidator)
    {
        _context = context;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<IReadOnlyList<CategoryDto>> GetAllAsync(
        string? search = null,
        bool? isActive = null,
        int? warehouseId = null,
        IReadOnlyList<int>? allowedWarehouseIds = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Categories.AsNoTracking();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(c => c.WarehouseId == warehouseId.Value);
        }
        else if (allowedWarehouseIds != null)
        {
            query = query.Where(c => c.WarehouseId.HasValue && allowedWarehouseIds.Contains(c.WarehouseId.Value));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(term) ||
                                     (c.Description != null && c.Description.ToLower().Contains(term)));
        }

        if (isActive.HasValue)
        {
            query = query.Where(c => c.IsActive == isActive.Value);
        }

        return await query
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                IsActive = c.IsActive,
                ProductCount = c.Products.Count(p => !p.IsDeleted),
                TotalStock = c.Products.Where(p => !p.IsDeleted).Sum(p => (int?)p.CurrentStock) ?? 0,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                WarehouseId = c.WarehouseId
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<CategoryDto> GetByIdAsync(int id, int? warehouseId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Categories
            .AsNoTracking()
            .Where(c => c.Id == id);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(c => c.WarehouseId == warehouseId.Value);
        }

        var category = await query
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                IsActive = c.IsActive,
                ProductCount = c.Products.Count(p => !p.IsDeleted),
                TotalStock = c.Products.Where(p => !p.IsDeleted).Sum(p => (int?)p.CurrentStock) ?? 0,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                WarehouseId = c.WarehouseId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (category == null)
        {
            throw new NotFoundException("Categoría", id);
        }

        return category;
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var validationResult = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        // Comprobación de unicidad de nombre dentro del mismo almacén
        var normalizedName = request.Name.Trim().ToLower();
        var existsDuplicate = await _context.Categories
            .AnyAsync(c => c.WarehouseId == request.WarehouseId && c.Name.ToLower() == normalizedName, cancellationToken);

        if (existsDuplicate)
        {
            throw new ConflictException($"Ya existe una categoría registrada con el nombre '{request.Name.Trim()}'.");
        }

        var category = new Category(request.Name, request.Description);
        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            category.AssignWarehouse(request.WarehouseId.Value);
        }

        _context.Categories.Add(category);
        await _context.SaveChangesAsync(cancellationToken);

        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            IsActive = category.IsActive,
            ProductCount = 0,
            TotalStock = 0,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt,
            WarehouseId = category.WarehouseId
        };
    }

    public async Task<CategoryDto> UpdateAsync(int id, UpdateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var validationResult = await _updateValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var category = await _context.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (category == null)
        {
            throw new NotFoundException("Categoría", id);
        }

        // Comprobación de unicidad de nombre excluyendo la categoría actual dentro del mismo almacén
        var normalizedName = request.Name.Trim().ToLower();
        var existsDuplicate = await _context.Categories
            .AnyAsync(c => c.Id != id && c.WarehouseId == category.WarehouseId && c.Name.ToLower() == normalizedName, cancellationToken);

        if (existsDuplicate)
        {
            throw new ConflictException($"Ya existe otra categoría registrada con el nombre '{request.Name.Trim()}'.");
        }

        category.Update(request.Name, request.Description);
        await _context.SaveChangesAsync(cancellationToken);

        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            IsActive = category.IsActive,
            ProductCount = category.Products.Count(p => !p.IsDeleted),
            TotalStock = category.Products.Where(p => !p.IsDeleted).Sum(p => p.CurrentStock),
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt,
            WarehouseId = category.WarehouseId
        };
    }

    public async Task<CategoryDto> ToggleStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var category = await _context.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (category == null)
        {
            throw new NotFoundException("Categoría", id);
        }

        if (isActive)
        {
            category.Activate();
        }
        else
        {
            category.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            IsActive = category.IsActive,
            ProductCount = category.Products.Count(p => !p.IsDeleted),
            TotalStock = category.Products.Where(p => !p.IsDeleted).Sum(p => p.CurrentStock),
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        };
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (category == null)
        {
            throw new NotFoundException("Categoría", id);
        }

        // RN-005: Integridad de Categorías (No permitir eliminar si tiene al menos un producto asociado, incluso con stock 0)
        var associatedProductsCount = await _context.Products
            .CountAsync(p => p.CategoryId == id && !p.IsDeleted, cancellationToken);

        if (associatedProductsCount > 0)
        {
            var totalStock = await _context.Products
                .Where(p => p.CategoryId == id && !p.IsDeleted)
                .SumAsync(p => p.CurrentStock, cancellationToken);

            var stockDetail = totalStock > 0 ? $" con un total de {totalStock} unidades en existencias" : " (incluso con stock en 0)";

            throw new BusinessRuleViolationException(
                "RN-005",
                $"No es posible eliminar la categoría '{category.Name}' porque tiene {associatedProductsCount} producto(s) asociado(s) en el catálogo{stockDetail}. No se permite eliminar categorías con productos asociados; debe reasignar o dar de baja los productos primero.");
        }

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
