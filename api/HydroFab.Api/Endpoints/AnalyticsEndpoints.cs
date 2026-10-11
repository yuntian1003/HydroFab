using Microsoft.EntityFrameworkCore;
using HydroFab.Api.Data;

namespace HydroFab.Api.Endpoints;

public static class AnalyticsEndpoints
{
    public static void MapAnalyticsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/analytics").WithTags("Analytics");

        // GET /api/analytics/leaderboard — Rank tools by anomaly count over the last 24h
        group.MapGet("/leaderboard", async (FabDbContext db) =>
        {
            var since = DateTimeOffset.UtcNow.AddHours(-24);

            // Fetch tools and their aggregated anomaly events in the last 24h
            var leaderboard = await db.Tools
                .Select(t => new
                {
                    ToolId = t.Id,
                    ToolName = t.Name,
                    Zone = t.Zone,
                    WaterLimitLph = t.WaterLimitLph,
                    EnergyLimitKwh = t.EnergyLimitKwh,
                    MinRecyclingPct = t.MinRecyclingPct,
                    CriticalCount = db.AnomalyEvents
                        .Count(a => a.ToolId == t.Id && a.Severity == "critical" && a.DetectedAt >= since),
                    WarningCount = db.AnomalyEvents
                        .Count(a => a.ToolId == t.Id && a.Severity == "warning" && a.DetectedAt >= since),
                    TotalAnomalies = db.AnomalyEvents
                        .Count(a => a.ToolId == t.Id && a.DetectedAt >= since),
                    ResolvedCount = db.AnomalyEvents
                        .Count(a => a.ToolId == t.Id && a.Resolved && a.DetectedAt >= since),
                    LastIncident = db.AnomalyEvents
                        .Where(a => a.ToolId == t.Id && a.DetectedAt >= since)
                        .OrderByDescending(a => a.DetectedAt)
                        .Select(a => (DateTimeOffset?)a.DetectedAt)
                        .FirstOrDefault()
                })
                .OrderByDescending(t => t.CriticalCount * 2 + t.WarningCount) // weighted severity ranking
                .ThenByDescending(t => t.TotalAnomalies)
                .ToListAsync();

            return Results.Ok(leaderboard);
        })
        .WithName("GetDailyLeaderboard")
        .WithSummary("Daily anomaly leaderboard ranking tools by incident frequency and severity");

        // GET /api/analytics/summary — Overall 24h fab utility and anomaly stats
        group.MapGet("/summary", async (FabDbContext db) =>
        {
            var since = DateTimeOffset.UtcNow.AddHours(-24);

            var totalReadings = await db.Readings.CountAsync(r => r.RecordedAt >= since);
            var totalAnomalies = await db.AnomalyEvents.CountAsync(a => a.DetectedAt >= since);
            var criticalCount = await db.AnomalyEvents.CountAsync(a => a.Severity == "critical" && a.DetectedAt >= since);
            var warningCount = await db.AnomalyEvents.CountAsync(a => a.Severity == "warning" && a.DetectedAt >= since);
            var resolvedCount = await db.AnomalyEvents.CountAsync(a => a.Resolved && a.DetectedAt >= since);
            var unresolvedCount = totalAnomalies - resolvedCount;

            var waterSpikes = await db.AnomalyEvents.CountAsync(a => a.Type == "water_spike" && a.DetectedAt >= since);
            var energySpikes = await db.AnomalyEvents.CountAsync(a => a.Type == "energy_spike" && a.DetectedAt >= since);
            var recyclingDrops = await db.AnomalyEvents.CountAsync(a => a.Type == "recycling_drop" && a.DetectedAt >= since);

            return Results.Ok(new
            {
                TotalReadings = totalReadings,
                TotalAnomalies = totalAnomalies,
                CriticalCount = criticalCount,
                WarningCount = warningCount,
                ResolvedCount = resolvedCount,
                UnresolvedCount = unresolvedCount,
                ResolutionRatePct = totalAnomalies > 0 ? Math.Round((double)resolvedCount / totalAnomalies * 100, 1) : 100.0,
                Breakdown = new
                {
                    WaterSpikes = waterSpikes,
                    EnergySpikes = energySpikes,
                    RecyclingDrops = recyclingDrops
                }
            });
        })
        .WithName("GetAnalyticsSummary")
        .WithSummary("High-level 24h fab anomaly & monitoring performance summary");
    }
}
