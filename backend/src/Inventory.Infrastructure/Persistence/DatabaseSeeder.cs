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
                )
            };

            await context.Users.AddRangeAsync(users);
            await context.SaveChangesAsync();

            logger.LogInformation("Usuarios sembrados exitosamente: admin@sgi.local, almacen@sgi.local, vendedor@sgi.local");
        }
    }
}
