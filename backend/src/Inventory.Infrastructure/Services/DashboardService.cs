using Inventory.Application.Features.Dashboard.DTOs;
using Inventory.Application.Features.Dashboard.Services;
using Inventory.Domain.Enums;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _context;

    public DashboardService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryDto> GetSummaryAsync(int? userId = null, int? warehouseId = null, IReadOnlyList<int>? allowedWarehouseIds = null, CancellationToken cancellationToken = default)
    {
        // 1. Productos y Valuación de Inventario
        var productsQuery = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Where(p => p.IsActive);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            productsQuery = productsQuery.Where(p => p.WarehouseId == warehouseId.Value);
        }
        else if (allowedWarehouseIds != null && allowedWarehouseIds.Count > 0)
        {
            productsQuery = productsQuery.Where(p => p.WarehouseId.HasValue && allowedWarehouseIds.Contains(p.WarehouseId.Value));
        }

        var products = await productsQuery.ToListAsync(cancellationToken);

        var totalProductsCount = products.Count;
        var totalStockUnits = products.Sum(p => p.CurrentStock);
        var totalValuation = decimal.Round(
            products.Sum(p => p.CurrentStock * p.PurchasePrice),
            2,
            MidpointRounding.AwayFromZero
        );
        var lowStockCount = products.Count(p => p.CurrentStock <= p.MinimumStock && p.CurrentStock > 0);
        var outOfStockCount = products.Count(p => p.CurrentStock == 0);

        // 2. Ventas (filtradas si se solicita usuario o almacén específico)
        var salesQuery = _context.Sales
            .AsNoTracking()
            .Where(s => s.Status == SaleStatus.Completed);

        if (userId.HasValue && userId.Value > 0)
        {
            salesQuery = salesQuery.Where(s => s.UserId == userId.Value);
        }

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            salesQuery = salesQuery.Where(s => s.WarehouseId == warehouseId.Value);
        }
        else if (allowedWarehouseIds != null && allowedWarehouseIds.Count > 0)
        {
            salesQuery = salesQuery.Where(s => s.WarehouseId.HasValue && allowedWarehouseIds.Contains(s.WarehouseId.Value));
        }

        var sales = await salesQuery.ToListAsync(cancellationToken);

        var totalSalesAmount = decimal.Round(
            sales.Sum(s => s.Total),
            2,
            MidpointRounding.AwayFromZero
        );
        var completedSalesCount = sales.Count;

        // 3. Compras (filtradas si se solicita usuario o almacén específico)
        var purchasesQuery = _context.Purchases
            .AsNoTracking()
            .AsQueryable();

        if (userId.HasValue && userId.Value > 0)
        {
            purchasesQuery = purchasesQuery.Where(p => p.UserId == userId.Value);
        }

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            purchasesQuery = purchasesQuery.Where(p => p.WarehouseId == warehouseId.Value);
        }
        else if (allowedWarehouseIds != null && allowedWarehouseIds.Count > 0)
        {
            purchasesQuery = purchasesQuery.Where(p => p.WarehouseId.HasValue && allowedWarehouseIds.Contains(p.WarehouseId.Value));
        }

        var purchases = await purchasesQuery.ToListAsync(cancellationToken);

        var totalPurchasesAmount = decimal.Round(
            purchases.Where(p => p.Status == PurchaseStatus.Received).Sum(p => p.Total),
            2,
            MidpointRounding.AwayFromZero
        );
        var pendingPurchasesCount = purchases.Count(p => p.Status == PurchaseStatus.Pending);

        var kpis = new DashboardKpisDto(
            totalValuation,
            totalStockUnits,
            totalProductsCount,
            lowStockCount,
            outOfStockCount,
            totalSalesAmount,
            completedSalesCount,
            totalPurchasesAmount,
            pendingPurchasesCount
        );

        // 4. Distribución por Categorías
        var categoryGroups = products
            .GroupBy(p => new { p.CategoryId, CategoryName = p.Category?.Name ?? "Sin Categoría" })
            .Select(g =>
            {
                var catStock = g.Sum(p => p.CurrentStock);
                var catValuation = decimal.Round(
                    g.Sum(p => p.CurrentStock * p.PurchasePrice),
                    2,
                    MidpointRounding.AwayFromZero
                );
                var percentage = totalValuation > 0
                    ? Math.Round((double)(catValuation / totalValuation) * 100.0, 1)
                    : 0.0;

                return new CategoryDistributionDto(
                    g.Key.CategoryId,
                    g.Key.CategoryName,
                    g.Count(),
                    catStock,
                    catValuation,
                    percentage
                );
            })
            .OrderByDescending(c => c.TotalValuation)
            .ToList();

        // 5. Movimientos Recientes de Kardex
        var movementsQuery = _context.InventoryMovements
            .AsNoTracking()
            .Include(m => m.Product)
            .Include(m => m.User)
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            movementsQuery = movementsQuery.Where(m => m.WarehouseId == warehouseId.Value ||
                                                       (m.WarehouseId == null && m.Product != null && m.Product.WarehouseId == warehouseId.Value));
        }
        else if (allowedWarehouseIds != null && allowedWarehouseIds.Count > 0)
        {
            movementsQuery = movementsQuery.Where(m => (m.WarehouseId.HasValue && allowedWarehouseIds.Contains(m.WarehouseId.Value)) ||
                                                       (m.WarehouseId == null && m.Product != null && m.Product.WarehouseId.HasValue && allowedWarehouseIds.Contains(m.Product.WarehouseId.Value)));
        }

        var movements = await movementsQuery
            .OrderByDescending(m => m.CreatedAt)
            .Take(5)
            .ToListAsync(cancellationToken);

        var recentMovements = movements.Select(m => new RecentMovementSummaryDto(
            m.MovementNumber,
            m.Product?.Sku ?? string.Empty,
            m.Product?.Name ?? string.Empty,
            m.Type.ToString(),
            m.QuantityDelta,
            m.User?.FullName ?? "Sistema",
            m.CreatedAt
        )).ToList();

        // 6. Productos en Stock Crítico
        var criticalProducts = products
            .Where(p => p.CurrentStock <= p.MinimumStock)
            .OrderBy(p => p.CurrentStock)
            .Take(6)
            .Select(p => new CriticalStockItemDto(
                p.Id,
                p.Sku,
                p.Name,
                p.CurrentStock,
                p.MinimumStock,
                p.Category?.Name ?? "General",
                p.CurrentStock == 0 ? "Agotado" : "Bajo Stock"
            ))
            .ToList();

        return new DashboardSummaryDto(kpis, categoryGroups, recentMovements, criticalProducts);
    }
}
