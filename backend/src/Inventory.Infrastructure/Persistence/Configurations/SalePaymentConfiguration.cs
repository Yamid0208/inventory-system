using Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class SalePaymentConfiguration : IEntityTypeConfiguration<SalePayment>
{
    public void Configure(EntityTypeBuilder<SalePayment> builder)
    {
        builder.ToTable("SalePayments");

        builder.HasKey(sp => sp.Id);

        builder.Property(sp => sp.Method)
            .IsRequired();

        builder.Property(sp => sp.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(sp => sp.Reference)
            .HasMaxLength(100);

        builder.HasOne(sp => sp.Sale)
            .WithMany(s => s.Payments)
            .HasForeignKey(sp => sp.SaleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(sp => sp.SaleId)
            .HasDatabaseName("IX_SalePayments_SaleId");

        builder.HasQueryFilter(sp => !sp.IsDeleted);
    }
}
