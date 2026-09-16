using Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class SaleConfiguration : IEntityTypeConfiguration<Sale>
{
    public void Configure(EntityTypeBuilder<Sale> builder)
    {
        builder.ToTable("Sales");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.SaleNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(s => s.SaleNumber)
            .IsUnique()
            .HasDatabaseName("UX_Sales_SaleNumber");

        builder.Property(s => s.CustomerName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(s => s.CustomerTaxId)
            .HasMaxLength(50);

        builder.Property(s => s.CustomerEmail)
            .HasMaxLength(150);

        builder.Property(s => s.Status)
            .IsRequired();

        builder.Property(s => s.PaymentMethod)
            .IsRequired();

        builder.Property(s => s.InvoiceType)
            .IsRequired();

        builder.Property(s => s.Subtotal)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.Tax)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.Total)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.Notes)
            .HasMaxLength(500);

        builder.HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Warehouse)
            .WithMany()
            .HasForeignKey(s => s.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Items)
            .WithOne(i => i.Sale)
            .HasForeignKey(i => i.SaleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(s => s.Payments)
            .WithOne(p => p.Sale)
            .HasForeignKey(p => p.SaleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.SaleDate)
            .HasDatabaseName("IX_Sales_SaleDate");

        builder.HasIndex(s => s.Status)
            .HasDatabaseName("IX_Sales_Status");

        builder.HasQueryFilter(s => !s.IsDeleted);
    }
}
