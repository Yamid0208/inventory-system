using Inventory.Application.Features.Alerts.DTOs;
using Inventory.Application.Features.Alerts.Services;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class AlertService : IAlertService
{
    private readonly ApplicationDbContext _context;

    public AlertService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<StockAlertDto>> GetStockAlertsAsync(
        StockAlertFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .Where(p => p.IsActive && p.CurrentStock <= p.MinimumStock);

        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == request.WarehouseId.Value);
        }

        if (request.CategoryId.HasValue)
        {
            query = query.Where(p => p.CategoryId == request.CategoryId.Value);
        }

        if (request.SupplierId.HasValue)
        {
            query = query.Where(p => p.SupplierId == request.SupplierId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(p =>
                p.Sku.ToLower().Contains(search) ||
                p.Name.ToLower().Contains(search) ||
                p.Supplier.Name.ToLower().Contains(search));
        }

        var products = await query.ToListAsync(cancellationToken);

        var alerts = products.Select(p =>
        {
            var deficit = Math.Max(0, p.MinimumStock - p.CurrentStock);
            // Reabastecimiento sugerido: llevar al doble del stock mínimo para amortiguar la demanda
            var suggestedQty = Math.Max(p.MinimumStock, (p.MinimumStock * 2) - p.CurrentStock);
            var estimatedCost = decimal.Round(suggestedQty * p.PurchasePrice, 2, MidpointRounding.AwayFromZero);
            var severity = p.CurrentStock <= 0 ? "Critical" : "Warning";

            return new StockAlertDto(
                p.Id,
                p.Sku,
                p.Name,
                p.CurrentStock,
                p.MinimumStock,
                deficit,
                suggestedQty,
                p.PurchasePrice,
                estimatedCost,
                severity,
                p.Category?.Name ?? "General",
                p.SupplierId,
                p.Supplier?.Name ?? "Sin Proveedor",
                p.Supplier?.Email
            );
        });

        if (!string.IsNullOrWhiteSpace(request.Severity) && request.Severity.ToLower() != "all")
        {
            var target = request.Severity.Trim().ToLower();
            if (target == "critical")
            {
                alerts = alerts.Where(a => a.Severity == "Critical");
            }
            else if (target == "warning")
            {
                alerts = alerts.Where(a => a.Severity == "Warning");
            }
        }

        return alerts
            .OrderBy(a => a.Severity == "Critical" ? 0 : 1)
            .ThenBy(a => a.CurrentStock)
            .ThenByDescending(a => a.Deficit)
            .ToList();
    }

    public async Task<StockAlertSummaryDto> GetAlertsSummaryAsync(
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Products
            .AsNoTracking()
            .Where(p => p.IsActive && p.CurrentStock <= p.MinimumStock);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == warehouseId.Value);
        }

        var criticalProducts = await query
            .Select(p => new
            {
                p.CurrentStock,
                p.MinimumStock,
                p.PurchasePrice
            })
            .ToListAsync(cancellationToken);

        var totalAlerts = criticalProducts.Count;
        var criticalCount = criticalProducts.Count(p => p.CurrentStock <= 0);
        var warningCount = criticalProducts.Count(p => p.CurrentStock > 0);

        var totalCost = criticalProducts.Sum(p =>
        {
            var suggestedQty = Math.Max(p.MinimumStock, (p.MinimumStock * 2) - p.CurrentStock);
            return suggestedQty * p.PurchasePrice;
        });

        var roundedCost = decimal.Round(totalCost, 2, MidpointRounding.AwayFromZero);

        return new StockAlertSummaryDto(totalAlerts, criticalCount, warningCount, roundedCost);
    }
}
