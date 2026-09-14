using System.Text;
using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Inventory.DTOs;
using Inventory.Application.Features.Inventory.Services;
using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class InventoryService : IInventoryService
{
    private readonly ApplicationDbContext _context;

    public InventoryService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<InventoryMovementDto>> GetKardexAsync(
        KardexFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = _context.InventoryMovements
            .AsNoTracking()
            .Include(m => m.Product)
            .Include(m => m.User)
            .AsQueryable();

        if (request.ProductId.HasValue && request.ProductId.Value > 0)
        {
            query = query.Where(m => m.ProductId == request.ProductId.Value);
        }

        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            query = query.Where(m => m.WarehouseId == request.WarehouseId.Value ||
                                     (m.WarehouseId == null && m.Product.WarehouseId == request.WarehouseId.Value));
        }

        if (!string.IsNullOrWhiteSpace(request.MovementType) && request.MovementType != "all")
        {
            if (Enum.TryParse<MovementType>(request.MovementType, true, out var movementType))
            {
                query = query.Where(m => m.Type == movementType);
            }
        }

        if (request.StartDate.HasValue)
        {
            query = query.Where(m => m.CreatedAt >= request.StartDate.Value);
        }

        if (request.EndDate.HasValue)
        {
            query = query.Where(m => m.CreatedAt <= request.EndDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(m =>
                m.MovementNumber.ToLower().Contains(search) ||
                m.Product.Name.ToLower().Contains(search) ||
                m.Product.Sku.ToLower().Contains(search) ||
                (m.Reference != null && m.Reference.ToLower().Contains(search)) ||
                m.User.FullName.ToLower().Contains(search));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new InventoryMovementDto(
                m.Id,
                m.MovementNumber,
                m.ProductId,
                m.Product.Sku,
                m.Product.Name,
                m.Type.ToString(),
                m.QuantityDelta,
                m.PreviousStock,
                m.NewStock,
                m.UnitPrice,
                m.Reference,
                m.Notes,
                m.UserId,
                m.User.FullName,
                m.CreatedAt,
                m.WarehouseId
            ))
            .ToListAsync(cancellationToken);

        return new PagedResult<InventoryMovementDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<InventoryMovementDto> CreateAdjustmentAsync(
        CreateStockAdjustmentRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);

                if (product == null)
                {
                    throw new NotFoundException($"El producto con ID {request.ProductId} no existe o se encuentra inactivo.");
                }

                var previousStock = product.CurrentStock;
                var isEntry = request.AdjustmentType.Equals("AdjustmentIn", StringComparison.OrdinalIgnoreCase);
                var quantityDelta = isEntry ? request.Quantity : -request.Quantity;

                // Validación de regla de negocio RN-001 (Stock nunca puede ser negativo)
                if (previousStock + quantityDelta < 0)
                {
                    throw new BusinessRuleViolationException(
                        "RN-001",
                        $"No es posible realizar el ajuste de salida de {request.Quantity} unidad(es). El stock disponible actual de '{product.Name}' es de {previousStock} unidad(es).");
                }

                // Actualización atómica en el producto
                product.UpdateStock(quantityDelta);

                // Generación de número de movimiento secuencial y único
                var timestamp = DateTimeOffset.UtcNow;
                var randomSuffix = Random.Shared.Next(100, 999);
                var movementNumber = $"MOV-{timestamp:yyyyMMdd}-{randomSuffix}";

                var movementType = isEntry ? MovementType.AdjustmentIn : MovementType.AdjustmentOut;

                var movement = new InventoryMovement(
                    movementNumber,
                    product.Id,
                    movementType,
                    quantityDelta,
                    previousStock,
                    product.CurrentStock,
                    product.PurchasePrice,
                    userId,
                    request.Reason,
                    request.Notes,
                    request.WarehouseId ?? product.WarehouseId
                );

                _context.InventoryMovements.Add(movement);

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                // Cargar datos de usuario para el DTO resultante
                var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
                var userName = user != null ? user.FullName : "Sistema";

                return new InventoryMovementDto(
                    movement.Id,
                    movement.MovementNumber,
                    product.Id,
                    product.Sku,
                    product.Name,
                    movement.Type.ToString(),
                    movement.QuantityDelta,
                    movement.PreviousStock,
                    movement.NewStock,
                    movement.UnitPrice,
                    movement.Reference,
                    movement.Notes,
                    userId,
                    userName,
                    movement.CreatedAt
                );
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        });
    }

    public async Task<InventoryMovementDto> ProcessReturnAsync(
        ProcessReturnRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var strategy = _context.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);

                if (product == null)
                {
                    throw new NotFoundException($"El producto con ID {request.ProductId} no existe o se encuentra inactivo.");
                }

                var previousStock = product.CurrentStock;
                var isCustomerReturn = request.ReturnType.Equals("CustomerReturn", StringComparison.OrdinalIgnoreCase);
                var quantityDelta = isCustomerReturn ? request.Quantity : -request.Quantity;

                if (previousStock + quantityDelta < 0)
                {
                    throw new BusinessRuleViolationException(
                        "RN-001",
                        $"No es posible procesar la devolución a proveedor de {request.Quantity} unidad(es). El stock actual de '{product.Name}' es de {previousStock} unidad(es).");
                }

                product.UpdateStock(quantityDelta);

                var timestamp = DateTimeOffset.UtcNow;
                var randomSuffix = Random.Shared.Next(100, 999);
                var movementNumber = $"DEV-{timestamp:yyyyMMdd}-{randomSuffix}";

                var movement = new InventoryMovement(
                    movementNumber,
                    product.Id,
                    MovementType.Return,
                    quantityDelta,
                    previousStock,
                    product.CurrentStock,
                    product.SalePrice,
                    userId,
                    request.ReferenceDocument ?? (isCustomerReturn ? "Devolución de Cliente" : "Devolución a Proveedor"),
                    $"{request.Reason}{(string.IsNullOrWhiteSpace(request.Notes) ? "" : " - " + request.Notes)}",
                    request.WarehouseId ?? product.WarehouseId
                );

                _context.InventoryMovements.Add(movement);

                await _context.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
                var userName = user != null ? user.FullName : "Sistema";

                return new InventoryMovementDto(
                    movement.Id,
                    movement.MovementNumber,
                    product.Id,
                    product.Sku,
                    product.Name,
                    movement.Type.ToString(),
                    movement.QuantityDelta,
                    movement.PreviousStock,
                    movement.NewStock,
                    movement.UnitPrice,
                    movement.Reference,
                    movement.Notes,
                    userId,
                    userName,
                    movement.CreatedAt
                );
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        });
    }

    public async Task<byte[]> ExportKardexCsvAsync(
        KardexFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await GetKardexAsync(request with { PageNumber = 1, PageSize = 10000 }, cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("ID Movimiento,Fecha y Hora,SKU,Producto,Tipo,Delta Stock,Stock Anterior,Stock Resultante,Precio Unitario,Responsable,Motivo / Referencia,Observaciones");

        foreach (var m in result.Items)
        {
            var typeLabel = m.MovementType switch
            {
                "Purchase" => "Entrada (Compra)",
                "Sale" => "Salida (Venta)",
                "AdjustmentIn" => "Ajuste (Entrada)",
                "AdjustmentOut" => "Ajuste (Salida)",
                "Return" => "Devolución",
                _ => m.MovementType
            };

            var dateStr = m.CreatedAt.ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss");
            var cleanSku = m.ProductSku.Replace("\"", "\"\"");
            var cleanName = m.ProductName.Replace("\"", "\"\"");
            var cleanRef = (m.Reference ?? string.Empty).Replace("\"", "\"\"");
            var cleanNotes = (m.Notes ?? string.Empty).Replace("\"", "\"\"");
            var cleanUser = m.UserName.Replace("\"", "\"\"");

            sb.AppendLine($"\"{m.MovementNumber}\",\"{dateStr}\",\"{cleanSku}\",\"{cleanName}\",\"{typeLabel}\",{m.QuantityDelta},{m.PreviousStock},{m.NewStock},{m.UnitPrice},\"{cleanUser}\",\"{cleanRef}\",\"{cleanNotes}\"");
        }

        // Devolver con UTF-8 BOM para que Excel reconozca tildes y caracteres especiales directamente
        var preamble = Encoding.UTF8.GetPreamble();
        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return preamble.Concat(bytes).ToArray();
    }
}
