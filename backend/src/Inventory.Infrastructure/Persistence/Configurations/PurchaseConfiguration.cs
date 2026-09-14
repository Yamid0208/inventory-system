using Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class PurchaseConfiguration : IEntityTypeConfiguration<Purchase>
{
    public void Configure(EntityTypeBuilder<Purchase> builder)
    {
        builder.ToTable("Purchases");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.PurchaseNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(p => p.PurchaseNumber)
            .IsUnique()
            .HasDatabaseName("UX_Purchases_PurchaseNumber");

        builder.Property(p => p.Status)
            .IsRequired();

        builder.Property(p => p.Subtotal)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(p => p.Tax)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(p => p.Total)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(p => p.Notes)
            .HasMaxLength(500);

        builder.HasOne(p => p.Supplier)
            .WithMany()
            .HasForeignKey(p => p.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(p => p.Items)
            .WithOne(i => i.Purchase)
            .HasForeignKey(i => i.PurchaseId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => p.PurchaseDate)
            .HasDatabaseName("IX_Purchases_PurchaseDate");

        builder.HasIndex(p => p.SupplierId)
            .HasDatabaseName("IX_Purchases_SupplierId");

        builder.HasQueryFilter(p => !p.IsDeleted);
    }
}
