using Inventory.Application.Common.Exceptions;
using Inventory.Application.Common.Models;
using Inventory.Application.Features.Customers.DTOs;
using Inventory.Application.Features.Customers.Services;
using Inventory.Domain.Entities;
using Inventory.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Inventory.Infrastructure.Services;

public class CustomerService : ICustomerService
{
    private readonly ApplicationDbContext _context;

    public CustomerService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResult<CustomerDto>> GetCustomersAsync(
        CustomerFilterRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Customers.AsNoTracking().AsQueryable();

        if (request.IsActive.HasValue)
        {
            query = query.Where(c => c.IsActive == request.IsActive.Value);
        }

        if (request.UserId.HasValue && request.UserId.Value > 0)
        {
            query = query.Where(c => c.UserId == request.UserId.Value);
        }

        if (request.WarehouseId.HasValue && request.WarehouseId.Value > 0)
        {
            query = query.Where(c => c.WarehouseId == request.WarehouseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(search) ||
                (c.TaxId != null && c.TaxId.ToLower().Contains(search)) ||
                (c.Email != null && c.Email.ToLower().Contains(search)) ||
                (c.Phone != null && c.Phone.ToLower().Contains(search)) ||
                (c.City != null && c.City.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = await query
            .OrderBy(c => c.Name)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(c => MapToDto(c))
            .ToListAsync(cancellationToken);

        return new PagedResult<CustomerDto>(items, totalCount, pageNumber, pageSize);
    }

    public async Task<CustomerDto> GetCustomerByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var customer = await _context.Customers
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer == null)
        {
            throw new NotFoundException($"El cliente con ID {id} no existe.");
        }

        return MapToDto(customer);
    }

    public async Task<CustomerDto> CreateCustomerAsync(
        CreateCustomerRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedName = request.Name.Trim();

        // Validar unicidad de documento si fue suministrado
        if (!string.IsNullOrWhiteSpace(request.TaxId))
        {
            var normalizedTaxId = request.TaxId.Trim().ToUpperInvariant();
            var taxIdExists = await _context.Customers
                .AnyAsync(c => c.TaxId == normalizedTaxId, cancellationToken);
            if (taxIdExists)
            {
                throw new ConflictException($"Ya existe un cliente con el documento/NIT '{request.TaxId}'.");
            }
        }

        // Validar unicidad de correo si fue suministrado
        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var emailExists = await _context.Customers
                .AnyAsync(c => c.Email == normalizedEmail, cancellationToken);
            if (emailExists)
            {
                throw new ConflictException($"Ya existe un cliente registrado con el correo '{request.Email}'.");
            }
        }

        var customer = new Customer(
            request.Name,
            request.TaxId,
            request.Email,
            request.Phone,
            request.Address,
            request.City,
            request.Notes,
            request.UserId,
            request.WarehouseId
        );

        _context.Customers.Add(customer);
        _context.AuditLogs.Add(new AuditLog(
            "Customer",
            "Create",
            $"Cliente '{customer.Name}' (NIT: {customer.TaxId ?? "N/A"}) registrado en el directorio comercial.",
            "Administrador"
        ));

        await _context.SaveChangesAsync(cancellationToken);
        return MapToDto(customer);
    }

    public async Task<CustomerDto> UpdateCustomerAsync(
        int id,
        UpdateCustomerRequest request,
        CancellationToken cancellationToken = default)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer == null)
        {
            throw new NotFoundException($"El cliente con ID {id} no existe.");
        }

        if (!string.IsNullOrWhiteSpace(request.TaxId))
        {
            var normalizedTaxId = request.TaxId.Trim().ToUpperInvariant();
            var taxIdExists = await _context.Customers
                .AnyAsync(c => c.Id != id && c.TaxId == normalizedTaxId, cancellationToken);
            if (taxIdExists)
            {
                throw new ConflictException($"Ya existe otro cliente con el documento/NIT '{request.TaxId}'.");
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            var emailExists = await _context.Customers
                .AnyAsync(c => c.Id != id && c.Email == normalizedEmail, cancellationToken);
            if (emailExists)
            {
                throw new ConflictException($"Ya existe otro cliente con el correo '{request.Email}'.");
            }
        }

        customer.Update(
            request.Name,
            request.TaxId,
            request.Email,
            request.Phone,
            request.Address,
            request.City,
            request.Notes
        );

        _context.AuditLogs.Add(new AuditLog(
            "Customer",
            "Update",
            $"Información del cliente '{customer.Name}' (ID {id}) actualizada.",
            "Administrador",
            null,
            id.ToString()
        ));

        await _context.SaveChangesAsync(cancellationToken);
        return MapToDto(customer);
    }

    public async Task<CustomerDto> ToggleStatusAsync(int id, CancellationToken cancellationToken = default)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer == null)
        {
            throw new NotFoundException($"El cliente con ID {id} no existe.");
        }

        if (customer.IsActive)
        {
            customer.Deactivate();
        }
        else
        {
            customer.Activate();
        }

        _context.AuditLogs.Add(new AuditLog(
            "Customer",
            customer.IsActive ? "Activate" : "Deactivate",
            $"Estado del cliente '{customer.Name}' cambiado a {(customer.IsActive ? "Activo" : "Inactivo")}.",
            "Administrador",
            null,
            id.ToString()
        ));

        await _context.SaveChangesAsync(cancellationToken);
        return MapToDto(customer);
    }

    public async Task DeleteCustomerAsync(int id, CancellationToken cancellationToken = default)
    {
        var customer = await _context.Customers
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (customer == null)
        {
            throw new NotFoundException($"El cliente con ID {id} no existe.");
        }

        customer.SoftDelete();
        _context.AuditLogs.Add(new AuditLog(
            "Customer",
            "Delete",
            $"Cliente '{customer.Name}' (ID {id}) eliminado lógicamente del sistema.",
            "Administrador",
            null,
            id.ToString()
        ));

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<CustomerSummaryDto> GetSummaryAsync(int? userId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Customers.AsNoTracking().AsQueryable();
        if (userId.HasValue && userId.Value > 0)
        {
            query = query.Where(c => c.UserId == userId.Value);
        }

        var total = await query.CountAsync(cancellationToken);
        var active = await query.CountAsync(c => c.IsActive, cancellationToken);
        var inactive = total - active;

        return new CustomerSummaryDto(total, active, inactive);
    }

    private static CustomerDto MapToDto(Customer c) =>
        new(
            c.Id,
            c.Name,
            c.TaxId,
            c.Email,
            c.Phone,
            c.Address,
            c.City,
            c.Notes,
            c.IsActive,
            c.CreatedAt,
            c.WarehouseId
        );
}
