using Inventory.Domain.Enums;

namespace Inventory.Domain.Constants;

public static class AppPermissions
{
    // Módulo Catálogo de Productos
    public const string ProductsRead = "Products:Read";
    public const string ProductsWrite = "Products:Write";
    public const string ProductsDelete = "Products:Delete";

    // Módulo Kardex y Transacciones de Inventario
    public const string InventoryRead = "Inventory:Read";
    public const string InventoryAdjust = "Inventory:Adjust";

    // Módulo Transaccional de Compras
    public const string PurchasesRead = "Purchases:Read";
    public const string PurchasesCreate = "Purchases:Create";
    public const string PurchasesReceive = "Purchases:Receive";
    public const string PurchasesCancel = "Purchases:Cancel";

    // Módulo Transaccional de Ventas
    public const string SalesRead = "Sales:Read";
    public const string SalesCreate = "Sales:Create";
    public const string SalesCancel = "Sales:Cancel";

    // Módulo de Administración de Usuarios y Seguridad
    public const string UsersRead = "Users:Read";
    public const string UsersWrite = "Users:Write";

    // Módulo de Dashboard y Analítica
    public const string DashboardRead = "Dashboard:Read";

    // Módulo de Exportación y Reportes
    public const string ReportsExport = "Reports:Export";

    // Módulo de Gestión de Almacenes y Clientes (SuperAdmin)
    public const string WarehousesManage = "Warehouses:Manage";
    public const string TenantsManage = "Tenants:Manage";
}

public static class RolePermissions
{
    public static readonly IReadOnlyDictionary<UserRole, IReadOnlyList<string>> Matrix = new Dictionary<UserRole, IReadOnlyList<string>>
    {
        [UserRole.SuperAdmin] = new[]
        {
            AppPermissions.WarehousesManage,
            AppPermissions.TenantsManage,
            AppPermissions.ProductsRead,
            AppPermissions.ProductsWrite,
            AppPermissions.ProductsDelete,
            AppPermissions.InventoryRead,
            AppPermissions.InventoryAdjust,
            AppPermissions.PurchasesRead,
            AppPermissions.PurchasesCreate,
            AppPermissions.PurchasesReceive,
            AppPermissions.PurchasesCancel,
            AppPermissions.SalesRead,
            AppPermissions.SalesCreate,
            AppPermissions.SalesCancel,
            AppPermissions.UsersRead,
            AppPermissions.UsersWrite,
            AppPermissions.DashboardRead,
            AppPermissions.ReportsExport
        },
        [UserRole.Admin] = new[]
        {
            AppPermissions.ProductsRead,
            AppPermissions.ProductsWrite,
            AppPermissions.ProductsDelete,
            AppPermissions.InventoryRead,
            AppPermissions.InventoryAdjust,
            AppPermissions.PurchasesRead,
            AppPermissions.PurchasesCreate,
            AppPermissions.PurchasesReceive,
            AppPermissions.PurchasesCancel,
            AppPermissions.SalesRead,
            AppPermissions.SalesCreate,
            AppPermissions.SalesCancel,
            AppPermissions.UsersRead,
            AppPermissions.UsersWrite,
            AppPermissions.DashboardRead,
            AppPermissions.ReportsExport
        },
        [UserRole.Warehouse] = new[]
        {
            AppPermissions.ProductsRead,
            AppPermissions.ProductsWrite,
            AppPermissions.InventoryRead,
            AppPermissions.InventoryAdjust,
            AppPermissions.PurchasesRead,
            AppPermissions.PurchasesCreate,
            AppPermissions.PurchasesReceive,
            AppPermissions.PurchasesCancel,
            AppPermissions.DashboardRead,
            AppPermissions.ReportsExport
        },
        [UserRole.Seller] = new[]
        {
            AppPermissions.ProductsRead,
            AppPermissions.SalesRead,
            AppPermissions.SalesCreate,
            AppPermissions.SalesCancel,
            AppPermissions.DashboardRead,
            AppPermissions.ReportsExport
        }
    };

    public static IReadOnlyList<string> GetPermissionsForRole(UserRole role)
    {
        return Matrix.TryGetValue(role, out var permissions) ? permissions : Array.Empty<string>();
    }
}
