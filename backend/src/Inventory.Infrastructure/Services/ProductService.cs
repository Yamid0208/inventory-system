using FluentValidation;
using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Interfaces;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Products.DTOs;
using Inventory.Application.Features.Products.Services;
using Inventory.Domain.Entities;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ValidationException = Inventory.Application.Common.Exceptions.ValidationException;

namespace Inventory.Infrastructure.Services;

public class ProductService : IProductService
{
    private readonly ApplicationDbContext _context;
    private readonly IFileStorageService _fileStorageService;
    private readonly IValidator<CreateProductRequest> _createValidator;
    private readonly IValidator<UpdateProductRequest> _updateValidator;
    private readonly ILogger<ProductService> _logger;

    public ProductService(
        ApplicationDbContext context,
        IFileStorageService fileStorageService,
        IValidator<CreateProductRequest> createValidator,
        IValidator<UpdateProductRequest> updateValidator,
        ILogger<ProductService> logger)
    {
        _context = context;
        _fileStorageService = fileStorageService;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _logger = logger;
    }


    public async Task<PagedResult<ProductDto>> GetProductsAsync(ProductListRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .AsQueryable();

        // Filtro por texto de búsqueda (SKU o Nombre)
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(search) || p.Sku.ToLower().Contains(search));
        }

        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == request.WarehouseId.Value);
        }
        else if (request.AllowedWarehouseIds != null)
        {
            query = query.Where(p => p.WarehouseId.HasValue && request.AllowedWarehouseIds.Contains(p.WarehouseId.Value));
        }

        // Filtro por Categoría
        if (request.CategoryId.HasValue && request.CategoryId.Value > 0)
        {
            query = query.Where(p => p.CategoryId == request.CategoryId.Value);
        }

        // Filtro por Proveedor
        if (request.SupplierId.HasValue && request.SupplierId.Value > 0)
        {
            query = query.Where(p => p.SupplierId == request.SupplierId.Value);
        }

        // Filtro por Estado Activo / Inactivo
        if (request.IsActive.HasValue)
        {
            query = query.Where(p => p.IsActive == request.IsActive.Value);
        }

        // Filtro por Estado de Stock (RN-004)
        if (!string.IsNullOrWhiteSpace(request.StockStatus) && request.StockStatus.ToLowerInvariant() != "all")
        {
            var status = request.StockStatus.ToLowerInvariant();
            query = status switch
            {
                "in_stock" => query.Where(p => p.CurrentStock > p.MinimumStock),
                "low_stock" => query.Where(p => p.CurrentStock <= p.MinimumStock && p.CurrentStock > 0),
                "out_of_stock" => query.Where(p => p.CurrentStock == 0),
                _ => query
            };
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = await query
            .OrderBy(p => p.Name)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = items.Select(MapToDto).ToList();

        return new PagedResult<ProductDto>(dtos, totalCount, pageNumber, pageSize);
    }

    public async Task<ProductDto> GetProductByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"El producto con ID {id} no fue encontrado.");
        }

        return MapToDto(product);
    }

    public async Task<ProductDto> GetProductBySkuAsync(string sku, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(sku))
        {
            throw new ArgumentException("El código SKU es obligatorio.", nameof(sku));
        }

        var normalizedSku = sku.Trim().ToUpperInvariant();
        var product = await _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Sku == normalizedSku, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"El producto con SKU '{sku}' no fue encontrado.");
        }

        return MapToDto(product);
    }

    public async Task<ProductDto> CreateProductAsync(CreateProductRequest request, CancellationToken cancellationToken = default)
    {
        var validationResult = await _createValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var normalizedSku = request.Sku.Trim().ToUpperInvariant();
        var existsDuplicateSku = await _context.Products
            .AnyAsync(p => p.WarehouseId == request.WarehouseId && p.Sku == normalizedSku, cancellationToken);
        if (existsDuplicateSku)
        {
            throw new ConflictException($"Ya existe otro producto registrado con el SKU '{request.Sku.Trim()}' en este almacén.");
        }

        var product = new Product(
            sku: request.Sku,
            name: request.Name,
            categoryId: request.CategoryId,
            supplierId: request.SupplierId,
            purchasePrice: request.PurchasePrice,
            salePrice: request.SalePrice,
            minimumStock: request.MinimumStock,
            description: request.Description,
            imageUrl: request.ImageUrl,
            warehouseId: request.WarehouseId
        );

        await _context.Products.AddAsync(product, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Producto creado exitosamente con ID {Id} y SKU {Sku}", product.Id, product.Sku);

        // Cargar referencias de navegación
        await _context.Entry(product).Reference(p => p.Category).LoadAsync(cancellationToken);
        await _context.Entry(product).Reference(p => p.Supplier).LoadAsync(cancellationToken);

        return MapToDto(product);
    }

    public async Task<ProductDto> UpdateProductAsync(int id, UpdateProductRequest request, CancellationToken cancellationToken = default)
    {
        var validationResult = await _updateValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"El producto con ID {id} no fue encontrado.");
        }

        // Control de concurrencia optimista mediante RowVersion
        if (!string.IsNullOrWhiteSpace(request.RowVersion))
        {
            try
            {
                var clientRowVersion = Convert.FromBase64String(request.RowVersion);
                _context.Entry(product).Property(p => p.RowVersion).OriginalValue = clientRowVersion;
            }
            catch (FormatException)
            {
                throw new ArgumentException("El token de concurrencia (RowVersion) no tiene un formato Base64 válido.");
            }
        }

        product.Update(
            name: request.Name,
            categoryId: request.CategoryId,
            supplierId: request.SupplierId,
            purchasePrice: request.PurchasePrice,
            salePrice: request.SalePrice,
            minimumStock: request.MinimumStock,
            description: request.Description,
            imageUrl: request.ImageUrl
        );

        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException("El producto fue modificado concurrentemente por otro usuario. Por favor recarga los datos antes de volver a guardar.");
        }

        await _context.Entry(product).Reference(p => p.Category).LoadAsync(cancellationToken);
        await _context.Entry(product).Reference(p => p.Supplier).LoadAsync(cancellationToken);

        _logger.LogInformation("Producto con ID {Id} actualizado exitosamente", product.Id);

        return MapToDto(product);
    }

    public async Task<ProductDto> ToggleStatusAsync(int id, bool isActive, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"El producto con ID {id} no fue encontrado.");
        }

        if (isActive)
        {
            product.Activate();
        }
        else
        {
            product.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Estado del producto con ID {Id} cambiado a IsActive={IsActive}", product.Id, product.IsActive);

        return MapToDto(product);
    }

    public async Task DeleteProductAsync(int id, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException($"El producto con ID {id} no fue encontrado.");
        }

        // RN-007: No se puede eliminar si aún tiene stock remanente
        if (product.CurrentStock > 0)
        {
            _logger.LogWarning("Violación de RN-007 al intentar eliminar producto ID {Id}: posee {Stock} unidades en stock", id, product.CurrentStock);
            throw new BusinessRuleViolationException(
                "RN-007",
                $"No es posible eliminar el producto '{product.Name}' porque cuenta con {product.CurrentStock} unidad(es) física(s) en inventario. Desactiva el producto en su lugar o ajusta el stock a cero.");
        }

        // Baja lógica mediante SoftDelete interceptado por ApplicationDbContext
        _context.Products.Remove(product);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Producto con ID {Id} ('{Name}') eliminado lógicamente (RN-007 satisfecho)", id, product.Name);
    }

    public async Task<string> UploadProductImageAsync(int id, Stream imageStream, string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product == null)
        {
            throw new NotFoundException($"El producto con ID {id} no fue encontrado.");
        }

        // Guardar archivo nuevo
        var savedRelativePath = await _fileStorageService.SaveFileAsync(imageStream, fileName, contentType, cancellationToken);

        // Si ya existía una imagen anterior, borrarla
        if (!string.IsNullOrWhiteSpace(product.ImageUrl))
        {
            await _fileStorageService.DeleteFileAsync(product.ImageUrl, cancellationToken);
        }

        // Actualizar URL de la entidad
        product.Update(
            name: product.Name,
            categoryId: product.CategoryId,
            supplierId: product.SupplierId,
            purchasePrice: product.PurchasePrice,
            salePrice: product.SalePrice,
            minimumStock: product.MinimumStock,
            description: product.Description,
            imageUrl: savedRelativePath
        );

        await _context.SaveChangesAsync(cancellationToken);
        return savedRelativePath;
    }

    private static ProductDto MapToDto(Product product)
    {
        return new ProductDto
        {
            Id = product.Id,
            Sku = product.Sku,
            Name = product.Name,
            Description = product.Description,
            CategoryId = product.CategoryId,
            CategoryName = product.Category?.Name ?? string.Empty,
            SupplierId = product.SupplierId,
            SupplierName = product.Supplier?.Name ?? string.Empty,
            PurchasePrice = product.PurchasePrice,
            SalePrice = product.SalePrice,
            CurrentStock = product.CurrentStock,
            MinimumStock = product.MinimumStock,
            ImageUrl = product.ImageUrl,
            IsActive = product.IsActive,
            StockStatus = ProductDto.CalculateStockStatus(product.CurrentStock, product.MinimumStock),
            RowVersion = product.RowVersion != null ? Convert.ToBase64String(product.RowVersion) : string.Empty,
            CreatedAt = product.CreatedAt,
            UpdatedAt = product.UpdatedAt,
            WarehouseId = product.WarehouseId
        };
    }
}
