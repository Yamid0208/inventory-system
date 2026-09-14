using Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class CompanySettingsConfiguration : IEntityTypeConfiguration<CompanySettings>
{
    public void Configure(EntityTypeBuilder<CompanySettings> builder)
    {
        builder.ToTable("CompanySettings");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.CompanyName)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(c => c.TaxId)
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(c => c.Email)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(c => c.Phone)
            .HasMaxLength(25)
            .IsRequired();

        builder.Property(c => c.Address)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(c => c.City)
            .HasMaxLength(80)
            .IsRequired();

        builder.Property(c => c.Website)
            .HasMaxLength(150);

        builder.Property(c => c.LogoUrl)
            .HasMaxLength(300);

        builder.Property(c => c.DefaultTaxRate)
            .HasPrecision(5, 2)
            .HasDefaultValue(19.00m);

        builder.Property(c => c.CurrencyCode)
            .HasMaxLength(5)
            .HasDefaultValue("COP");

        builder.Property(c => c.CurrencySymbol)
            .HasMaxLength(5)
            .HasDefaultValue("$");

        builder.Property(c => c.LowStockThresholdDefault)
            .HasDefaultValue(10);

        builder.Property(c => c.AllowNegativeStock)
            .HasDefaultValue(false);

        builder.Property(c => c.EnableAuditNotifications)
            .HasDefaultValue(true);
    }
}
