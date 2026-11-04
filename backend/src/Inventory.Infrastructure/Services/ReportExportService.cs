using System.Globalization;
using System.Text;
using Inventory.Application.Features.Reports.DTOs;
using Inventory.Application.Features.Reports.Services;
using Inventory.Domain.Enums;
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
                EscapeCsv(TranslateMovementType(m.Type)),
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
            query = query.Where(s => s.SaleDate >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(s => s.SaleDate <= adjustedEnd.Value);
        }

        var sales = await query
            .OrderByDescending(s => s.SaleDate)
            .ToListAsync(cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("Factura,Fecha (UTC),Cliente,Método Pago,Estado,Subtotal,IVA (19%),Total Facturado,Líneas");

        foreach (var s in sales)
        {
            sb.AppendLine(string.Join(",",
                EscapeCsv(s.SaleNumber),
                s.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                EscapeCsv(s.CustomerName),
                EscapeCsv(TranslatePaymentMethod(s.PaymentMethod)),
                EscapeCsv(TranslateSaleStatus(s.Status)),
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
                EscapeCsv(TranslatePurchaseStatus(p.Status)),
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
        string? searchTerm = null,
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

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(m => m.MovementNumber.ToLower().Contains(term) ||
                                     (m.Product != null && (m.Product.Sku.ToLower().Contains(term) || m.Product.Name.ToLower().Contains(term))) ||
                                     (m.Reference != null && m.Reference.ToLower().Contains(term)));
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
        string? searchTerm = null,
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
            query = query.Where(s => s.SaleDate >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(s => s.SaleDate <= adjustedEnd.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(s => s.SaleNumber.ToLower().Contains(term) ||
                                     s.CustomerName.ToLower().Contains(term) ||
                                     (s.CustomerTaxId != null && s.CustomerTaxId.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var totalAmount = await query.SumAsync(s => s.Total, cancellationToken);

        var items = await query
            .OrderByDescending(s => s.SaleDate)
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
        string? searchTerm = null,
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

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(p => p.PurchaseNumber.ToLower().Contains(term) ||
                                     p.Supplier.Name.ToLower().Contains(term) ||
                                     (p.Supplier.TaxId != null && p.Supplier.TaxId.ToLower().Contains(term)));
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
            .Where(p => !p.IsDeleted && p.CurrentStock <= p.MinimumStock);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == warehouseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(p => p.Sku.ToLower().Contains(term) ||
                                     p.Name.ToLower().Contains(term) ||
                                     (p.Category != null && p.Category.Name.ToLower().Contains(term)));
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
            query = query.Where(s => s.SaleDate >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(s => s.SaleDate <= adjustedEnd.Value);
        }

        query = query.Where(s => s.Status != SaleStatus.Cancelled);

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
                Method = g.Key,
                TotalAmount = g.Sum(s => s.Total),
                Count = g.Count()
            })
            .ToListAsync(cancellationToken);

        var paymentMethods = methodGroups.Select(m => new PaymentMethodBreakdownDto(
            TranslatePaymentMethod(m.Method),
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
        string? searchTerm = null,
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

        query = query.Where(i => i.Sale.Status != SaleStatus.Cancelled);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(i => i.Sale.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(i => i.Sale.SaleDate >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(i => i.Sale.SaleDate <= adjustedEnd.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(i => i.Product.Sku.ToLower().Contains(term) ||
                                     i.Product.Name.ToLower().Contains(term) ||
                                     (i.Product.Category != null && i.Product.Category.Name.ToLower().Contains(term)));
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
        string? searchTerm = null,
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

        query = query.Where(i => i.Sale.Status != SaleStatus.Cancelled);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(i => i.Sale.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(i => i.Sale.SaleDate >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(i => i.Sale.SaleDate <= adjustedEnd.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(i => i.Product.Sku.ToLower().Contains(term) ||
                                     i.Product.Name.ToLower().Contains(term) ||
                                     (i.Product.Category != null && i.Product.Category.Name.ToLower().Contains(term)));
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
        var result = await GetProfitabilityReportAsync(startDate, endDate, warehouseId, null, 1, 10000, cancellationToken);

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
        string? searchTerm = null,
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

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(s => s.SessionNumber.ToLower().Contains(term) ||
                                     (s.User != null && s.User.FullName.ToLower().Contains(term)) ||
                                     (s.Warehouse != null && s.Warehouse.Name.ToLower().Contains(term)));
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
        var result = await GetCashRegisterReconciliationAsync(startDate, endDate, warehouseId, null, 1, 10000, cancellationToken);

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
        string? searchTerm = null,
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

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(a => a.EntityName.ToLower().Contains(term) ||
                                     a.Action.ToLower().Contains(term) ||
                                     a.Details.ToLower().Contains(term) ||
                                     (a.User != null && a.User.FullName.ToLower().Contains(term)));
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

    // =========================================================================
    // 5. SUITE DE ANÁLISIS EMPRESARIAL E INTELIGENCIA DE VENTAS (INSINCRO POS)
    // =========================================================================

    public async Task<SalesAnalyticsSummaryDto> GetSalesAnalyticsSummaryAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var curEnd = AdjustEndDate(endDate) ?? DateTimeOffset.UtcNow;
        var curStart = startDate ?? curEnd.Date.AddDays(-30);
        var duration = curEnd - curStart;
        if (duration <= TimeSpan.Zero) duration = TimeSpan.FromDays(1);

        var prevEnd = curStart;
        var prevStart = curStart - duration;

        // 1. Ventas del período actual
        var curSalesQuery = _context.Sales
            .AsNoTracking()
            .Where(s => s.Status != SaleStatus.Cancelled);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            curSalesQuery = curSalesQuery.Where(s => s.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            curSalesQuery = curSalesQuery.Where(s => s.SaleDate >= curStart);
        }

        if (endDate.HasValue)
        {
            curSalesQuery = curSalesQuery.Where(s => s.SaleDate <= curEnd);
        }

        var curTransactions = await curSalesQuery.CountAsync(cancellationToken);
        decimal curTotalSales = 0m;
        decimal curSubtotal = 0m;
        decimal curTax = 0m;
        var paymentMethods = new List<PaymentMethodBreakdownDto>();

        if (curTransactions > 0)
        {
            curTotalSales = await curSalesQuery.SumAsync(s => s.Total, cancellationToken);
            curSubtotal = await curSalesQuery.SumAsync(s => s.Subtotal, cancellationToken);
            curTax = await curSalesQuery.SumAsync(s => s.Tax, cancellationToken);

            var methodGroups = await curSalesQuery
                .GroupBy(s => s.PaymentMethod)
                .Select(g => new
                {
                    Method = g.Key,
                    TotalAmount = g.Sum(s => s.Total),
                    Count = g.Count()
                })
                .ToListAsync(cancellationToken);

            paymentMethods = methodGroups.Select(m => new PaymentMethodBreakdownDto(
                TranslatePaymentMethod(m.Method),
                m.TotalAmount,
                m.Count,
                curTotalSales > 0 ? decimal.Round((m.TotalAmount / curTotalSales) * 100m, 1) : 0m
            )).ToList();
        }

        var curAverageTicket = curTransactions > 0 ? decimal.Round(curTotalSales / curTransactions, 2) : 0m;

        // Unidades vendidas en el período actual
        var curItemsQuery = _context.SaleItems
            .AsNoTracking()
            .Where(i => i.Sale.Status != SaleStatus.Cancelled);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            curItemsQuery = curItemsQuery.Where(i => i.Sale.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            curItemsQuery = curItemsQuery.Where(i => i.Sale.SaleDate >= curStart);
        }

        if (endDate.HasValue)
        {
            curItemsQuery = curItemsQuery.Where(i => i.Sale.SaleDate <= curEnd);
        }

        var curUnitsSold = await curItemsQuery.SumAsync(i => (int?)i.Quantity, cancellationToken) ?? 0;

        // 2. Ventas del período anterior (comparativa de igual duración)
        var prevSalesQuery = _context.Sales
            .AsNoTracking()
            .Where(s => s.Status != SaleStatus.Cancelled && s.SaleDate >= prevStart && s.SaleDate < prevEnd);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            prevSalesQuery = prevSalesQuery.Where(s => s.WarehouseId == warehouseId.Value);
        }

        var prevTransactions = await prevSalesQuery.CountAsync(cancellationToken);
        decimal prevTotalSales = prevTransactions > 0
            ? await prevSalesQuery.SumAsync(s => s.Total, cancellationToken)
            : 0m;
        var prevAverageTicket = prevTransactions > 0
            ? decimal.Round(prevTotalSales / prevTransactions, 2)
            : 0m;

        // 3. Deltas de crecimiento porcentual
        decimal revenueGrowthPct = prevTotalSales > 0
            ? decimal.Round(((curTotalSales - prevTotalSales) / prevTotalSales) * 100m, 1)
            : (curTotalSales > 0 ? 100m : 0m);

        decimal transactionsGrowthPct = prevTransactions > 0
            ? decimal.Round(((decimal)(curTransactions - prevTransactions) / prevTransactions) * 100m, 1)
            : (curTransactions > 0 ? 100m : 0m);

        decimal ticketGrowthPct = prevAverageTicket > 0
            ? decimal.Round(((curAverageTicket - prevAverageTicket) / prevAverageTicket) * 100m, 1)
            : (curAverageTicket > 0 ? 100m : 0m);

        return new SalesAnalyticsSummaryDto(
            curTotalSales,
            curSubtotal,
            curTax,
            curTransactions,
            curAverageTicket,
            curUnitsSold,
            prevTotalSales,
            prevTransactions,
            prevAverageTicket,
            revenueGrowthPct,
            transactionsGrowthPct,
            ticketGrowthPct,
            paymentMethods
        );
    }

    public async Task<IReadOnlyList<SalesByCategoryDto>> GetSalesByCategoryAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.SaleItems
            .AsNoTracking()
            .Include(i => i.Sale)
            .Include(i => i.Product)
                .ThenInclude(p => p.Category)
            .Where(i => i.Sale.Status != SaleStatus.Cancelled);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(i => i.Sale.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(i => i.Sale.SaleDate >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(i => i.Sale.SaleDate <= adjustedEnd.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(i => (i.Product.Category != null && i.Product.Category.Name.ToLower().Contains(term)) ||
                                     i.Product.Name.ToLower().Contains(term) ||
                                     i.Product.Sku.ToLower().Contains(term));
        }

        var groups = await query
            .GroupBy(i => new
            {
                CategoryId = i.Product.CategoryId,
                CategoryName = i.Product.Category != null ? i.Product.Category.Name : "Sin Categoría"
            })
            .Select(g => new
            {
                g.Key.CategoryId,
                g.Key.CategoryName,
                UnitsSold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.Total),
                TransactionCount = g.Select(x => x.SaleId).Distinct().Count()
            })
            .ToListAsync(cancellationToken);

        var grandTotalRevenue = groups.Sum(g => g.TotalRevenue);

        return groups
            .OrderByDescending(g => g.TotalRevenue)
            .Select(g => new SalesByCategoryDto(
                g.CategoryId,
                g.CategoryName,
                g.UnitsSold,
                g.TotalRevenue,
                grandTotalRevenue > 0 ? decimal.Round((g.TotalRevenue / grandTotalRevenue) * 100m, 1) : 0m,
                g.TransactionCount
            ))
            .ToList();
    }

    public async Task<byte[]> ExportSalesByCategoryCsvAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var data = await GetSalesByCategoryAsync(startDate, endDate, warehouseId, null, cancellationToken);
        var sb = new StringBuilder();
        sb.AppendLine("ID Categoria,Categoria,Unidades Vendidas,Total Facturado (COP),Participacion (%),Transacciones");

        foreach (var item in data)
        {
            sb.AppendLine(string.Join(",",
                item.CategoryId,
                EscapeCsv(item.CategoryName),
                item.UnitsSold,
                item.TotalRevenue.ToString("F2", CultureInfo.InvariantCulture),
                item.SharePercentage.ToString("F1", CultureInfo.InvariantCulture),
                item.TransactionCount
            ));
        }

        return ToUtf8BomBytes(sb.ToString());
    }

    public async Task<IReadOnlyList<HourlyActivityDto>> GetSalesHourlyActivityAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Sales
            .AsNoTracking()
            .Where(s => s.Status != SaleStatus.Cancelled);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(s => s.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(s => s.SaleDate >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(s => s.SaleDate <= adjustedEnd.Value);
        }

        var rawHourly = await query
            .GroupBy(s => s.SaleDate.Hour)
            .Select(g => new
            {
                Hour = g.Key,
                TransactionCount = g.Count(),
                TotalRevenue = g.Sum(s => s.Total)
            })
            .ToListAsync(cancellationToken);

        var lookup = rawHourly.ToDictionary(x => x.Hour);
        var maxRevenue = rawHourly.Any() ? rawHourly.Max(x => x.TotalRevenue) : 0m;
        var maxTransactions = rawHourly.Any() ? rawHourly.Max(x => x.TransactionCount) : 0;

        var result = new List<HourlyActivityDto>();
        for (int h = 0; h < 24; h++)
        {
            lookup.TryGetValue(h, out var entry);
            var count = entry?.TransactionCount ?? 0;
            var rev = entry?.TotalRevenue ?? 0m;
            bool isPeak = (count > 0 && count == maxTransactions && maxTransactions > 0) ||
                          (rev > 0 && rev == maxRevenue && maxRevenue > 0);

            result.Add(new HourlyActivityDto(
                h,
                $"{h:D2}:00 - {h:D2}:59",
                count,
                rev,
                isPeak
            ));
        }

        return result;
    }

    public async Task<byte[]> ExportSalesHourlyActivityCsvAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var data = await GetSalesHourlyActivityAsync(startDate, endDate, warehouseId, cancellationToken);
        var sb = new StringBuilder();
        sb.AppendLine("Hora,Franja Horaria,Transacciones,Total Facturado (COP),Hora Pico");

        foreach (var item in data)
        {
            sb.AppendLine(string.Join(",",
                item.Hour,
                EscapeCsv(item.HourLabel),
                item.TransactionCount,
                item.TotalRevenue.ToString("F2", CultureInfo.InvariantCulture),
                item.IsPeakHour ? "SI" : "NO"
            ));
        }

        return ToUtf8BomBytes(sb.ToString());
    }

    public async Task<IReadOnlyList<SalesByEmployeeDto>> GetSalesByEmployeeAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Sales
            .AsNoTracking()
            .Include(s => s.User)
            .Where(s => s.Status != SaleStatus.Cancelled);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(s => s.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(s => s.SaleDate >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(s => s.SaleDate <= adjustedEnd.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(s => s.User != null && (s.User.FullName.ToLower().Contains(term) || s.User.Email.ToLower().Contains(term)));
        }

        var groups = await query
            .GroupBy(s => new
            {
                s.UserId,
                FullName = s.User != null ? s.User.FullName : "Sin Asignar",
                Role = s.User != null ? (UserRole?)s.User.Role : null
            })
            .Select(g => new
            {
                g.Key.UserId,
                g.Key.FullName,
                Role = g.Key.Role,
                TransactionCount = g.Count(),
                TotalRevenue = g.Sum(s => s.Total)
            })
            .ToListAsync(cancellationToken);

        var grandTotalRevenue = groups.Sum(g => g.TotalRevenue);

        return groups
            .OrderByDescending(g => g.TotalRevenue)
            .Select(g =>
            {
                var avgTicket = g.TransactionCount > 0 ? decimal.Round(g.TotalRevenue / g.TransactionCount, 2) : 0m;
                var share = grandTotalRevenue > 0 ? decimal.Round((g.TotalRevenue / grandTotalRevenue) * 100m, 1) : 0m;
                var roleName = g.Role.HasValue ? TranslateUserRole(g.Role.Value) : "N/A";
                return new SalesByEmployeeDto(
                    g.UserId,
                    g.FullName,
                    roleName,
                    g.TransactionCount,
                    g.TotalRevenue,
                    avgTicket,
                    share
                );
            })
            .ToList();
    }

    public async Task<byte[]> ExportSalesByEmployeeCsvAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var data = await GetSalesByEmployeeAsync(startDate, endDate, warehouseId, null, cancellationToken);
        var sb = new StringBuilder();
        sb.AppendLine("ID Usuario,Empleado,Rol,Transacciones,Total Facturado (COP),Ticket Promedio (COP),Aporte (%)");

        foreach (var item in data)
        {
            sb.AppendLine(string.Join(",",
                item.UserId,
                EscapeCsv(item.EmployeeName),
                EscapeCsv(item.Role),
                item.TransactionCount,
                item.TotalRevenue.ToString("F2", CultureInfo.InvariantCulture),
                item.AverageTicket.ToString("F2", CultureInfo.InvariantCulture),
                item.SharePercentage.ToString("F1", CultureInfo.InvariantCulture)
            ));
        }

        return ToUtf8BomBytes(sb.ToString());
    }

    public async Task<IReadOnlyList<SalesTrendDto>> GetSalesTrendsAsync(
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Sales
            .AsNoTracking()
            .Where(s => s.Status != SaleStatus.Cancelled);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(s => s.WarehouseId == warehouseId.Value);
        }

        if (startDate.HasValue)
        {
            query = query.Where(s => s.SaleDate >= startDate.Value);
        }

        var adjustedEnd = AdjustEndDate(endDate);
        if (adjustedEnd.HasValue)
        {
            query = query.Where(s => s.SaleDate <= adjustedEnd.Value);
        }

        var groups = await query
            .GroupBy(s => s.SaleDate.Date)
            .Select(g => new
            {
                Date = g.Key,
                TransactionCount = g.Count(),
                TotalRevenue = g.Sum(s => s.Total)
            })
            .OrderBy(x => x.Date)
            .ToListAsync(cancellationToken);

        return groups
            .Select(g => new SalesTrendDto(
                g.Date.ToString("yyyy-MM-dd"),
                g.Date.ToString("dd/MM/yyyy"),
                g.TransactionCount,
                g.TotalRevenue
            ))
            .ToList();
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

    private static string TranslatePaymentMethod(PaymentMethod method) => method switch
    {
        PaymentMethod.Cash => "Efectivo",
        PaymentMethod.Mixed => "Mixto",
        PaymentMethod.CreditCard => "Tarjeta de Crédito",
        PaymentMethod.DebitCard => "Tarjeta de Débito",
        PaymentMethod.Transfer => "Transferencia",
        PaymentMethod.Credit => "Crédito",
        PaymentMethod.Nequi => "Nequi",
        PaymentMethod.Daviplata => "Daviplata",
        _ => method.ToString()
    };

    private static string TranslateSaleStatus(SaleStatus status) => status switch
    {
        SaleStatus.Completed => "Completada",
        SaleStatus.Cancelled => "Anulada",
        SaleStatus.Draft => "Borrador",
        _ => status.ToString()
    };

    private static string TranslatePurchaseStatus(PurchaseStatus status) => status switch
    {
        PurchaseStatus.Pending => "Pendiente",
        PurchaseStatus.Received => "Recibida",
        PurchaseStatus.Cancelled => "Anulada",
        _ => status.ToString()
    };

    private static string TranslateUserRole(UserRole role) => role switch
    {
        UserRole.SuperAdmin => "Super Administrador",
        UserRole.Admin => "Administrador",
        UserRole.Seller => "Vendedor",
        UserRole.Warehouse => "Almacén",
        _ => role.ToString()
    };

    private static string TranslateCashRegisterStatus(CashRegisterStatus status) => status switch
    {
        CashRegisterStatus.Open => "Abierta",
        CashRegisterStatus.Closed => "Cerrada",
        _ => status.ToString()
    };

    private static string TranslateDifferenceStatus(CashDifferenceStatus? status) => status switch
    {
        CashDifferenceStatus.Balanced => "Cuadrada",
        CashDifferenceStatus.Surplus => "Sobrante",
        CashDifferenceStatus.Shortage => "Faltante",
        _ => "Pendiente"
    };

    private static string TranslateMovementType(MovementType type) => type switch
    {
        MovementType.Purchase => "Compra",
        MovementType.Sale => "Venta",
        MovementType.AdjustmentIn => "Ajuste Entrada",
        MovementType.AdjustmentOut => "Ajuste Salida",
        MovementType.Return => "Devolución",
        _ => type.ToString()
    };

    // =========================================================================
    // 6. SUITE DE VALORACIÓN FINANCIERA Y PATRIMONIAL DE INVENTARIO
    // =========================================================================

    public async Task<InventoryValuationSummaryDto> GetInventoryValuationSummaryAsync(
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Products
            .AsNoTracking()
            .Where(p => !p.IsDeleted);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == warehouseId.Value || p.WarehouseId == null);
        }

        var products = await query
            .Select(p => new
            {
                p.Id,
                p.CurrentStock,
                p.PurchasePrice,
                p.SalePrice,
                p.CreatedAt
            })
            .ToListAsync(cancellationToken);

        if (products.Count == 0)
        {
            return new InventoryValuationSummaryDto(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }

        // Consultar fechas de última venta por producto para cálculo de capital estancado
        var lastSales = await _context.SaleItems
            .AsNoTracking()
            .Where(si => !si.IsDeleted && si.Sale.Status != SaleStatus.Cancelled)
            .GroupBy(si => si.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                LastSaleDate = g.Max(si => si.Sale.SaleDate)
            })
            .ToDictionaryAsync(x => x.ProductId, x => x.LastSaleDate, cancellationToken);

        decimal totalCost = 0;
        decimal totalRetail = 0;
        int totalUnits = 0;
        int productsWithStock = 0;
        decimal stagnantCapital = 0;
        int stagnantCount = 0;

        var now = DateTimeOffset.UtcNow;
        var evaluatedProducts = new List<(int Id, decimal CostVal, decimal RetailVal, bool IsStagnant)>();

        foreach (var p in products)
        {
            var costVal = p.CurrentStock * p.PurchasePrice;
            var retailVal = p.CurrentStock * p.SalePrice;
            totalCost += costVal;
            totalRetail += retailVal;
            totalUnits += p.CurrentStock;

            if (p.CurrentStock > 0)
            {
                productsWithStock++;
            }

            var lastSaleDate = lastSales.TryGetValue(p.Id, out var dt) ? (DateTimeOffset?)dt : null;
            var daysWithoutSales = lastSaleDate.HasValue
                ? (int)(now - lastSaleDate.Value).TotalDays
                : (int)(now - p.CreatedAt).TotalDays;

            var isStagnant = p.CurrentStock > 0 && daysWithoutSales >= 30;
            if (isStagnant)
            {
                stagnantCapital += costVal;
                stagnantCount++;
            }

            evaluatedProducts.Add((p.Id, costVal, retailVal, isStagnant));
        }

        var potentialProfit = Math.Max(0, totalRetail - totalCost);
        var marginPct = totalRetail > 0
            ? Math.Round((potentialProfit / totalRetail) * 100m, 1)
            : 0m;

        // Clasificación ABC acumulada (80% A, 15% B, 5% C)
        int countA = 0, countB = 0, countC = 0;
        decimal costA = 0, costB = 0, costC = 0;
        var orderedByVal = evaluatedProducts
            .Where(x => x.CostVal > 0)
            .OrderByDescending(x => x.CostVal)
            .ToList();

        decimal cumulativeCost = 0;
        foreach (var item in orderedByVal)
        {
            cumulativeCost += item.CostVal;
            var share = totalCost > 0 ? (cumulativeCost / totalCost) : 1m;

            if (share <= 0.80m)
            {
                countA++;
                costA += item.CostVal;
            }
            else if (share <= 0.95m)
            {
                countB++;
                costB += item.CostVal;
            }
            else
            {
                countC++;
                costC += item.CostVal;
            }
        }

        // Productos con stock cero quedan en clasificación C
        countC += evaluatedProducts.Count(x => x.CostVal <= 0);

        var shareA = totalCost > 0 ? Math.Round((costA / totalCost) * 100m, 1) : 0m;
        var shareB = totalCost > 0 ? Math.Round((costB / totalCost) * 100m, 1) : 0m;
        var shareC = totalCost > 0 ? Math.Round((costC / totalCost) * 100m, 1) : 0m;

        return new InventoryValuationSummaryDto(
            totalCost,
            totalRetail,
            potentialProfit,
            marginPct,
            totalUnits,
            productsWithStock,
            stagnantCapital,
            stagnantCount,
            countA,
            costA,
            shareA,
            countB,
            costB,
            shareB,
            countC,
            costC,
            shareC
        );
    }

    public async Task<IReadOnlyList<InventoryValuationByCategoryDto>> GetInventoryValuationByCategoryAsync(
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Where(p => !p.IsDeleted);

        if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            query = query.Where(p => p.WarehouseId == warehouseId.Value || p.WarehouseId == null);
        }

        var products = await query
            .Select(p => new
            {
                p.Id,
                CategoryId = p.CategoryId,
                CategoryName = p.Category != null ? p.Category.Name : "Sin Categoría",
                p.CurrentStock,
                p.PurchasePrice,
                p.SalePrice
            })
            .ToListAsync(cancellationToken);

        var totalGlobalCost = products.Sum(p => p.CurrentStock * p.PurchasePrice);

        var groups = products
            .GroupBy(p => new { p.CategoryId, p.CategoryName })
            .Select(g =>
            {
                var costVal = g.Sum(x => x.CurrentStock * x.PurchasePrice);
                var retailVal = g.Sum(x => x.CurrentStock * x.SalePrice);
                var profit = Math.Max(0, retailVal - costVal);
                var margin = retailVal > 0 ? Math.Round((profit / retailVal) * 100m, 1) : 0m;
                var share = totalGlobalCost > 0 ? Math.Round((costVal / totalGlobalCost) * 100m, 1) : 0m;

                return new InventoryValuationByCategoryDto(
                    g.Key.CategoryId,
                    g.Key.CategoryName,
                    g.Sum(x => x.CurrentStock),
                    costVal,
                    retailVal,
                    profit,
                    margin,
                    share,
                    g.Count()
                );
            })
            .OrderByDescending(x => x.TotalCostValuation)
            .ToList();

        return groups;
    }

    public async Task<PagedReportResultDto<InventoryValuationItemDto>> GetInventoryValuationDetailsAsync(
        int? warehouseId = null,
        int? categoryId = null,
        string? abcClass = null,
        bool? stagnantOnly = null,
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
            query = query.Where(p => p.WarehouseId == warehouseId.Value || p.WarehouseId == null);
        }

        if (categoryId.HasValue && categoryId.Value > 0)
        {
            query = query.Where(p => p.CategoryId == categoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(searchTerm))
        {
            var term = searchTerm.Trim().ToLower();
            query = query.Where(p => p.Sku.ToLower().Contains(term) ||
                                     p.Name.ToLower().Contains(term) ||
                                     (p.Category != null && p.Category.Name.ToLower().Contains(term)));
        }

        var allProducts = await query
            .Select(p => new
            {
                p.Id,
                p.Sku,
                p.Name,
                CategoryId = p.CategoryId,
                CategoryName = p.Category != null ? p.Category.Name : "Sin Categoría",
                SupplierName = p.Supplier != null ? p.Supplier.Name : "Sin Proveedor",
                p.CurrentStock,
                p.MinimumStock,
                p.PurchasePrice,
                p.SalePrice,
                p.CreatedAt
            })
            .ToListAsync(cancellationToken);

        // Consultar fechas de última venta por producto
        var lastSales = await _context.SaleItems
            .AsNoTracking()
            .Where(si => !si.IsDeleted && si.Sale.Status != SaleStatus.Cancelled)
            .GroupBy(si => si.ProductId)
            .Select(g => new
            {
                ProductId = g.Key,
                LastSaleDate = g.Max(si => si.Sale.SaleDate)
            })
            .ToDictionaryAsync(x => x.ProductId, x => x.LastSaleDate, cancellationToken);

        var totalGlobalCost = allProducts.Sum(p => p.CurrentStock * p.PurchasePrice);
        var now = DateTimeOffset.UtcNow;

        // Calcular valoración y Pareto ABC
        var sortedByCost = allProducts
            .OrderByDescending(p => p.CurrentStock * p.PurchasePrice)
            .ToList();

        decimal cumulativeCost = 0;
        var evaluatedItems = new List<InventoryValuationItemDto>();

        foreach (var p in sortedByCost)
        {
            var costVal = p.CurrentStock * p.PurchasePrice;
            var retailVal = p.CurrentStock * p.SalePrice;
            var profit = Math.Max(0, retailVal - costVal);
            var margin = retailVal > 0 ? Math.Round((profit / retailVal) * 100m, 1) : 0m;

            cumulativeCost += costVal;
            var share = totalGlobalCost > 0 ? (cumulativeCost / totalGlobalCost) : 1m;

            string abc;
            if (p.CurrentStock <= 0)
            {
                abc = "C";
            }
            else if (share <= 0.80m)
            {
                abc = "A";
            }
            else if (share <= 0.95m)
            {
                abc = "B";
            }
            else
            {
                abc = "C";
            }

            var lastSaleDate = lastSales.TryGetValue(p.Id, out var dt) ? (DateTimeOffset?)dt : null;
            var daysWithoutSales = lastSaleDate.HasValue
                ? (int)(now - lastSaleDate.Value).TotalDays
                : (int)(now - p.CreatedAt).TotalDays;

            var isStagnant = p.CurrentStock > 0 && daysWithoutSales >= 30;

            evaluatedItems.Add(new InventoryValuationItemDto(
                p.Id,
                p.Sku,
                p.Name,
                p.CategoryId,
                p.CategoryName,
                p.SupplierName,
                p.CurrentStock,
                p.MinimumStock,
                p.PurchasePrice,
                p.SalePrice,
                costVal,
                retailVal,
                profit,
                margin,
                abc,
                daysWithoutSales,
                isStagnant,
                lastSaleDate
            ));
        }

        // Filtros post-evaluación ABC y Estancamiento
        var filtered = evaluatedItems.AsQueryable();

        if (!string.IsNullOrWhiteSpace(abcClass))
        {
            var targetAbc = abcClass.Trim().ToUpper();
            filtered = filtered.Where(x => x.AbcClassification == targetAbc);
        }

        if (stagnantOnly.HasValue && stagnantOnly.Value)
        {
            filtered = filtered.Where(x => x.IsStagnant);
        }

        var totalCount = filtered.Count();
        var totalCostAmount = filtered.Sum(x => x.TotalCostValuation);
        var totalQuantity = filtered.Sum(x => x.CurrentStock);

        var pagedItems = filtered
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        return new PagedReportResultDto<InventoryValuationItemDto>(
            pagedItems,
            totalCount,
            pageNumber,
            pageSize,
            totalPages,
            totalCostAmount,
            totalQuantity
        );
    }

    public async Task<byte[]> ExportInventoryValuationCsvAsync(
        int? warehouseId = null,
        int? categoryId = null,
        string? abcClass = null,
        bool? stagnantOnly = null,
        string? searchTerm = null,
        CancellationToken cancellationToken = default)
    {
        var paged = await GetInventoryValuationDetailsAsync(
            warehouseId,
            categoryId,
            abcClass,
            stagnantOnly,
            searchTerm,
            pageNumber: 1,
            pageSize: 10000,
            cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("SKU,Producto,Categoría,Proveedor,Stock Actual,Costo Unitario,Precio Venta,Valoración al Costo,Valoración Comercial,Utilidad Proyectada,Margen %,Clasificación ABC,Días sin Venta,Estado Rotación");

        foreach (var item in paged.Items)
        {
            var rotacion = item.IsStagnant ? "Capital Estancado" : (item.CurrentStock <= 0 ? "Agotado" : "Activo");
            sb.AppendLine(string.Format(
                CultureInfo.InvariantCulture,
                "\"{0}\",\"{1}\",\"{2}\",\"{3}\",{4},{5:F2},{6:F2},{7:F2},{8:F2},{9:F2},{10:F1},\"{11}\",{12},\"{13}\"",
                item.Sku.Replace("\"", "\"\""),
                item.ProductName.Replace("\"", "\"\""),
                item.CategoryName.Replace("\"", "\"\""),
                item.SupplierName.Replace("\"", "\"\""),
                item.CurrentStock,
                item.UnitCost,
                item.UnitPrice,
                item.TotalCostValuation,
                item.TotalRetailValuation,
                item.PotentialProfit,
                item.ProfitMarginPercentage,
                item.AbcClassification,
                item.DaysWithoutSales,
                rotacion
            ));
        }

        return ToUtf8BomBytes(sb.ToString());
    }
}
