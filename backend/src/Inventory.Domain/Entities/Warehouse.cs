using Inventory.Domain.Common;

namespace Inventory.Domain.Entities;

public class Warehouse : BaseEntity
{
    public string Name { get; private set; } = null!;
    public string Code { get; private set; } = null!;
    public string? Address { get; private set; }
    public string? City { get; private set; }
    public string? Phone { get; private set; }
    public int AdminUserId { get; private set; }
    public User? AdminUser { get; private set; }
    public bool IsActive { get; private set; } = true;

    private readonly List<User> _employees = new();
    public IReadOnlyCollection<User> Employees => _employees.AsReadOnly();

    protected Warehouse() { } // Requerido por EF Core

    public Warehouse(string name, string code, int adminUserId, string? address = null, string? city = null, string? phone = null)
    {
        Update(name, code, address, city, phone);
        AdminUserId = adminUserId;
        CreatedAt = DateTimeOffset.UtcNow;
    }

    public void Update(string name, string code, string? address = null, string? city = null, string? phone = null)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("El nombre del almacén es obligatorio.", nameof(name));
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("El código del almacén es obligatorio.", nameof(code));
        }

        Name = name.Trim();
        Code = code.Trim().ToUpperInvariant();
        Address = address?.Trim();
        City = city?.Trim();
        Phone = phone?.Trim();
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void AssignAdmin(int adminUserId)
    {
        if (adminUserId <= 0)
        {
            throw new ArgumentException("El identificador del administrador es inválido.", nameof(adminUserId));
        }

        AdminUserId = adminUserId;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTimeOffset.UtcNow;
    }
}
