using Microsoft.EntityFrameworkCore;
using HydroFab.Api.Data;

namespace HydroFab.Api.Endpoints;

public static class ReadingEndpoints
{
    public static void MapReadingEndpoints(this WebApplication app)
    {
        // GET /api/tools/{id}/readings?limit=50
        app.MapGet("/api/tools/{id:int}/readings", async (int id, int? limit, FabDbContext db) =>
        {
            var take = Math.Clamp(limit ?? 50, 1, 500);

            var readings = await db.Readings
                .Where(r => r.ToolId == id)
                .OrderByDescending(r => r.RecordedAt)
                .Take(take)
                .Select(r => new
                {
                    r.Id,
                    r.ToolId,
                    WaterLph     = r.WaterLph,
                    EnergyKwh    = r.EnergyKwh,
                    RecyclingPct = r.RecyclingPct,
                    RecordedAt   = r.RecordedAt,
                })
                .ToListAsync();

            // Return in chronological order for charting
            readings.Reverse();

            return Results.Ok(readings);
        })
        .WithName("GetToolReadings")
        .WithTags("Readings")
        .WithSummary("Recent readings for a specific tool (for trend chart)");
    }
}
