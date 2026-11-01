using Inventory.Domain.Enums;

namespace Inventory.Application.Features.CashRegister.DTOs;

public record OpenCashRegisterRequest(
    decimal InitialCash,
    string? Notes = null,
    int? WarehouseId = null
);

public record CreateCashMovementRequest(
    string MovementType, // ManualInflow, ManualOutflow, CashWithdrawal
    decimal Amount,
    string PaymentMethod,
    string Concept,
    string? Notes = null
);

public record CloseCashRegisterRequest(
    decimal ActualCash,
    string? Notes = null
);

public record CashRegisterFilterRequest(
    int PageNumber = 1,
    int PageSize = 10,
    DateTimeOffset? StartDate = null,
    DateTimeOffset? EndDate = null,
    int? UserId = null,
    string? Status = null, // open, closed, all
    int? WarehouseId = null
);

public record CashRegisterMovementDto(
    int Id,
    int CashRegisterSessionId,
    string MovementNumber,
    string MovementType,
    string Category,
    string PaymentMethod,
    decimal Amount,
    string Concept,
    string? Notes,
    DateTimeOffset MovementDate,
    int UserId,
    string UserName,
    int? SaleId,
    string? SaleNumber,
    bool IsCashEffect
);

public record CashRegisterSessionDto(
    int Id,
    string SessionNumber,
    int UserId,
    string UserName,
    int? WarehouseId,
    string? WarehouseName,
    DateTimeOffset OpenedAt,
    DateTimeOffset? ClosedAt,
    string Status,
    decimal InitialCash,
    string? OpeningNotes,
    string? ClosingNotes,
    decimal ExpectedCash,
    decimal? ActualCash,
    decimal? CashDifference,
    string? DifferenceStatus,
    decimal TotalCashInflow,
    decimal TotalCashOutflow,
    decimal TotalTransferInflow,
    decimal TotalCardInflow,
    decimal TotalOtherInflow,
    decimal TotalSales,
    int MovementCount
);

public record CashRegisterAuditSummaryDto(
    int SessionId,
    string SessionNumber,
    int UserId,
    string UserName,
    int? WarehouseId,
    string? WarehouseName,
    DateTimeOffset OpenedAt,
    string Status,
    decimal InitialCash,
    decimal TotalCashSales,
    decimal TotalCashInflows,
    decimal TotalCashOutflows,
    decimal TotalCashWithdrawals,
    decimal ExpectedCash,
    decimal TotalTransferSales,
    decimal TotalCardSales,
    decimal TotalOtherSales,
    decimal TotalSales,
    int MovementCount
);

public record CashRegisterDashboardDto(
    bool HasActiveSession,
    CashRegisterSessionDto? ActiveSession,
    decimal TodayTotalSales,
    decimal TodayCashInflow,
    decimal TodayTransferInflow,
    decimal TodayCardInflow,
    decimal TodayTotalOutflow,
    decimal TodayExpectedCash,
    int TodayMovementCount
);

