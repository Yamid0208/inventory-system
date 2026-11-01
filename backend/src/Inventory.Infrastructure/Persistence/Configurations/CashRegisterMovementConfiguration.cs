using Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class CashRegisterMovementConfiguration : IEntityTypeConfiguration<CashRegisterMovement>
{
    public void Configure(EntityTypeBuilder<CashRegisterMovement> builder)
    {
        builder.ToTable("CashRegisterMovements");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.MovementNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(m => m.MovementNumber)
            .IsUnique()
            .HasDatabaseName("UX_CashRegisterMovements_MovementNumber");

        builder.Property(m => m.MovementType)
            .IsRequired();

        builder.Property(m => m.Category)
            .IsRequired();

        builder.Property(m => m.PaymentMethod)
            .IsRequired();

        builder.Property(m => m.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(m => m.Concept)
            .HasMaxLength(250)
            .IsRequired();

        builder.Property(m => m.Notes)
            .HasMaxLength(500);

        builder.Property(m => m.MovementDate)
            .IsRequired();

        builder.Property(m => m.IsCashEffect)
            .IsRequired();

        builder.HasOne(m => m.CashRegisterSession)
            .WithMany(s => s.Movements)
            .HasForeignKey(m => m.CashRegisterSessionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.User)
            .WithMany()
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.Sale)
            .WithMany()
            .HasForeignKey(m => m.SaleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(m => new { m.CashRegisterSessionId, m.MovementDate })
            .HasDatabaseName("IX_CashRegisterMovements_Session_Date");

        builder.HasIndex(m => m.SaleId)
            .HasDatabaseName("IX_CashRegisterMovements_SaleId");

        builder.HasQueryFilter(m => !m.IsDeleted);
    }
}
