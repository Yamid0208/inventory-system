using Microsoft.EntityFrameworkCore;
using Inventory.Application.Common.Interfaces;
using Inventory.Domain.Common;
using Inventory.Domain.Entities;

namespace Inventory.Infrastructure.Persistence;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
    public DbSet<Purchase> Purchases => Set<Purchase>();
    public DbSet<PurchaseItem> PurchaseItems => Set<PurchaseItem>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<SaleItem> SaleItems => Set<SaleItem>();
    public DbSet<SalePayment> SalePayments => Set<SalePayment>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CompanySettings> CompanySettings => Set<CompanySettings>();
    public DbSet<ProductBatch> ProductBatches => Set<ProductBatch>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<TermsAcceptance> TermsAcceptances => Set<TermsAcceptance>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        bool isSqlServer = Database.ProviderName?.Contains("SqlServer", StringComparison.OrdinalIgnoreCase) == true;
        if (isSqlServer)
        {
            modelBuilder.Entity<Product>(entity =>
            {
                entity.Property(p => p.RowVersion)
                    .IsRowVersion();
            });
        }
        else
        {
            modelBuilder.Entity<Product>(entity =>
            {
                entity.Property(p => p.RowVersion)
                    .IsConcurrencyToken()
                    .ValueGeneratedNever();
            });
        }

        modelBuilder.Entity<Warehouse>(entity =>
        {
            entity.HasKey(w => w.Id);
            entity.Property(w => w.Name).HasMaxLength(150).IsRequired();
            entity.Property(w => w.Code).HasMaxLength(50).IsRequired();
            entity.HasOne(w => w.AdminUser)
                .WithMany()
                .HasForeignKey(w => w.AdminUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasOne(u => u.Warehouse)
                .WithMany(w => w.Employees)
                .HasForeignKey(u => u.WarehouseId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(u => u.TermsAcceptances)
                .WithOne(t => t.User)
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TermsAcceptance>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.UserEmail).HasMaxLength(256).IsRequired();
            entity.Property(t => t.UserName).HasMaxLength(150).IsRequired();
            entity.Property(t => t.UserRole).HasMaxLength(50).IsRequired();
            entity.Property(t => t.TermsVersion).HasMaxLength(20).IsRequired();
            entity.Property(t => t.PrivacyPolicyVersion).HasMaxLength(20).IsRequired();
            entity.Property(t => t.IpAddress).HasMaxLength(64).IsRequired();
            entity.Property(t => t.UserAgent).HasMaxLength(512);

            entity.HasIndex(t => t.UserId);
            entity.HasIndex(t => t.AcceptedAt);
            entity.HasIndex(t => new { t.UserId, t.TermsVersion });
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        bool isSqlServer = Database.ProviderName?.Contains("SqlServer", StringComparison.OrdinalIgnoreCase) == true;
        if (!isSqlServer)
        {
            foreach (var entry in ChangeTracker.Entries<Product>())
            {
                if (entry.State == EntityState.Added || entry.State == EntityState.Modified)
                {
                    entry.Entity.UpdateRowVersion();
                }
            }
        }

        foreach (var entry in ChangeTracker.Entries<BaseEntity<int>>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTimeOffset.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTimeOffset.UtcNow;
                    break;
                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    entry.Entity.SoftDelete();
                    break;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
