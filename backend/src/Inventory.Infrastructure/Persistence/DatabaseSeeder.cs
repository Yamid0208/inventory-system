using Inventory.Application.Common.Interfaces;
using Inventory.Domain.Entities;
using Inventory.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Inventory.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    public static async Task SeedInitialDataAsync(ApplicationDbContext context, IPasswordHasher passwordHasher, ILogger logger)
    {
        if (!await context.Users.AnyAsync())
        {
            logger.LogInformation("Sembrando usuarios iniciales en la base de datos...");

            var users = new List<User>
            {
                new(
                    fullName: "Super Administrador",
                    email: "superadmin@sgi.local",
                    passwordHash: passwordHasher.Hash("SuperAdmin123*"),
                    role: UserRole.SuperAdmin
                ),
                new(
                    fullName: "Administrador del Sistema",
                    email: "admin@sgi.local",
                    passwordHash: passwordHasher.Hash("Admin123*"),
                    role: UserRole.Admin
                ),
                new(
                    fullName: "Encargado de Almacén",
                    email: "almacen@sgi.local",
                    passwordHash: passwordHasher.Hash("Almacen123*"),
                    role: UserRole.Warehouse
                ),
                new(
                    fullName: "Vendedor de Mostrador",
                    email: "vendedor@sgi.local",
                    passwordHash: passwordHasher.Hash("Vendedor123*"),
                    role: UserRole.Seller
                ),
                new(
                    fullName: "Usuario Demo Limpio",
                    email: "demo.limpio@sgi.local",
                    passwordHash: passwordHasher.Hash("Password123*"),
                    role: UserRole.Admin
                )
            };

            await context.Users.AddRangeAsync(users);
            await context.SaveChangesAsync();

            logger.LogInformation("Usuarios sembrados exitosamente: admin@sgi.local, almacen@sgi.local, vendedor@sgi.local, demo.limpio@sgi.local");
        }

        if (!await context.Warehouses.AnyAsync())
        {
            logger.LogInformation("Sembrando almacén inicial para la sede del administrador...");
            var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@sgi.local");
            if (adminUser != null)
            {
                var mainWarehouse = new Warehouse(
                    name: "Sede Principal - Bogotá",
                    code: "BOG-01",
                    adminUserId: adminUser.Id,
                    address: "Calle 26 #69D-91",
                    city: "Bogotá D.C.",
                    phone: "+57 601 555 8900"
                );

                await context.Warehouses.AddAsync(mainWarehouse);
                await context.SaveChangesAsync();

                adminUser.AssignWarehouse(mainWarehouse.Id);

                var almacenUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "almacen@sgi.local");
                almacenUser?.AssignWarehouse(mainWarehouse.Id);

                var vendedorUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "vendedor@sgi.local");
                vendedorUser?.AssignWarehouse(mainWarehouse.Id);

                await context.SaveChangesAsync();
                logger.LogInformation("Almacén inicial 'Sede Principal - Bogotá' creado y vinculado a admin@sgi.local, almacen@sgi.local y vendedor@sgi.local.");
            }
        }

        if (!await context.CompanySettings.AnyAsync())
        {
            logger.LogInformation("Sembrando configuración global inicial de empresa...");
            var settings = new CompanySettings(
                companyName: "LogiStock Enterprise S.A.S.",
                taxId: "901.458.789-2",
                email: "contacto@logistock.com",
                phone: "+57 601 555 8900",
                address: "Calle 26 #69D-91 Torre 2 Piso 8",
                city: "Bogotá D.C., Colombia",
                defaultTaxRate: 19.00m,
                currencyCode: "COP",
                currencySymbol: "$",
                lowStockThresholdDefault: 10,
                allowNegativeStock: false,
                enableAuditNotifications: true,
                website: "https://www.logistock.com",
                logoUrl: "/assets/logo-enterprise.svg"
            );

            await context.CompanySettings.AddAsync(settings);
            await context.SaveChangesAsync();
            logger.LogInformation("Configuración de empresa sembrada exitosamente.");
        }
    }
}
