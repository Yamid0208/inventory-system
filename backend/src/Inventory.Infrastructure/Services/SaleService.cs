using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Sales.DTOs;
using Inventory.Application.Features.Sales.Services;
using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class SaleService : ISaleService
{
    private readonly ApplicationDbContext _context;

    public SaleService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<SaleDto>> GetSalesAsync(
        SaleFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var baseQuery = _context.Sales
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != "all")
        {
            if (Enum.TryParse<SaleStatus>(request.Status, true, out var status))
            {
                baseQuery = baseQuery.Where(s => s.Status == status);
            }
        }

        if (!string.IsNullOrWhiteSpace(request.PaymentMethod) && request.PaymentMethod != "all")
        {
            if (Enum.TryParse<PaymentMethod>(request.PaymentMethod, true, out var method))
            {
                baseQuery = baseQuery.Where(s => s.PaymentMethod == method);
            }
        }

        if (request.StartDate.HasValue)
        {
            baseQuery = baseQuery.Where(s => s.SaleDate >= request.StartDate.Value);
        }

        if (request.EndDate.HasValue)
        {
            baseQuery = baseQuery.Where(s => s.SaleDate <= request.EndDate.Value);
        }

        if (request.UserId.HasValue && request.UserId.Value > 0)
        {
            baseQuery = baseQuery.Where(s => s.UserId == request.UserId.Value);
        }

        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            baseQuery = baseQuery.Where(s => s.WarehouseId == request.WarehouseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            baseQuery = baseQuery.Where(s =>
                s.SaleNumber.ToLower().Contains(search) ||
                s.CustomerName.ToLower().Contains(search) ||
                (s.CustomerTaxId != null && s.CustomerTaxId.ToLower().Contains(search)) ||
                s.User.FullName.ToLower().Contains(search) ||
                (s.Notes != null && s.Notes.ToLower().Contains(search)));
        }

        var totalCount = await baseQuery.CountAsync(cancellationToken);
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var sales = await baseQuery
            .OrderByDescending(s => s.SaleDate)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Include(s => s.User)
            .Include(s => s.Payments)
            .Include(s => s.Items)
                .ThenInclude(i => i.Product)
            .ToListAsync(cancellationToken);

        var dtos = sales.Select(MapToDto).ToList();
        return new PagedResult<SaleDto>(dtos, totalCount, pageNumber, pageSize);
    }

    public async Task<SaleDto> GetSaleByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var sale = await _context.Sales
            .AsNoTracking()
            .Include(s => s.User)
            .Include(s => s.Payments)
            .Include(s => s.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (sale == null)
        {
            throw new NotFoundException($"La venta con ID {id} no existe o fue eliminada.");
        }

        return MapToDto(sale);
    }

    public async Task<SaleDto> CreateSaleAsync(
        CreateSaleRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                if (!Enum.TryParse<PaymentMethod>(request.PaymentMethod, true, out var paymentMethod))
                {
                    paymentMethod = PaymentMethod.Cash;
                }

                if (!Enum.TryParse<InvoiceType>(request.InvoiceType, true, out var invoiceType))
                {
                    invoiceType = InvoiceType.Traditional;
                }

                var saleNumber = $"VEN-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
                var sale = new Sale(
                    saleNumber,
                    request.CustomerName,
                    userId,
                    request.SaleDate,
                    paymentMethod,
                    invoiceType,
                    request.CustomerTaxId,
                    request.CustomerEmail,
                    request.Notes,
                    SaleStatus.Completed,
                    request.WarehouseId
                );

                var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
                var products = await _context.Products
                    .Where(p => productIds.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id, cancellationToken);

                // 1. Verificación preliminar estricta de la regla de negocio RN-001
                foreach (var itemReq in request.Items)
                {
                    if (!products.TryGetValue(itemReq.ProductId, out var product) || !product.IsActive)
                    {
                        throw new NotFoundException($"El producto con ID {itemReq.ProductId} no existe o está inactivo.");
                    }

                    if (product.CurrentStock < itemReq.Quantity)
                    {
                        throw new BusinessRuleViolationException(
                            "RN-001",
                            $"Stock insuficiente para la venta de '{product.Name}'. Stock disponible: {product.CurrentStock} unidad(es), requerido: {itemReq.Quantity} unidad(es).");
                    }
                }

                // 2. Procesamiento atómico de salida de inventario, auditoría de Kardex y líneas de venta
                foreach (var itemReq in request.Items)
                {
                    var product = products[itemReq.ProductId];
                    var previousStock = product.CurrentStock;

                    // Deducción atómica
                    product.UpdateStock(-itemReq.Quantity);

                    var saleItem = new SaleItem(product.Id, itemReq.Quantity, itemReq.UnitPrice, itemReq.TaxRate);
                    sale.AddItem(saleItem);

                    var movementNumber = $"MOV-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(100, 999)}";
                    var movement = new InventoryMovement(
                        movementNumber,
                        product.Id,
                        MovementType.Sale,
                        -itemReq.Quantity,
                        previousStock,
                        product.CurrentStock,
                        itemReq.UnitPrice,
                        userId,
                        sale.SaleNumber,
                        $"Salida por Venta {sale.SaleNumber} ({sale.CustomerName})",
                        sale.WarehouseId ?? product.WarehouseId
                    );

                    _context.InventoryMovements.Add(movement);
                }

                // 3. Procesamiento de Medios de Pago (Pagos individuales o divididos)
                if (request.Payments != null && request.Payments.Count > 0)
                {
                    var totalPayments = decimal.Round(request.Payments.Sum(p => p.Amount), 2, MidpointRounding.AwayFromZero);
                    if (Math.Abs(totalPayments - sale.Total) > 0.05m)
                    {
                        throw new BusinessRuleViolationException(
                            "RN-009",
                            $"La suma de los métodos de pago (${totalPayments:N0}) no coincide con el total de la venta (${sale.Total:N0}).");
                    }

                    foreach (var pReq in request.Payments)
                    {
                        if (!Enum.TryParse<PaymentMethod>(pReq.Method, true, out var pMethod))
                        {
                            pMethod = PaymentMethod.Cash;
                        }
                        sale.AddPayment(new SalePayment(pMethod, pReq.Amount, pReq.Reference));
                    }

                    if (request.Payments.Count > 1)
                    {
                        sale.SetPaymentMethod(PaymentMethod.Mixed);
                    }
                    else
                    {
                        if (Enum.TryParse<PaymentMethod>(request.Payments[0].Method, true, out var singleMethod))
                        {
                            sale.SetPaymentMethod(singleMethod);
                        }
                    }
                }
                else
                {
                    sale.AddPayment(new SalePayment(paymentMethod, sale.Total));
                }

                _context.Sales.Add(sale);
                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                return await GetSaleByIdAsync(sale.Id, cancellationToken);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        });
    }

    public async Task CancelSaleAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        var strategy = _context.Database.CreateExecutionStrategy();

        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                var sale = await _context.Sales
                    .Include(s => s.Items)
                        .ThenInclude(i => i.Product)
                    .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

                if (sale == null)
                {
                    throw new NotFoundException($"La venta con ID {id} no existe.");
                }

                sale.Cancel();

                // Reingreso atómico a inventario por anulación / devolución comercial
                foreach (var item in sale.Items)
                {
                    var product = item.Product;
                    var previousStock = product.CurrentStock;

                    product.UpdateStock(item.Quantity);

                    var movementNumber = $"MOV-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(100, 999)}";
                    var movement = new InventoryMovement(
                        movementNumber,
                        product.Id,
                        MovementType.Return,
                        item.Quantity,
                        previousStock,
                        product.CurrentStock,
                        item.UnitPrice,
                        userId,
                        $"ANULACIÓN-{sale.SaleNumber}",
                        $"Reingreso a inventario por anulación de Venta {sale.SaleNumber}",
                        sale.WarehouseId ?? product.WarehouseId
                    );

                    _context.InventoryMovements.Add(movement);
                }

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        });
    }

    private static SaleDto MapToDto(Sale s)
    {
        var items = s.Items.Select(i => new SaleItemDto(
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

        var payments = s.Payments?.Select(p => new SalePaymentDto(
            p.Id,
            p.Method.ToString(),
            p.Amount,
            p.Reference
        )).ToList() ?? new List<SalePaymentDto>();

        return new SaleDto(
            s.Id,
            s.SaleNumber,
            s.CustomerName,
            s.CustomerTaxId,
            s.CustomerEmail,
            s.UserId,
            s.User?.FullName ?? "Sistema",
            s.SaleDate,
            s.Status.ToString(),
            s.PaymentMethod.ToString(),
            s.InvoiceType.ToString(),
            s.Subtotal,
            s.Tax,
            s.Total,
            s.Notes,
            items,
            payments,
            s.WarehouseId
        );
    }
}
