using Inventory.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Inventory.Infrastructure.Persistence.Configurations;

public class CashRegisterSessionConfiguration : IEntityTypeConfiguration<CashRegisterSession>
{
    public void Configure(EntityTypeBuilder<CashRegisterSession> builder)
    {
        builder.ToTable("CashRegisterSessions");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.SessionNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasIndex(s => s.SessionNumber)
            .IsUnique()
            .HasDatabaseName("UX_CashRegisterSessions_SessionNumber");

        builder.Property(s => s.InitialCash)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.ExpectedCash)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.ActualCash)
            .HasPrecision(18, 2);

        builder.Property(s => s.CashDifference)
            .HasPrecision(18, 2);

        builder.Property(s => s.TotalCashInflow)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.TotalCashOutflow)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.TotalTransferInflow)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.TotalCardInflow)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.TotalOtherInflow)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.TotalSales)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.OpeningNotes)
            .HasMaxLength(500);

        builder.Property(s => s.ClosingNotes)
            .HasMaxLength(500);

        builder.Property(s => s.Status)
            .IsRequired();

        builder.Property(s => s.OpenedAt)
            .IsRequired();

        builder.HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Warehouse)
            .WithMany()
            .HasForeignKey(s => s.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Movements)
            .WithOne(m => m.CashRegisterSession)
            .HasForeignKey(m => m.CashRegisterSessionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => new { s.UserId, s.Status })
            .HasDatabaseName("IX_CashRegisterSessions_UserId_Status");

        builder.HasIndex(s => s.OpenedAt)
            .HasDatabaseName("IX_CashRegisterSessions_OpenedAt");

        builder.HasQueryFilter(s => !s.IsDeleted);
    }
}
