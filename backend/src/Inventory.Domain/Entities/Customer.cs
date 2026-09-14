using Inventory.Domain.Common;
using System.Text.RegularExpressions;

namespace Inventory.Domain.Entities;

public class Customer : BaseEntity
{
    private static readonly Regex EmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public string Name { get; private set; } = null!;
    public string? TaxId { get; private set; }
    public string? Email { get; private set; }
    public string? Phone { get; private set; }
    public string? Address { get; private set; }
    public string? City { get; private set; }
    public string? Notes { get; private set; }
    public bool IsActive { get; private set; }
    public int? UserId { get; private set; }
    public int? WarehouseId { get; private set; }

    protected Customer() { } // Requerido por EF Core

    public Customer(
        string name,
        string? taxId = null,
        string? email = null,
        string? phone = null,
        string? address = null,
        string? city = null,
        string? notes = null,
        int? userId = null,
        int? warehouseId = null)
    {
        SetName(name);
        SetTaxId(taxId);
        SetEmail(email);
        Phone = phone?.Trim();
        Address = address?.Trim();
        City = city?.Trim();
        Notes = notes?.Trim();
        IsActive = true;
        UserId = userId;
        WarehouseId = warehouseId;
    }

    public void AssignWarehouse(int? warehouseId)
    {
        WarehouseId = warehouseId;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Update(
        string name,
        string? taxId,
        string? email,
        string? phone,
        string? address,
        string? city,
        string? notes = null)
    {
        SetName(name);
        SetTaxId(taxId);
        SetEmail(email);
        Phone = phone?.Trim();
        Address = address?.Trim();
        City = city?.Trim();
        Notes = notes?.Trim();
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTimeOffset.UtcNow;
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("El nombre o razón social del cliente es obligatorio.", nameof(name));
        }
        Name = name.Trim();
    }

    private void SetTaxId(string? taxId)
    {
        TaxId = string.IsNullOrWhiteSpace(taxId) ? null : taxId.Trim().ToUpperInvariant();
    }

    private void SetEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            Email = null;
            return;
        }

        var trimmed = email.Trim().ToLowerInvariant();
        if (!EmailRegex.IsMatch(trimmed))
        {
            throw new ArgumentException($"El formato del correo electrónico '{email}' es inválido.", nameof(email));
        }

        Email = trimmed;
    }
}
