using Inventory.Application.Common.Models;
using Inventory.Application.Features.Audit.DTOs;
using Inventory.Application.Features.Audit.Services;
using Inventory.Domain.Entities;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly ApplicationDbContext _context;

    public AuditService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(
        string entityName,
        string action,
        string details,
        string userName,
        int? userId = null,
        string? entityId = null,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var auditLog = new AuditLog(
                entityName,
                action,
                details,
                userName,
                userId,
                entityId,
                ipAddress
            );

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Seguridad: El fallo en la escritura de auditoría no debe romper la transacción principal
        }
    }

    public async Task<PagedResult<AuditLogDto>> GetLogsAsync(
        AuditLogFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.EntityName) && request.EntityName.ToLower() != "all")
        {
            query = query.Where(a => a.EntityName == request.EntityName);
        }

        if (!string.IsNullOrWhiteSpace(request.Action) && request.Action.ToLower() != "all")
        {
            query = query.Where(a => a.Action == request.Action);
        }

        if (request.UserId.HasValue)
        {
            query = query.Where(a => a.UserId == request.UserId.Value);
        }

        if (request.StartDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt >= request.StartDate.Value);
        }

        if (request.EndDate.HasValue)
        {
            query = query.Where(a => a.CreatedAt <= request.EndDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(a =>
                a.Details.ToLower().Contains(search) ||
                a.UserName.ToLower().Contains(search) ||
                (a.EntityId != null && a.EntityId.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogDto(
                a.Id,
                a.EntityName,
                a.EntityId,
                a.Action,
                a.Details,
                a.UserId,
                a.UserName,
                a.IpAddress,
                a.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return new PagedResult<AuditLogDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<AuditSummaryDto> GetSummaryAsync(
        CancellationToken cancellationToken = default)
    {
        var totalLogs = await _context.AuditLogs.CountAsync(cancellationToken);
        var todayUtc = DateTimeOffset.UtcNow.Date;
        var todayCount = await _context.AuditLogs
            .CountAsync(a => a.CreatedAt >= todayUtc, cancellationToken);

        var topActions = await _context.AuditLogs
            .GroupBy(a => a.Action)
            .Select(g => new { Action = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToDictionaryAsync(x => x.Action, x => x.Count, cancellationToken);

        var topEntities = await _context.AuditLogs
            .GroupBy(a => a.EntityName)
            .Select(g => new { Entity = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(5)
            .ToDictionaryAsync(x => x.Entity, x => x.Count, cancellationToken);

        return new AuditSummaryDto(totalLogs, todayCount, topActions, topEntities);
    }
}
