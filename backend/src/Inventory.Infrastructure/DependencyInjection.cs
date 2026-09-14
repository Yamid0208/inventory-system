using Inventory.Application.Common.Interfaces;
using Inventory.Application.Features.Auth.Services;
using Inventory.Application.Features.Categories.Services;
using Inventory.Application.Features.Suppliers.Services;
using Inventory.Infrastructure.Identity;
using Inventory.Infrastructure.Persistence;
using Inventory.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using Inventory.Application.Features.Products.Services;

using Npgsql;

namespace Inventory.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            if (connectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
                connectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
            {
                var databaseUri = new Uri(connectionString);
                var userInfo = databaseUri.UserInfo.Split(':');
                var builder = new NpgsqlConnectionStringBuilder
                {
                    Host = databaseUri.Host,
                    Port = databaseUri.Port > 0 ? databaseUri.Port : 5432,
                    Username = userInfo[0],
                    Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "",
                    Database = databaseUri.LocalPath.TrimStart('/'),
                    SslMode = SslMode.Require
                };
                connectionString = builder.ToString();
            }
        }

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                options.UseNpgsql(connectionString, sqlOptions =>
                {
                    sqlOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                    sqlOptions.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorCodesToAdd: null);
                });
            }
        });

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());
        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();

        // Servicios de Identidad y Seguridad
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IAuthService, AuthService>();

        // Servicios de Catálogo (Categorías, Proveedores y Productos)
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<IBatchService, BatchService>();

        // Servicios de Inventario y Kardex
        services.AddScoped<Inventory.Application.Features.Inventory.Services.IInventoryService, InventoryService>();

        // Servicios de Compras y Abastecimiento
        services.AddScoped<Inventory.Application.Features.Purchases.Services.IPurchaseService, PurchaseService>();

        // Servicios de Ventas y Facturación
        services.AddScoped<Inventory.Application.Features.Sales.Services.ISaleService, SaleService>();

        // Servicios de Dashboard y Analítica
        services.AddScoped<Inventory.Application.Features.Dashboard.Services.IDashboardService, DashboardService>();

        // Servicios de Administración de Usuarios
        services.AddScoped<Inventory.Application.Features.Users.Services.IUserManagementService, UserManagementService>();

        // Servicios de Alertas de Stock y Reabastecimiento
        services.AddScoped<Inventory.Application.Features.Alerts.Services.IAlertService, AlertService>();

        // Servicios de Auditoría del Sistema
        services.AddScoped<Inventory.Application.Features.Audit.Services.IAuditService, AuditService>();

        // Servicios de Exportación de Datos y Reportes
        services.AddScoped<Inventory.Application.Features.Reports.Services.IReportExportService, ReportExportService>();

        // Servicios de Clientes y Contactos Comerciales
        services.AddScoped<Inventory.Application.Features.Customers.Services.ICustomerService, CustomerService>();

        // Servicios de Configuración Global de Empresa
        services.AddScoped<Inventory.Application.Features.Settings.Services.ICompanySettingsService, CompanySettingsService>();

        // Servicios de Almacenes y Tenancy
        services.AddScoped<Inventory.Application.Features.Warehouses.Services.IWarehouseService, WarehouseService>();

        return services;
    }
}


