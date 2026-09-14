using Microsoft.EntityFrameworkCore;
using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Interfaces;
using Inventory.Application.Features.Products.DTOs;
using Inventory.Application.Features.Products.Services;
using Inventory.Domain.Entities;

namespace Inventory.Infrastructure.Services;

public class BatchService : IBatchService
{
    private readonly IApplicationDbContext _context;

    public BatchService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<ProductBatchDto>> GetBatchesByProductIdAsync(
        int productId,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var prodQuery = _context.Products.AsNoTracking().Where(p => p.Id == productId);
        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            prodQuery = prodQuery.Where(p => p.WarehouseId == warehouseId.Value);
        }

        var productExists = await prodQuery.AnyAsync(cancellationToken);
        if (!productExists)
        {
            throw new NotFoundException($"El producto con ID {productId} no existe o no pertenece a este almacén.");
        }

        var now = DateTimeOffset.UtcNow;

        var batches = await _context.ProductBatches
            .AsNoTracking()
            .Where(b => b.ProductId == productId && b.IsActive)
            .OrderBy(b => b.ExpirationDate)
            .ToListAsync(cancellationToken);

        return batches.Select(b =>
        {
            var days = (int)(b.ExpirationDate.Date - now.Date).TotalDays;
            var status = days < 0 ? "Expired" : (days <= 30 ? "ExpiringSoon" : "Good");

            return new ProductBatchDto(
                b.Id,
                b.ProductId,
                b.BatchNumber,
                b.ManufacturingDate,
                b.ExpirationDate,
                b.InitialQuantity,
                b.CurrentQuantity,
                b.IsActive,
                days,
                status
            );
        }).ToList();
    }

    public async Task<ProductBatchDto> CreateBatchAsync(
        int productId,
        CreateProductBatchRequest request,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var prodQuery = _context.Products.AsNoTracking().Where(p => p.Id == productId);
        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            prodQuery = prodQuery.Where(p => p.WarehouseId == warehouseId.Value);
        }

        var productExists = await prodQuery.AnyAsync(cancellationToken);
        if (!productExists)
        {
            throw new NotFoundException($"El producto con ID {productId} no existe o no pertenece a este almacén.");
        }

        var normalizedNumber = request.BatchNumber.Trim().ToUpperInvariant();

        var exists = await _context.ProductBatches
            .AnyAsync(b => b.ProductId == productId && b.BatchNumber == normalizedNumber, cancellationToken);

        if (exists)
        {
            throw new BusinessRuleViolationException(
                "BATCH-001",
                $"Ya se encuentra registrado el lote '{normalizedNumber}' para este producto.");
        }

        var batch = new ProductBatch(
            productId,
            normalizedNumber,
            request.ExpirationDate,
            request.InitialQuantity,
            request.ManufacturingDate
        );

        _context.ProductBatches.Add(batch);
        await _context.SaveChangesAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var days = (int)(batch.ExpirationDate.Date - now.Date).TotalDays;
        var status = days < 0 ? "Expired" : (days <= 30 ? "ExpiringSoon" : "Good");

        return new ProductBatchDto(
            batch.Id,
            batch.ProductId,
            batch.BatchNumber,
            batch.ManufacturingDate,
            batch.ExpirationDate,
            batch.InitialQuantity,
            batch.CurrentQuantity,
            batch.IsActive,
            days,
            status
        );
    }
}
