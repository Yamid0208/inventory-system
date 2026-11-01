using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.CashRegister.DTOs;
using Inventory.Application.Features.CashRegister.Services;
using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class CashRegisterService : ICashRegisterService
{
    private readonly ApplicationDbContext _context;

    public CashRegisterService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CashRegisterSessionDto?> GetCurrentSessionAsync(int userId, CancellationToken cancellationToken = default)
    {
        var session = await _context.CashRegisterSessions
            .AsNoTracking()
            .Include(s => s.User)
            .Include(s => s.Warehouse)
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == CashRegisterStatus.Open, cancellationToken);

        return session == null ? null : MapToSessionDto(session);
    }

    public async Task<CashRegisterSessionDto> OpenSessionAsync(
        OpenCashRegisterRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var existingOpen = await _context.CashRegisterSessions
            .AnyAsync(s => s.UserId == userId && s.Status == CashRegisterStatus.Open, cancellationToken);

        if (existingOpen)
        {
            throw new BusinessRuleViolationException(
                "RN-CAJA-001",
                "El empleado ya cuenta con una sesión de caja abierta activa. Debe cerrar la caja actual antes de iniciar una nueva.");
        }

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new NotFoundException($"El usuario con ID {userId} no existe.");
        }

        var warehouseId = request.WarehouseId ?? user.WarehouseId;

        var sessionNumber = $"CAJA-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
        var session = new CashRegisterSession(
            sessionNumber,
            userId,
            request.InitialCash,
            warehouseId,
            request.Notes
        );

        _context.CashRegisterSessions.Add(session);
        await _context.SaveChangesAsync(cancellationToken);

        // Recargar con relaciones
        return await GetSessionByIdInternalAsync(session.Id, cancellationToken);
    }

    public async Task<CashRegisterAuditSummaryDto> GetAuditSummaryAsync(
        int sessionId,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default)
    {
        var session = await _context.CashRegisterSessions
            .AsNoTracking()
            .Include(s => s.User)
            .Include(s => s.Warehouse)
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            throw new NotFoundException($"La sesión de caja con ID {sessionId} no existe.");
        }

        ValidateUserAccess(session.UserId, currentUserId, currentUserRole);

        return CalculateAuditSummary(session);
    }

    public async Task<CashRegisterSessionDto> CloseSessionAsync(
        int sessionId,
        CloseCashRegisterRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var session = await _context.CashRegisterSessions
            .Include(s => s.User)
            .Include(s => s.Warehouse)
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            throw new NotFoundException($"La sesión de caja con ID {sessionId} no existe.");
        }

        if (session.UserId != userId && !IsAdminRole(userId))
        {
            throw new BusinessRuleViolationException("AUTH-001", "Solo el empleado responsable o un administrador pueden cerrar esta caja.");
        }

        if (session.Status == CashRegisterStatus.Closed)
        {
            throw new BusinessRuleViolationException("RN-CAJA-005", "La sesión de caja ya se encuentra cerrada definitivamente.");
        }

        session.Close(request.ActualCash, request.Notes);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToSessionDto(session);
    }

    public async Task<CashRegisterMovementDto> CreateMovementAsync(
        CreateCashMovementRequest request,
        int userId,
        CancellationToken cancellationToken = default)
    {
        var session = await _context.CashRegisterSessions
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == CashRegisterStatus.Open, cancellationToken);

        if (session == null)
        {
            throw new BusinessRuleViolationException(
                "RN-CAJA-002",
                "No cuenta con una sesión de caja abierta para registrar movimientos. Debe realizar la apertura de caja primero.");
        }

        if (!Enum.TryParse<CashMovementType>(request.MovementType, true, out var movementType))
        {
            movementType = CashMovementType.ManualInflow;
        }

        if (movementType == CashMovementType.SaleInflow || movementType == CashMovementType.SaleReturnOutflow)
        {
            throw new BusinessRuleViolationException(
                "RN-CAJA-003",
                "Los movimientos vinculados a ventas y devoluciones solo pueden ser registrados automáticamente por el POS.");
        }

        if (!Enum.TryParse<PaymentMethod>(request.PaymentMethod, true, out var paymentMethod))
        {
            paymentMethod = PaymentMethod.Cash;
        }

        var movementNumber = $"MOV-MAN-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
        var movement = new CashRegisterMovement(
            session.Id,
            movementNumber,
            movementType,
            paymentMethod,
            request.Amount,
            request.Concept,
            userId,
            request.Notes
        );

        session.AddMovement(movement);
        await _context.SaveChangesAsync(cancellationToken);

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        return new CashRegisterMovementDto(
            movement.Id,
            session.Id,
            movement.MovementNumber,
            movement.MovementType.ToString(),
            movement.Category.ToString(),
            movement.PaymentMethod.ToString(),
            movement.Amount,
            movement.Concept,
            movement.Notes,
            movement.MovementDate,
            userId,
            user?.FullName ?? "Empleado",
            null,
            null,
            movement.IsCashEffect
        );
    }

    public async Task<PagedResult<CashRegisterSessionDto>> GetSessionsAsync(
        CashRegisterFilterRequest request,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default)
    {
        var query = _context.CashRegisterSessions
            .AsNoTracking()
            .Include(s => s.User)
            .Include(s => s.Warehouse)
            .Include(s => s.Movements)
            .AsQueryable();

        // Restricción por rol: El vendedor solo ve sus propias cajas
        if (currentUserRole == "Seller")
        {
            query = query.Where(s => s.UserId == currentUserId);
        }
        else if (request.UserId.HasValue && request.UserId.Value > 0)
        {
            query = query.Where(s => s.UserId == request.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status) && request.Status != "all")
        {
            if (Enum.TryParse<CashRegisterStatus>(request.Status, true, out var status))
            {
                query = query.Where(s => s.Status == status);
            }
        }

        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            query = query.Where(s => s.WarehouseId == request.WarehouseId.Value);
        }

        if (request.StartDate.HasValue)
        {
            query = query.Where(s => s.OpenedAt >= request.StartDate.Value);
        }

        if (request.EndDate.HasValue)
        {
            query = query.Where(s => s.OpenedAt <= request.EndDate.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var sessions = await query
            .OrderByDescending(s => s.OpenedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var dtos = sessions.Select(MapToSessionDto).ToList();
        return new PagedResult<CashRegisterSessionDto>(dtos, totalCount, pageNumber, pageSize);
    }

    public async Task<CashRegisterSessionDto> GetSessionByIdAsync(
        int id,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default)
    {
        var session = await _context.CashRegisterSessions
            .AsNoTracking()
            .Include(s => s.User)
            .Include(s => s.Warehouse)
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (session == null)
        {
            throw new NotFoundException($"La sesión de caja con ID {id} no existe.");
        }

        ValidateUserAccess(session.UserId, currentUserId, currentUserRole);

        return MapToSessionDto(session);
    }

    public async Task<IReadOnlyList<CashRegisterMovementDto>> GetSessionMovementsAsync(
        int sessionId,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default)
    {
        var session = await _context.CashRegisterSessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            throw new NotFoundException($"La sesión de caja con ID {sessionId} no existe.");
        }

        ValidateUserAccess(session.UserId, currentUserId, currentUserRole);

        var movements = await _context.CashRegisterMovements
            .AsNoTracking()
            .Include(m => m.User)
            .Include(m => m.Sale)
            .Where(m => m.CashRegisterSessionId == sessionId)
            .OrderByDescending(m => m.MovementDate)
            .ToListAsync(cancellationToken);

        return movements.Select(m => new CashRegisterMovementDto(
            m.Id,
            m.CashRegisterSessionId,
            m.MovementNumber,
            m.MovementType.ToString(),
            m.Category.ToString(),
            m.PaymentMethod.ToString(),
            m.Amount,
            m.Concept,
            m.Notes,
            m.MovementDate,
            m.UserId,
            m.User?.FullName ?? "Empleado",
            m.SaleId,
            m.Sale?.SaleNumber,
            m.IsCashEffect
        )).ToList();
    }

    public async Task<CashRegisterDashboardDto> GetDashboardAsync(
        int currentUserId,
        string currentUserRole,
        int? warehouseId = null,
        CancellationToken cancellationToken = default)
    {
        // Sesión activa del usuario actual
        var activeSession = await _context.CashRegisterSessions
            .AsNoTracking()
            .Include(s => s.User)
            .Include(s => s.Warehouse)
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.UserId == currentUserId && s.Status == CashRegisterStatus.Open, cancellationToken);

        var today = DateTimeOffset.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var movementsQuery = _context.CashRegisterMovements
            .AsNoTracking()
            .Where(m => m.MovementDate >= today && m.MovementDate < tomorrow);

        if (currentUserRole == "Seller")
        {
            movementsQuery = movementsQuery.Where(m => m.UserId == currentUserId);
        }
        else if (warehouseId.HasValue && warehouseId.Value > 0)
        {
            movementsQuery = movementsQuery.Where(m => m.CashRegisterSession.WarehouseId == warehouseId.Value);
        }

        var todayMovements = await movementsQuery.ToListAsync(cancellationToken);

        var todaySales = todayMovements
            .Where(m => m.MovementType == CashMovementType.SaleInflow)
            .Sum(m => m.Amount);

        var todayCashInflow = todayMovements
            .Where(m => m.Category == CashMovementCategory.Inflow && m.IsCashEffect)
            .Sum(m => m.Amount);

        var todayTransferInflow = todayMovements
            .Where(m => m.Category == CashMovementCategory.Inflow &&
                       (m.PaymentMethod == PaymentMethod.Transfer ||
                        m.PaymentMethod == PaymentMethod.Nequi ||
                        m.PaymentMethod == PaymentMethod.Daviplata))
            .Sum(m => m.Amount);

        var todayCardInflow = todayMovements
            .Where(m => m.Category == CashMovementCategory.Inflow &&
                       (m.PaymentMethod == PaymentMethod.CreditCard ||
                        m.PaymentMethod == PaymentMethod.DebitCard))
            .Sum(m => m.Amount);

        var todayOutflow = todayMovements
            .Where(m => m.Category == CashMovementCategory.Outflow && m.IsCashEffect)
            .Sum(m => m.Amount);

        var expectedCash = (activeSession?.InitialCash ?? 0m) + todayCashInflow - todayOutflow;

        return new CashRegisterDashboardDto(
            HasActiveSession: activeSession != null,
            ActiveSession: activeSession == null ? null : MapToSessionDto(activeSession),
            TodayTotalSales: todaySales,
            TodayCashInflow: todayCashInflow,
            TodayTransferInflow: todayTransferInflow,
            TodayCardInflow: todayCardInflow,
            TodayTotalOutflow: todayOutflow,
            TodayExpectedCash: expectedCash,
            TodayMovementCount: todayMovements.Count
        );
    }

    public async Task RecordSaleMovementsAsync(Sale sale, CancellationToken cancellationToken = default)
    {
        var session = await _context.CashRegisterSessions
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.UserId == sale.UserId && s.Status == CashRegisterStatus.Open, cancellationToken);

        if (session == null)
        {
            throw new BusinessRuleViolationException(
                "RN-CAJA-002",
                $"El empleado responsable no cuenta con una sesión de caja abierta. Debe abrir caja antes de registrar la venta {sale.SaleNumber}.");
        }

        if (sale.Payments != null && sale.Payments.Count > 0)
        {
            foreach (var payment in sale.Payments)
            {
                var movNumber = $"MOV-POS-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
                var movement = new CashRegisterMovement(
                    session.Id,
                    movNumber,
                    CashMovementType.SaleInflow,
                    payment.Method,
                    payment.Amount,
                    $"Ingreso por Venta {sale.SaleNumber} ({payment.Method})",
                    sale.UserId,
                    notes: $"Venta POS a cliente {sale.CustomerName}. Ref: {payment.Reference ?? "N/A"}",
                    saleId: sale.Id,
                    movementDate: sale.SaleDate,
                    isCashEffect: payment.Method == PaymentMethod.Cash
                );

                session.AddMovement(movement);
            }
        }
        else
        {
            var movNumber = $"MOV-POS-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
            var movement = new CashRegisterMovement(
                session.Id,
                movNumber,
                CashMovementType.SaleInflow,
                sale.PaymentMethod,
                sale.Total,
                $"Ingreso por Venta {sale.SaleNumber} ({sale.PaymentMethod})",
                sale.UserId,
                notes: $"Venta POS a cliente {sale.CustomerName}.",
                saleId: sale.Id,
                movementDate: sale.SaleDate,
                isCashEffect: sale.PaymentMethod == PaymentMethod.Cash
            );

            session.AddMovement(movement);
        }
    }

    public async Task RecordSaleCancellationMovementsAsync(Sale sale, int userId, CancellationToken cancellationToken = default)
    {
        // Buscar si existe una sesión abierta del usuario que cancela o del vendedor
        var session = await _context.CashRegisterSessions
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == CashRegisterStatus.Open, cancellationToken)
            ?? await _context.CashRegisterSessions
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.UserId == sale.UserId && s.Status == CashRegisterStatus.Open, cancellationToken);

        if (session != null)
        {
            var paymentsToCompensate = sale.Payments != null && sale.Payments.Count > 0
                ? sale.Payments.ToList()
                : new List<SalePayment> { new SalePayment(sale.PaymentMethod, sale.Total) };

            foreach (var payment in paymentsToCompensate)
            {
                var movNumber = $"MOV-DEV-{DateTimeOffset.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
                var compMovement = new CashRegisterMovement(
                    session.Id,
                    movNumber,
                    CashMovementType.SaleReturnOutflow,
                    payment.Method,
                    payment.Amount,
                    $"Devolución / Anulación Venta {sale.SaleNumber} ({payment.Method})",
                    userId,
                    notes: $"Compensatorio por anulación de Venta {sale.SaleNumber}",
                    saleId: sale.Id,
                    movementDate: DateTimeOffset.UtcNow,
                    isCashEffect: payment.Method == PaymentMethod.Cash
                );

                session.AddMovement(compMovement);
            }
        }
    }

    private static CashRegisterAuditSummaryDto CalculateAuditSummary(CashRegisterSession session)
    {
        var movements = session.Movements.ToList();

        var cashSales = decimal.Round(movements
            .Where(m => m.MovementType == CashMovementType.SaleInflow && m.IsCashEffect)
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        var cashInflows = decimal.Round(movements
            .Where(m => m.Category == CashMovementCategory.Inflow && m.IsCashEffect)
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        var cashOutflows = decimal.Round(movements
            .Where(m => m.MovementType == CashMovementType.ManualOutflow && m.IsCashEffect)
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        var cashWithdrawals = decimal.Round(movements
            .Where(m => m.MovementType == CashMovementType.CashWithdrawal && m.IsCashEffect)
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        var allCashOutflows = decimal.Round(movements
            .Where(m => m.Category == CashMovementCategory.Outflow && m.IsCashEffect)
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        var expectedCash = decimal.Round(session.InitialCash + cashInflows - allCashOutflows, 2, MidpointRounding.AwayFromZero);

        var transferSales = decimal.Round(movements
            .Where(m => m.Category == CashMovementCategory.Inflow &&
                       (m.PaymentMethod == PaymentMethod.Transfer ||
                        m.PaymentMethod == PaymentMethod.Nequi ||
                        m.PaymentMethod == PaymentMethod.Daviplata))
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        var cardSales = decimal.Round(movements
            .Where(m => m.Category == CashMovementCategory.Inflow &&
                       (m.PaymentMethod == PaymentMethod.CreditCard ||
                        m.PaymentMethod == PaymentMethod.DebitCard))
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        var otherSales = decimal.Round(movements
            .Where(m => m.Category == CashMovementCategory.Inflow &&
                        !m.IsCashEffect &&
                        m.PaymentMethod != PaymentMethod.Transfer &&
                        m.PaymentMethod != PaymentMethod.Nequi &&
                        m.PaymentMethod != PaymentMethod.Daviplata &&
                        m.PaymentMethod != PaymentMethod.CreditCard &&
                        m.PaymentMethod != PaymentMethod.DebitCard)
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        var totalSales = decimal.Round(movements
            .Where(m => m.MovementType == CashMovementType.SaleInflow)
            .Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        return new CashRegisterAuditSummaryDto(
            session.Id,
            session.SessionNumber,
            session.UserId,
            session.User?.FullName ?? "Empleado",
            session.WarehouseId,
            session.Warehouse?.Name,
            session.OpenedAt,
            session.Status.ToString(),
            session.InitialCash,
            cashSales,
            cashInflows,
            cashOutflows,
            cashWithdrawals,
            session.Status == CashRegisterStatus.Closed ? session.ExpectedCash : expectedCash,
            transferSales,
            cardSales,
            otherSales,
            totalSales,
            movements.Count
        );
    }

    private static CashRegisterSessionDto MapToSessionDto(CashRegisterSession s)
    {
        var movements = s.Movements?.ToList() ?? new List<CashRegisterMovement>();

        decimal expectedCash = s.Status == CashRegisterStatus.Closed
            ? s.ExpectedCash
            : decimal.Round(s.InitialCash +
                movements.Where(m => m.Category == CashMovementCategory.Inflow && m.IsCashEffect).Sum(m => m.Amount) -
                movements.Where(m => m.Category == CashMovementCategory.Outflow && m.IsCashEffect).Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        decimal totalCashInflow = s.Status == CashRegisterStatus.Closed
            ? s.TotalCashInflow
            : decimal.Round(movements.Where(m => m.Category == CashMovementCategory.Inflow && m.IsCashEffect).Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        decimal totalCashOutflow = s.Status == CashRegisterStatus.Closed
            ? s.TotalCashOutflow
            : decimal.Round(movements.Where(m => m.Category == CashMovementCategory.Outflow && m.IsCashEffect).Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        decimal totalTransferInflow = s.Status == CashRegisterStatus.Closed
            ? s.TotalTransferInflow
            : decimal.Round(movements.Where(m => m.Category == CashMovementCategory.Inflow &&
                (m.PaymentMethod == PaymentMethod.Transfer || m.PaymentMethod == PaymentMethod.Nequi || m.PaymentMethod == PaymentMethod.Daviplata)).Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        decimal totalCardInflow = s.Status == CashRegisterStatus.Closed
            ? s.TotalCardInflow
            : decimal.Round(movements.Where(m => m.Category == CashMovementCategory.Inflow &&
                (m.PaymentMethod == PaymentMethod.CreditCard || m.PaymentMethod == PaymentMethod.DebitCard)).Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        decimal totalOtherInflow = s.Status == CashRegisterStatus.Closed
            ? s.TotalOtherInflow
            : decimal.Round(movements.Where(m => m.Category == CashMovementCategory.Inflow && !m.IsCashEffect &&
                m.PaymentMethod != PaymentMethod.Transfer && m.PaymentMethod != PaymentMethod.Nequi && m.PaymentMethod != PaymentMethod.Daviplata &&
                m.PaymentMethod != PaymentMethod.CreditCard && m.PaymentMethod != PaymentMethod.DebitCard).Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        decimal totalSales = s.Status == CashRegisterStatus.Closed
            ? s.TotalSales
            : decimal.Round(movements.Where(m => m.MovementType == CashMovementType.SaleInflow).Sum(m => m.Amount), 2, MidpointRounding.AwayFromZero);

        return new CashRegisterSessionDto(
            s.Id,
            s.SessionNumber,
            s.UserId,
            s.User?.FullName ?? "Empleado",
            s.WarehouseId,
            s.Warehouse?.Name,
            s.OpenedAt,
            s.ClosedAt,
            s.Status.ToString(),
            s.InitialCash,
            s.OpeningNotes,
            s.ClosingNotes,
            expectedCash,
            s.ActualCash,
            s.CashDifference,
            s.DifferenceStatus?.ToString(),
            totalCashInflow,
            totalCashOutflow,
            totalTransferInflow,
            totalCardInflow,
            totalOtherInflow,
            totalSales,
            movements.Count
        );
    }

    private async Task<CashRegisterSessionDto> GetSessionByIdInternalAsync(int id, CancellationToken cancellationToken)
    {
        var session = await _context.CashRegisterSessions
            .AsNoTracking()
            .Include(s => s.User)
            .Include(s => s.Warehouse)
            .Include(s => s.Movements)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (session == null)
        {
            throw new NotFoundException($"La sesión de caja con ID {id} no existe.");
        }

        return MapToSessionDto(session);
    }

    private static void ValidateUserAccess(int sessionUserId, int currentUserId, string currentUserRole)
    {
        if (currentUserRole == "Seller" && sessionUserId != currentUserId)
        {
            throw new BusinessRuleViolationException("AUTH-002", "No tiene permisos para consultar la sesión de caja de otro empleado.");
        }
    }

    private bool IsAdminRole(int userId)
    {
        var user = _context.Users.AsNoTracking().FirstOrDefault(u => u.Id == userId);
        return user != null && (user.Role == UserRole.SuperAdmin || user.Role == UserRole.Admin);
    }
}

