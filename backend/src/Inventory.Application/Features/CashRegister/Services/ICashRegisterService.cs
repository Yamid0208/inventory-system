using Inventory.Application.Common.Models;
using Inventory.Application.Features.CashRegister.DTOs;
using Inventory.Domain.Entities;

namespace Inventory.Application.Features.CashRegister.Services;

public interface ICashRegisterService
{
    Task<CashRegisterSessionDto?> GetCurrentSessionAsync(int userId, CancellationToken cancellationToken = default);

    Task<CashRegisterSessionDto> OpenSessionAsync(
        OpenCashRegisterRequest request,
        int userId,
        CancellationToken cancellationToken = default);

    Task<CashRegisterAuditSummaryDto> GetAuditSummaryAsync(
        int sessionId,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default);

    Task<CashRegisterSessionDto> CloseSessionAsync(
        int sessionId,
        CloseCashRegisterRequest request,
        int userId,
        CancellationToken cancellationToken = default);

    Task<CashRegisterMovementDto> CreateMovementAsync(
        CreateCashMovementRequest request,
        int userId,
        CancellationToken cancellationToken = default);

    Task<PagedResult<CashRegisterSessionDto>> GetSessionsAsync(
        CashRegisterFilterRequest request,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default);

    Task<CashRegisterSessionDto> GetSessionByIdAsync(
        int id,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CashRegisterMovementDto>> GetSessionMovementsAsync(
        int sessionId,
        int currentUserId,
        string currentUserRole,
        CancellationToken cancellationToken = default);

    Task<CashRegisterDashboardDto> GetDashboardAsync(
        int currentUserId,
        string currentUserRole,
        int? warehouseId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Registra los movimientos de caja automáticos generados por una venta en POS dentro de la sesión activa del vendedor.
    /// </summary>
    Task RecordSaleMovementsAsync(
        Sale sale,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Registra los movimientos compensatorios por devolución / anulación de una venta.
    /// </summary>
    Task RecordSaleCancellationMovementsAsync(
        Sale sale,
        int userId,
        CancellationToken cancellationToken = default);
}
