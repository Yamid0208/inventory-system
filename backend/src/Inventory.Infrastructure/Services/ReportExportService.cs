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
            query = query.Where(m => m.CreatedAt <= endDate.Value);
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

        if (endDate.HasValue)
        {
            query = query.Where(s => s.CreatedAt <= endDate.Value);
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

        if (endDate.HasValue)
        {
            query = query.Where(p => p.CreatedAt <= endDate.Value);
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
