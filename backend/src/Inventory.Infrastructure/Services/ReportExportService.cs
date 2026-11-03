using System.Globalization;
using System.Text;
using Inventory.Application.Features.Reports.DTOs;
using Inventory.Application.Features.Reports.Services;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class ReportExportService : IReportExportService
{
    private readonly ApplicationDbContext _context;

    public ReportExportService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<byte[]> ExportProductsCsvAsync(int? warehouseId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .Where(p => !p.IsDeleted);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == warehouseId.Value);
        }

        var products = await query
            .OrderBy(p => p.Name)
            .ToListAsync(cancellationToken);

        var sb = new StringBuilder();
        // Encabezado CSV
        sb.AppendLine("SKU,Nombre,Categoría,Proveedor,Precio Compra,Precio Venta,Stock Actual,Stock Mínimo,Valuación Total,Estado");

        foreach (var p in products)
        {
            var valuation = p.CurrentStock * p.PurchasePrice;
            var status = p.CurrentStock == 0 ? "Agotado" : (p.CurrentStock <= p.MinimumStock ? "Bajo Stock" : "Saludable");

            sb.AppendLine(string.Join(",",
                EscapeCsv(p.Sku),
                EscapeCsv(p.Name),
                EscapeCsv(p.Category?.Name ?? "General"),
                EscapeCsv(p.Supplier?.Name ?? "Sin Proveedor"),
                p.PurchasePrice.ToString("F2", CultureInfo.InvariantCulture),
                p.SalePrice.ToString("F2", CultureInfo.InvariantCulture),
                p.CurrentStock.ToString(),
                p.MinimumStock.ToString(),
                valuation.ToString("F2", CultureInfo.InvariantCulture),
                EscapeCsv(status)
            ));
        }

        return ToUtf8BomBytes(sb.ToString());
    }

    public async Task<byte[]> ExportInventoryKardexCsvAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.InventoryMovements
            .AsNoTracking()
            .Include(m => m.Product)
            .Include(m => m.User)
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(m => m.WarehouseId == warehouseId.Value ||
                                     (m.WarehouseId == null && m.Product.WarehouseId == warehouseId.Value));
        }

        if (startDate.HasValue)
        {
            query = query.Where(m => m.CreatedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            var adjustedEndDate = endDate.Value.TimeOfDay == TimeSpan.Zero
                ? endDate.Value.Date.AddDays(1).AddTicks(-1)
                : endDate.Value;
            query = query.Where(m => m.CreatedAt <= adjustedEndDate);
        }

        var movements = await query
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("Número Movimiento,Fecha (UTC),Tipo,SKU,Producto,Cantidad Delta,Stock Previo,Stock Resultante,Operador,Referencia");

        foreach (var m in movements)
        {
            sb.AppendLine(string.Join(",",
                EscapeCsv(m.MovementNumber),
                m.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                EscapeCsv(m.Type.ToString()),
                EscapeCsv(m.Product?.Sku ?? "N/A"),
                EscapeCsv(m.Product?.Name ?? "N/A"),
                m.QuantityDelta.ToString(),
                m.PreviousStock.ToString(),
                m.NewStock.ToString(),
                EscapeCsv(m.User?.FullName ?? "Sistema"),
                EscapeCsv(m.Reference ?? "")
            ));
        }

        return ToUtf8BomBytes(sb.ToString());
    }

    public async Task<byte[]> ExportSalesCsvAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Sales
            .AsNoTracking()
            .Include(s => s.Items)
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(s => s.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(s => s.CreatedAt >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(s => s.CreatedAt <= adjustedEnd.Value);
        }

        var sales = await query
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("Factura,Fecha (UTC),Cliente,Método Pago,Estado,Subtotal,IVA (19%),Total Facturado,Líneas");

        foreach (var s in sales)
        {
            sb.AppendLine(string.Join(",",
                EscapeCsv(s.SaleNumber),
                s.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                EscapeCsv(s.CustomerName),
                EscapeCsv(s.PaymentMethod.ToString()),
                EscapeCsv(s.Status.ToString()),
                s.Subtotal.ToString("F2", CultureInfo.InvariantCulture),
                s.Tax.ToString("F2", CultureInfo.InvariantCulture),
                s.Total.ToString("F2", CultureInfo.InvariantCulture),
                s.Items.Count.ToString()
            ));
        }

        return ToUtf8BomBytes(sb.ToString());
    }

    public async Task<byte[]> ExportPurchasesCsvAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Purchases
            .AsNoTracking()
            .Include(p => p.Supplier)
            .Include(p => p.Items)
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(p => p.CreatedAt >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(p => p.CreatedAt <= adjustedEnd.Value);
        }

        var purchases = await query
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("Orden Compra,Fecha (UTC),Proveedor,Estado,Subtotal,IVA (19%),Total,Recibido En");

        foreach (var p in purchases)
        {
            var receivedInfo = p.Status == Inventory.Domain.Enums.PurchaseStatus.Received
                ? (p.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture) ?? "Recibido")
                : "Pendiente";

            sb.AppendLine(string.Join(",",
                EscapeCsv(p.PurchaseNumber),
                p.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                EscapeCsv(p.Supplier?.Name ?? "N/A"),
                EscapeCsv(p.Status.ToString()),
                p.Subtotal.ToString("F2", CultureInfo.InvariantCulture),
                p.Tax.ToString("F2", CultureInfo.InvariantCulture),
                p.Total.ToString("F2", CultureInfo.InvariantCulture),
                EscapeCsv(receivedInfo)
            ));
        }

        return ToUtf8BomBytes(sb.ToString());
    }

    public async Task<ReportsCatalogSummaryDto> GetCatalogSummaryAsync(int? warehouseId = null, CancellationToken cancellationToken = default)
    {
        var prodQuery = _context.Products.Where(p => !p.IsDeleted);
        var movQuery = _context.InventoryMovements.AsQueryable();
        var saleQuery = _context.Sales.AsQueryable();
        var purQuery = _context.Purchases.AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            prodQuery = prodQuery.Where(p => p.WarehouseId == warehouseId.Value);
            movQuery = movQuery.Where(m => m.WarehouseId == warehouseId.Value);
            saleQuery = saleQuery.Where(s => s.WarehouseId == warehouseId.Value);
            purQuery = purQuery.Where(p => p.WarehouseId == warehouseId.Value);
        }

        var productsCount = await prodQuery.CountAsync(cancellationToken);
        var movementsCount = await movQuery.CountAsync(cancellationToken);
        var salesCount = await saleQuery.CountAsync(cancellationToken);
        var purchasesCount = await purQuery.CountAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;

        var reports = new List<ReportMetadataDto>
        {
            new("products", "Catálogo de Productos", "Inventario físico, precios y valuación patrimonial.", "box", productsCount, now),
            new("inventory", "Kardex y Trazabilidad", "Registro inmutable de movimientos, entradas, salidas y ajustes.", "clipboard", movementsCount, now),
            new("sales", "Ventas y Facturación", "Historial consolidado de ventas, clientes, IVA y recaudación.", "credit-card", salesCount, now),
            new("purchases", "Compras y Proveedores", "Seguimiento de compras, abastecimiento y recepción en bodega.", "shopping-bag", purchasesCount, now)
        };

        var totalRecords = productsCount + movementsCount + salesCount + purchasesCount;
        return new ReportsCatalogSummaryDto(reports, totalRecords);
    }

    public async Task<PagedReportResultDto<ProductReportItemDto>> GetProductsDataAsync(
        int? warehouseId = null,
        string? searchTerm = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .Where(p => !p.IsDeleted);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == warehouseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(term) || p.Sku.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var totalValuation = await query.SumAsync(p => p.CurrentStock * p.PurchasePrice, cancellationToken);

        var items = await query
            .OrderBy(p => p.Name)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProductReportItemDto(
                p.Id,
                p.Sku,
                p.Name,
                p.Category != null ? p.Category.Name : "General",
                p.Supplier != null ? p.Supplier.Name : "Sin Proveedor",
                p.PurchasePrice,
                p.SalePrice,
                p.CurrentStock,
                p.MinimumStock,
                p.CurrentStock * p.PurchasePrice,
                p.CurrentStock == 0 ? "Agotado" : (p.CurrentStock <= p.MinimumStock ? "Bajo Stock" : "Saludable"),
                p.IsActive,
                p.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedReportResultDto<ProductReportItemDto>(
            items,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            totalValuation,
            null
        );
    }

    public async Task<PagedReportResultDto<InventoryKardexReportItemDto>> GetInventoryKardexDataAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.InventoryMovements
            .AsNoTracking()
            .Include(m => m.Product)
            .Include(m => m.User)
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(m => m.WarehouseId == warehouseId.Value ||
                                     (m.WarehouseId == null && m.Product.WarehouseId == warehouseId.Value));
        }

        if (startDate.HasValue)
        {
            query = query.Where(m => m.CreatedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            var adjustedEndDate = endDate.Value.TimeOfDay == TimeSpan.Zero
                ? endDate.Value.Date.AddDays(1).AddTicks(-1)
                : endDate.Value;
            query = query.Where(m => m.CreatedAt <= adjustedEndDate);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new InventoryKardexReportItemDto(
                m.Id,
                m.MovementNumber,
                m.CreatedAt,
                m.Type.ToString(),
                m.ProductId,
                m.Product != null ? m.Product.Sku : "N/A",
                m.Product != null ? m.Product.Name : "N/A",
                m.QuantityDelta,
                m.PreviousStock,
                m.NewStock,
                m.UnitPrice,
                m.User != null ? m.User.FullName : "Sistema",
                m.Reference,
                m.Notes
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedReportResultDto<InventoryKardexReportItemDto>(
            items,
            totalCount,
            pageNumber,
            pageSize,
            totalPages
        );
    }

    public async Task<PagedReportResultDto<SalesReportItemDto>> GetSalesDataAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Sales
            .AsNoTracking()
            .Include(s => s.Items)
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(s => s.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(s => s.CreatedAt >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(s => s.CreatedAt <= adjustedEnd.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var totalAmount = await query.SumAsync(s => s.Total, cancellationToken);

        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SalesReportItemDto(
                s.Id,
                s.SaleNumber,
                s.SaleDate,
                s.CreatedAt,
                s.CustomerName,
                s.CustomerTaxId,
                s.PaymentMethod.ToString(),
                s.Status.ToString(),
                s.Subtotal,
                s.Tax,
                s.Total,
                s.Items.Count
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedReportResultDto<SalesReportItemDto>(
            items,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            totalAmount,
            totalCount
        );
    }

    public async Task<PagedReportResultDto<PurchasesReportItemDto>> GetPurchasesDataAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Purchases
            .AsNoTracking()
            .Include(p => p.Supplier)
            .Include(p => p.Items)
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(p => p.CreatedAt >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(p => p.CreatedAt <= adjustedEnd.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var totalAmount = await query.SumAsync(p => p.Total, cancellationToken);

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new PurchasesReportItemDto(
                p.Id,
                p.PurchaseNumber,
                p.PurchaseDate,
                p.CreatedAt,
                p.Supplier != null ? p.Supplier.Name : "N/A",
                p.Status.ToString(),
                p.Subtotal,
                p.Tax,
                p.Total,
                p.Items.Count
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedReportResultDto<PurchasesReportItemDto>(
            items,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            totalAmount,
            totalCount
        );
    }

    public async Task<PagedReportResultDto<LowStockReportItemDto>> GetLowStockDataAsync(
        int? warehouseId = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Supplier)
            .Where(p => !p.IsDeleted && p.CurrentStock <= p.MinimumStock);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == warehouseId.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var estimatedRestockCost = await query.SumAsync(
            p => (p.MinimumStock > p.CurrentStock ? (p.MinimumStock - p.CurrentStock) : 1) * p.PurchasePrice,
            cancellationToken);

        var items = await query
            .OrderBy(p => p.CurrentStock)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new LowStockReportItemDto(
                p.Id,
                p.Sku,
                p.Name,
                p.Category != null ? p.Category.Name : "General",
                p.Supplier != null ? p.Supplier.Name : "Sin Proveedor",
                p.CurrentStock,
                p.MinimumStock,
                Math.Max(0, p.MinimumStock - p.CurrentStock),
                p.PurchasePrice,
                (p.MinimumStock > p.CurrentStock ? (p.MinimumStock - p.CurrentStock) : 1) * p.PurchasePrice,
                p.CurrentStock == 0 ? "Agotado" : "Bajo Stock"
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedReportResultDto<LowStockReportItemDto>(
            items,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            estimatedRestockCost,
            totalCount
        );
    }

    public async Task<SalesSummaryMetricsDto> GetSalesSummaryMetricsAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Sales
            .AsNoTracking()
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(s => s.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(s => s.CreatedAt >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(s => s.CreatedAt <= adjustedEnd.Value);
        }

        var totalTransactions = await query.CountAsync(cancellationToken);
        if (totalTransactions == 0)
        {
            return new SalesSummaryMetricsDto(0, 0, 0, 0, 0, Array.Empty<PaymentMethodBreakdownDto>());
        }

        var totalSales = await query.SumAsync(s => s.Total, cancellationToken);
        var totalSubtotal = await query.SumAsync(s => s.Subtotal, cancellationToken);
        var totalTax = await query.SumAsync(s => s.Tax, cancellationToken);
        var averageTicket = totalTransactions > 0 ? decimal.Round(totalSales / totalTransactions, 2) : 0;

        var methodGroups = await query
            .GroupBy(s => s.PaymentMethod)
            .Select(g => new
            {
                Method = g.Key.ToString(),
                TotalAmount = g.Sum(s => s.Total),
                Count = g.Count()
            })
            .ToListAsync(cancellationToken);

        var paymentMethods = methodGroups.Select(m => new PaymentMethodBreakdownDto(
            m.Method,
            m.TotalAmount,
            m.Count,
            totalSales > 0 ? decimal.Round((m.TotalAmount / totalSales) * 100, 1) : 0
        )).ToList();

        return new SalesSummaryMetricsDto(
            totalSales,
            totalTransactions,
            averageTicket,
            totalSubtotal,
            totalTax,
            paymentMethods
        );
    }

    public async Task<IReadOnlyList<TopProductReportDto>> GetTopProductsAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        int top = 10,
        bool ascending = false,
        CancellationToken cancellationToken = default)
    {
        top = Math.Clamp(top, 1, 100);

        var query = _context.SaleItems
            .AsNoTracking()
            .Include(i => i.Sale)
            .Include(i => i.Product)
                .ThenInclude(p => p.Category)
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(i => i.Sale.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(i => i.Sale.CreatedAt >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(i => i.Sale.CreatedAt <= adjustedEnd.Value);
        }

        var groupedQuery = query
            .GroupBy(i => new
            {
                i.ProductId,
                Sku = i.Product.Sku,
                Name = i.Product.Name,
                CategoryName = i.Product.Category != null ? i.Product.Category.Name : "General"
            })
            .Select(g => new
            {
                g.Key.ProductId,
                g.Key.Sku,
                g.Key.Name,
                g.Key.CategoryName,
                UnitsSold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.Total)
            });

        groupedQuery = ascending
            ? groupedQuery.OrderBy(x => x.TotalRevenue).ThenBy(x => x.UnitsSold)
            : groupedQuery.OrderByDescending(x => x.TotalRevenue).ThenByDescending(x => x.UnitsSold);

        var topResults = await groupedQuery.Take(top).ToListAsync(cancellationToken);

        return topResults.Select(r => new TopProductReportDto(
            r.ProductId,
            r.Sku,
            r.Name,
            r.CategoryName,
            r.UnitsSold,
            r.TotalRevenue,
            r.UnitsSold > 0 ? decimal.Round(r.TotalRevenue / r.UnitsSold, 2) : 0
        )).ToList();
    }

    public async Task<ProfitabilitySummaryDto> GetProfitabilityReportAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.SaleItems
            .AsNoTracking()
            .Include(i => i.Sale)
            .Include(i => i.Product)
                .ThenInclude(p => p.Category)
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(i => i.Sale.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(i => i.Sale.CreatedAt >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(i => i.Sale.CreatedAt <= adjustedEnd.Value);
        }

        var globalRevenue = await query.SumAsync(i => i.Total, cancellationToken);
        var globalCogs = await query.SumAsync(i => i.Quantity * i.Product.PurchasePrice, cancellationToken);
        var globalGrossProfit = globalRevenue - globalCogs;
        var globalMargin = globalRevenue > 0 ? decimal.Round((globalGrossProfit / globalRevenue) * 100, 1) : 0;
        var totalItemsCount = await query.SumAsync(i => i.Quantity, cancellationToken);

        var grouped = query
            .GroupBy(i => new
            {
                i.ProductId,
                Sku = i.Product.Sku,
                Name = i.Product.Name,
                CategoryName = i.Product.Category != null ? i.Product.Category.Name : "General",
                Cost = i.Product.PurchasePrice
            })
            .Select(g => new
            {
                g.Key.ProductId,
                g.Key.Sku,
                g.Key.Name,
                g.Key.CategoryName,
                UnitsSold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.Total),
                TotalCost = g.Sum(x => x.Quantity * g.Key.Cost)
            });

        var totalCount = await grouped.CountAsync(cancellationToken);

        var pagedList = await grouped
            .OrderByDescending(x => x.TotalRevenue)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = pagedList.Select(r =>
        {
            var profit = r.TotalRevenue - r.TotalCost;
            var margin = r.TotalRevenue > 0 ? decimal.Round((profit / r.TotalRevenue) * 100, 1) : 0;
            return new ProductProfitabilityItemDto(
                r.ProductId,
                r.Sku,
                r.Name,
                r.CategoryName,
                r.UnitsSold,
                r.TotalRevenue,
                r.TotalCost,
                profit,
                margin
            );
        }).ToList();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var pagedResult = new PagedReportResultDto<ProductProfitabilityItemDto>(
            items,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            globalGrossProfit,
            totalItemsCount
        );

        return new ProfitabilitySummaryDto(
            globalRevenue,
            globalCogs,
            globalGrossProfit,
            globalMargin,
            totalItemsCount,
            pagedResult
        );
    }

    public async Task<byte[]> ExportProfitabilityCsvAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await GetProfitabilityReportAsync(startDate, endDate, warehouseId, 1, 10000, cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("SKU,Producto,Categoría,Unidades Vendidas,Ingresos Totales,Costo Mercancía (CMV),Utilidad Bruta,Margen Bruto (%)");

        foreach (var p in result.ProductDetails.Items)
        {
            sb.AppendLine(string.Join(",",
                EscapeCsv(p.Sku),
                EscapeCsv(p.ProductName),
                EscapeCsv(p.CategoryName),
                p.UnitsSold.ToString(),
                p.TotalRevenue.ToString("F2", CultureInfo.InvariantCulture),
                p.CostOfGoodsSold.ToString("F2", CultureInfo.InvariantCulture),
                p.GrossProfit.ToString("F2", CultureInfo.InvariantCulture),
                p.GrossMarginPercentage.ToString("F1", CultureInfo.InvariantCulture)
            ));
        }

        return ToUtf8BomBytes(sb.ToString());
    }

    public async Task<CashRegisterReconciliationSummaryDto> GetCashRegisterReconciliationAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.CashRegisterSessions
            .AsNoTracking()
            .Include(s => s.User)
            .AsQueryable();

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(s => s.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(s => s.OpenedAt >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(s => s.OpenedAt <= adjustedEnd.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var totalOpening = await query.SumAsync(s => s.InitialCash, cancellationToken);
        var totalExpected = await query.SumAsync(s => s.ExpectedCash, cancellationToken);
        var totalActual = await query.SumAsync(s => s.ActualCash ?? 0, cancellationToken);
        var totalDiff = await query.SumAsync(s => s.CashDifference ?? 0, cancellationToken);
        var totalElectronic = await query.SumAsync(s => s.TotalTransferInflow + s.TotalCardInflow + s.TotalOtherInflow, cancellationToken);

        var pagedSessions = await query
            .OrderByDescending(s => s.OpenedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new CashRegisterSessionReportItemDto(
                s.Id,
                s.SessionNumber,
                s.User != null ? s.User.FullName : "Cajero",
                s.OpenedAt,
                s.ClosedAt,
                s.Status.ToString(),
                s.InitialCash,
                s.TotalSales,
                s.TotalCashInflow,
                s.TotalCashOutflow,
                s.TotalTransferInflow + s.TotalCardInflow + s.TotalOtherInflow,
                s.ExpectedCash,
                s.ActualCash,
                s.CashDifference,
                s.DifferenceStatus.HasValue ? s.DifferenceStatus.Value.ToString() : "Pendiente"
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var pagedResult = new PagedReportResultDto<CashRegisterSessionReportItemDto>(
            pagedSessions,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            totalExpected,
            totalCount
        );

        return new CashRegisterReconciliationSummaryDto(
            totalOpening,
            totalExpected,
            totalActual,
            totalDiff,
            totalElectronic,
            totalCount,
            pagedResult
        );
    }

    public async Task<byte[]> ExportCashReconciliationCsvAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var result = await GetCashRegisterReconciliationAsync(startDate, endDate, warehouseId, 1, 10000, cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("N° Sesión,Cajero,Apertura (UTC),Cierre (UTC),Estado,Fondo Inicial,Ventas Totales,Ingresos Efectivo,Egresos Efectivo,Pagos Electrónicos,Efectivo Esperado,Efectivo Real,Diferencia,Conciliación");

        foreach (var s in result.Sessions.Items)
        {
            sb.AppendLine(string.Join(",",
                EscapeCsv(s.SessionNumber),
                EscapeCsv(s.CashierName),
                s.OpenedAt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                s.ClosedAt.HasValue ? s.ClosedAt.Value.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture) : "Abierta",
                EscapeCsv(s.Status),
                s.InitialCash.ToString("F2", CultureInfo.InvariantCulture),
                s.TotalSales.ToString("F2", CultureInfo.InvariantCulture),
                s.TotalCashInflow.ToString("F2", CultureInfo.InvariantCulture),
                s.TotalCashOutflow.ToString("F2", CultureInfo.InvariantCulture),
                s.TotalElectronicInflow.ToString("F2", CultureInfo.InvariantCulture),
                s.ExpectedCash.ToString("F2", CultureInfo.InvariantCulture),
                s.ActualCash.HasValue ? s.ActualCash.Value.ToString("F2", CultureInfo.InvariantCulture) : "-",
                s.Difference.HasValue ? s.Difference.Value.ToString("F2", CultureInfo.InvariantCulture) : "0.00",
                EscapeCsv(s.DifferenceStatus ?? "N/A")
            ));
        }

        return ToUtf8BomBytes(sb.ToString());
    }

    public async Task<PagedReportResultDto<AuditActivityReportItemDto>> GetAuditActivityAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        string? entityName = null,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.AuditLogs
            .AsNoTracking()
            .AsQueryable();

        if (startDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(a => a.CreatedAt <= adjustedEnd.Value);
        }

        if (!string.IsNullOrWhiteSpace(entityName))
        {
            query = query.Where(a => a.EntityName.ToLower() == entityName.ToLower());
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditActivityReportItemDto(
                a.Id,
                a.CreatedAt,
                a.EntityName,
                a.Action,
                a.Details,
                a.UserName,
                a.IpAddress
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedReportResultDto<AuditActivityReportItemDto>(
            items,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            null,
            totalCount
        );
    }

    private static DateTimeOffset? AdjustEndDate(DateTimeOffset? endDate)
    {
        if (!endDate.HasValue) return null;
        return endDate.Value.TimeOfDay == TimeSpan.Zero
            ? endDate.Value.Date.AddDays(1).AddTicks(-1)
            : endDate.Value;
    }

    private static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }

    private static byte[] ToUtf8BomBytes(string content)
    {
        var encoding = new UTF8Encoding(true);
        var preamble = encoding.GetPreamble();
        var bytes = encoding.GetBytes(content);
        var combined = new byte[preamble.Length + bytes.Length];
        Array.Copy(preamble, combined, preamble.Length);
        Array.Copy(bytes, 0, combined, preamble.Length, bytes.Length);
        return combined;
    }
}
