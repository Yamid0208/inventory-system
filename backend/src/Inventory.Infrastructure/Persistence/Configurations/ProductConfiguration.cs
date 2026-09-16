using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Inventory.Domain.Entities;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products", table =>
        {
            table.HasCheckConstraint("CK_Products_CurrentStock_NonNegative", "\"CurrentStock\" >= 0");
            table.HasCheckConstraint("CK_Products_PurchasePrice_NonNegative", "\"PurchasePrice\" >= 0");
            table.HasCheckConstraint("CK_Products_SalePrice_NonNegative", "\"SalePrice\" >= 0");
            table.HasCheckConstraint("CK_Products_MinimumStock_NonNegative", "\"MinimumStock\" >= 0");
        });

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Sku)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(p => p.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(p => p.Description)
            .HasMaxLength(1000);

        builder.Property(p => p.PurchasePrice)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.Property(p => p.SalePrice)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.Property(p => p.CurrentStock)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(p => p.MinimumStock)
            .IsRequired()
            .HasDefaultValue(5);

        builder.Property(p => p.ImageUrl)
            .HasMaxLength(500);

        builder.Property(p => p.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(p => p.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(p => p.CreatedAt)
            .IsRequired();

        // Concurrencia optimista
        builder.Property(p => p.RowVersion)
            .IsRowVersion();

        // Índice único en SKU por almacén ignorando eliminados lógicamente
        builder.HasIndex(p => new { p.WarehouseId, p.Sku })
            .IsUnique()
            .HasFilter("\"IsDeleted\" = false")
            .HasDatabaseName("UX_Products_Warehouse_Sku");

        // Relaciones con comportamiento Restrict (RN-005, RN-006)
        builder.HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Products_Categories");

        builder.HasOne(p => p.Supplier)
            .WithMany(s => s.Products)
            .HasForeignKey(p => p.SupplierId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Products_Suppliers");

        // Índices para optimización de consultas
        builder.HasIndex(p => p.CategoryId)
            .HasDatabaseName("IX_Products_CategoryId");

        builder.HasIndex(p => p.SupplierId)
            .HasDatabaseName("IX_Products_SupplierId");

        builder.HasIndex(p => new { p.CurrentStock, p.MinimumStock })
            .HasDatabaseName("IX_Products_CurrentStock_MinimumStock");

        builder.HasQueryFilter(p => !p.IsDeleted);
    }
}
