using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Purchases.DTOs;
using Inventory.Application.Features.Purchases.Services;
using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class PurchaseService : IPurchaseService
{
    private readonly ApplicationDbContext _context;

    public PurchaseService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<PurchaseDto>> GetPurchasesAsync(
        PurchaseFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Purchases
            .AsNoTracking()
            .Include(p => p.Supplier)
            .Include(p => p.User)
            .Include(p => p.Items)
                .ThenInclude(i => i.Product)
            .AsQueryable();

        if (request.SupplierId.HasValue && request.SupplierId.Value > 0)
        {
            query = query.Where(p => p.SupplierId == request.SupplierId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != "all")
        {
            if (Enum.TryParse<PurchaseStatus>(request.Status, true, out var status))
            {
                query = query.Where(p => p.Status == status);
            }
        }

        if (request.StartDate.HasValue)
        {
            query = query.Where(p => p.PurchaseDate >= request.StartDate.Value);
        }

        if (request.EndDate.HasValue)
        {
            query = query.Where(p => p.PurchaseDate <= request.EndDate.Value);
        }

        if (request.UserId.HasValue && request.UserId.Value > 0)
        {
            query = query.Where(p => p.UserId == request.UserId.Value);
        }

        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == request.WarehouseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(p =>
                p.PurchaseNumber.ToLower().Contains(search) ||
                p.Supplier.Name.ToLower().Contains(search) ||
                p.User.FullName.ToLower().Contains(search) ||
                (p.Notes != null && p.Notes.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var purchases = await query
            .OrderByDescending(p => p.PurchaseDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = purchases.Select(MapToDto).ToList();
        return new PagedResult<PurchaseDto>(dtos, totalCount, pageNumber, pageSize);
    }

    public async Task<PurchaseDto> GetPurchaseByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var purchase = await _context.Purchases
            .AsNoTracking()
            .Include(p => p.Supplier)
            .Include(p => p.User)
            .Include(p => p.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (purchase == null)
        {
            throw new NotFoundException($"La orden de compra con ID {id} no existe o fue eliminada.");
        }

        return MapToDto(purchase);
    }

    public async Task<PurchaseDto> CreatePurchaseAsync(
        CreatePurchaseRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                var supplier = await _context.Suppliers
                    .FirstOrDefaultAsync(s => s.Id == request.SupplierId, cancellationToken);

                if (supplier == null || !supplier.IsActive)
                {
                    throw new NotFoundException($"El proveedor seleccionado no existe o se encuentra inactivo.");
                }

                var purchaseNumber = $"PUR-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
                var purchase = new Purchase(
                    purchaseNumber,
                    request.SupplierId,
                    userId,
                    request.PurchaseDate,
                    request.Notes,
                    request.AutoReceive ? PurchaseStatus.Received : PurchaseStatus.Pending,
                    request.WarehouseId
                );

                var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
                var products = await _context.Products
                    .Where(p => productIds.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id, cancellationToken);

                foreach (var itemReq in request.Items)
                {
                    if (!products.TryGetValue(itemReq.ProductId, out var product) || !product.IsActive)
                    {
                        throw new NotFoundException($"El producto con ID {itemReq.ProductId} no existe o está inactivo.");
                    }

                    var item = new PurchaseItem(product.Id, itemReq.Quantity, itemReq.UnitPrice, itemReq.TaxRate);
                    purchase.AddItem(item);

                    if (request.AutoReceive)
                    {
                        var previousStock = product.CurrentStock;
                        product.UpdateStock(itemReq.Quantity);

                        var movementNumber = $"MOV-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(100, 999)}";
                        var movement = new InventoryMovement(
                            movementNumber,
                            product.Id,
                            MovementType.Purchase,
                            itemReq.Quantity,
                            previousStock,
                            product.CurrentStock,
                            itemReq.UnitPrice,
                            userId,
                            purchase.PurchaseNumber,
                            $"Ingreso por Compra {purchase.PurchaseNumber} ({supplier.Name})",
                            purchase.WarehouseId ?? product.WarehouseId
                        );

                        _context.InventoryMovements.Add(movement);
                    }
                }

                _context.Purchases.Add(purchase);
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                // Recargar con relaciones para DTO limpio
                return await GetPurchaseByIdAsync(purchase.Id, cancellationToken);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        });
    }

    public async Task<PurchaseDto> ReceivePurchaseAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                var purchase = await _context.Purchases
                    .Include(p => p.Supplier)
                    .Include(p => p.Items)
                        .ThenInclude(i => i.Product)
                    .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

                if (purchase == null)
                {
                    throw new NotFoundException($"La compra con ID {id} no existe.");
                }

                purchase.MarkAsReceived();

                foreach (var item in purchase.Items)
                {
                    var product = item.Product;
                    var previousStock = product.CurrentStock;
                    product.UpdateStock(item.Quantity);

                    var movementNumber = $"MOV-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(100, 999)}";
                    var movement = new InventoryMovement(
                        movementNumber,
                        product.Id,
                        MovementType.Purchase,
                        item.Quantity,
                        previousStock,
                        product.CurrentStock,
                        item.UnitPrice,
                        userId,
                        purchase.PurchaseNumber,
                        $"Recepción de Orden {purchase.PurchaseNumber}",
                        purchase.WarehouseId ?? product.WarehouseId
                    );

                    _context.InventoryMovements.Add(movement);
                }

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return await GetPurchaseByIdAsync(purchase.Id, cancellationToken);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        });
    }

    public async Task CancelPurchaseAsync(int id, CancellationToken cancellationToken = default)
    {
        var purchase = await _context.Purchases
            .Include(p => p.Items)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        if (purchase == null)
        {
            throw new NotFoundException($"La compra con ID {id} no existe.");
        }

        if (purchase.Status == PurchaseStatus.Received)
        {
            throw new BusinessRuleViolationException("RN-PUR-01", "No es posible cancelar una orden de compra que ya fue recibida en inventario. Realice un ajuste manual de salida en su lugar.");
        }

        purchase.Cancel();
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static PurchaseDto MapToDto(Purchase p)
    {
        var items = p.Items.Select(i => new PurchaseItemDto(
            i.Id,
            i.ProductId,
            i.Product?.Sku ?? string.Empty,
            i.Product?.Name ?? string.Empty,
            i.Quantity,
            i.UnitPrice,
            i.Subtotal,
            i.Tax,
            i.Total
        )).ToList();

        return new PurchaseDto(
            p.Id,
            p.PurchaseNumber,
            p.SupplierId,
            p.Supplier?.Name ?? string.Empty,
            p.UserId,
            p.User?.FullName ?? "Sistema",
            p.PurchaseDate,
            p.Status.ToString(),
            p.Subtotal,
            p.Tax,
            p.Total,
            p.Notes,
            items,
            p.WarehouseId
        );
    }
}
