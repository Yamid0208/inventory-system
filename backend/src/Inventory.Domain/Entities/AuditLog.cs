using Inventory.Domain.Common;

namespace Inventory.Domain.Entities;

public class AuditLog : BaseEntity
{
    public string EntityName { get; private set; } = null!;
    public string? EntityId { get; private set; }
    public string Action { get; private set; } = null!;
    public string Details { get; private set; } = null!;
    public int? UserId { get; private set; }
    public string UserName { get; private set; } = null!;
    public string? IpAddress { get; private set; }

    public User? User { get; private set; }

    protected AuditLog() { } // Requerido por EF Core

    public AuditLog(
        string entityName,
        string action,
        string details,
        string userName,
        int? userId = null,
        string? entityId = null,
        string? ipAddress = null)
    {
        if (string.IsNullOrWhiteSpace(entityName))
        {
            throw new ArgumentException("El nombre de la entidad auditada es obligatorio.", nameof(entityName));
        }

        if (string.IsNullOrWhiteSpace(action))
        {
            throw new ArgumentException("La acción auditada es obligatoria.", nameof(action));
        }

        if (string.IsNullOrWhiteSpace(details))
        {
            throw new ArgumentException("El detalle del evento de auditoría es obligatorio.", nameof(details));
        }

        EntityName = entityName.Trim();
        Action = action.Trim();
        Details = details.Trim();
        UserName = string.IsNullOrWhiteSpace(userName) ? "Sistema" : userName.Trim();
        UserId = userId;
        EntityId = entityId?.Trim();
        IpAddress = ipAddress?.Trim();
        CreatedAt = DateTimeOffset.UtcNow;
    }
}
