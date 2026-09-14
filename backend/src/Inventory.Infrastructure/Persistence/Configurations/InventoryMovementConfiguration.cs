using Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class InventoryMovementConfiguration : IEntityTypeConfiguration<InventoryMovement>
{
    public void Configure(EntityTypeBuilder<InventoryMovement> builder)
    {
        builder.ToTable("InventoryMovements");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.MovementNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(m => m.MovementNumber)
            .IsUnique()
            .HasDatabaseName("UX_InventoryMovements_MovementNumber");

        builder.Property(m => m.Type)
            .IsRequired();

        builder.Property(m => m.QuantityDelta)
            .IsRequired();

        builder.Property(m => m.PreviousStock)
            .IsRequired();

        builder.Property(m => m.NewStock)
            .IsRequired();

        builder.Property(m => m.UnitPrice)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(m => m.Reference)
            .HasMaxLength(100);

        builder.Property(m => m.Notes)
            .HasMaxLength(500);

        builder.HasOne(m => m.Product)
            .WithMany()
            .HasForeignKey(m => m.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.User)
            .WithMany()
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Índices de alto rendimiento para consultas de Kardex cronológicas
        builder.HasIndex(m => new { m.ProductId, m.CreatedAt })
            .HasDatabaseName("IX_InventoryMovements_ProductId_CreatedAt");

        builder.HasIndex(m => m.CreatedAt)
            .HasDatabaseName("IX_InventoryMovements_CreatedAt");

        builder.HasQueryFilter(m => !m.IsDeleted);
    }
}
