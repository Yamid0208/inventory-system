using Inventory.Domain.Common;

namespace Inventory.Domain.Entities;

public class Supplier : BaseEntity
{
    public string Name { get; private set; } = null!;
    public string TaxId { get; private set; } = null!;
    public string? ContactName { get; private set; }
    public string? Email { get; private set; }
    public string? Phone { get; private set; }
    public string? Address { get; private set; }
    public bool IsActive { get; private set; } = true;

    // Propiedad de navegación
    private readonly List<Product> _products = new();
    public IReadOnlyCollection<Product> Products => _products.AsReadOnly();

    protected Supplier() { } // Requerido por EF Core

    public Supplier(string name, string taxId, string? contactName = null, string? email = null, string? phone = null, string? address = null)
    {
        Update(name, taxId, contactName, email, phone, address);
    }

    public void Update(string name, string taxId, string? contactName, string? email, string? phone, string? address)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("El nombre del proveedor es obligatorio.", nameof(name));
        }

        if (string.IsNullOrWhiteSpace(taxId))
        {
            throw new ArgumentException("El identificador fiscal (TaxId) es obligatorio.", nameof(taxId));
        }

        Name = name.Trim();
        TaxId = taxId.Trim().ToUpperInvariant();
        ContactName = contactName?.Trim();
        Email = email?.Trim().ToLowerInvariant();
        Phone = phone?.Trim();
        Address = address?.Trim();
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
