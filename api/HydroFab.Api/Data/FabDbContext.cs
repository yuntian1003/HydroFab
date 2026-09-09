using Microsoft.EntityFrameworkCore;
using HydroFab.Api.Models;

namespace HydroFab.Api.Data;

public class FabDbContext : DbContext
{
    public FabDbContext(DbContextOptions<FabDbContext> options) : base(options) { }

    public DbSet<Tool> Tools => Set<Tool>();
    public DbSet<Reading> Readings => Set<Reading>();
    public DbSet<AnomalyEvent> AnomalyEvents => Set<AnomalyEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Index on readings for fast "latest N for tool X" queries
        modelBuilder.Entity<Reading>()
            .HasIndex(r => new { r.ToolId, r.RecordedAt })
            .IsDescending(false, true)
            .HasDatabaseName("idx_readings_tool_time");

        // Partial index on unresolved anomalies
        modelBuilder.Entity<AnomalyEvent>()
            .HasIndex(a => new { a.Resolved, a.DetectedAt })
            .IsDescending(false, true)
            .HasFilter("resolved = false")
            .HasDatabaseName("idx_anomaly_unresolved");

        // Relationships
        modelBuilder.Entity<Reading>()
            .HasOne(r => r.Tool)
            .WithMany()
            .HasForeignKey(r => r.ToolId);

        modelBuilder.Entity<AnomalyEvent>()
            .HasOne(a => a.Tool)
            .WithMany()
            .HasForeignKey(a => a.ToolId);

        modelBuilder.Entity<AnomalyEvent>()
            .HasOne(a => a.Reading)
            .WithMany()
            .HasForeignKey(a => a.ReadingId);
    }
}
