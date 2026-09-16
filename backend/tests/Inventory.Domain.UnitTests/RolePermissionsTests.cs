using Inventory.Domain.Constants;
using Inventory.Domain.Enums;
using Xunit;

namespace Inventory.Domain.UnitTests;

public class RolePermissionsTests
{
    [Fact]
    public void Admin_HasFullAdministrativePermissions()
    {
        var permissions = RolePermissions.GetPermissionsForRole(UserRole.Admin);

        Assert.Contains(AppPermissions.ProductsWrite, permissions);
        Assert.Contains(AppPermissions.ProductsDelete, permissions);
        Assert.Contains(AppPermissions.InventoryAdjust, permissions);
        Assert.Contains(AppPermissions.PurchasesCreate, permissions);
        Assert.Contains(AppPermissions.SalesCreate, permissions);
        Assert.Contains(AppPermissions.UsersWrite, permissions);
        Assert.Contains(AppPermissions.DashboardRead, permissions);
        Assert.Contains(AppPermissions.ReportsExport, permissions);
    }

    [Fact]
    public void Warehouse_HasInventoryAndPurchases_ButNoUserManagementOrSalesCreation()
    {
        var permissions = RolePermissions.GetPermissionsForRole(UserRole.Warehouse);

        Assert.Contains(AppPermissions.ProductsWrite, permissions);
        Assert.Contains(AppPermissions.InventoryAdjust, permissions);
        Assert.Contains(AppPermissions.PurchasesCreate, permissions);
        Assert.Contains(AppPermissions.PurchasesReceive, permissions);

        // Seguridad: no debe tener permisos de ventas ni de gestión de usuarios
        Assert.DoesNotContain(AppPermissions.SalesCreate, permissions);
        Assert.DoesNotContain(AppPermissions.UsersWrite, permissions);
        Assert.DoesNotContain(AppPermissions.ProductsDelete, permissions);
    }

    [Fact]
    public void Seller_HasSalesAndCatalogRead_ButNoStockAdjustmentOrPurchasing()
    {
        var permissions = RolePermissions.GetPermissionsForRole(UserRole.Seller);

        Assert.Contains(AppPermissions.ProductsRead, permissions);
        Assert.Contains(AppPermissions.SalesCreate, permissions);
        Assert.Contains(AppPermissions.SalesCancel, permissions);

        // Seguridad: no debe poder modificar existencias directamente ni crear compras ni usuarios
        Assert.DoesNotContain(AppPermissions.InventoryAdjust, permissions);
        Assert.DoesNotContain(AppPermissions.PurchasesCreate, permissions);
        Assert.DoesNotContain(AppPermissions.UsersWrite, permissions);
    }
}
