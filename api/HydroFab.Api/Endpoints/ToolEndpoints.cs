using Microsoft.EntityFrameworkCore;
using HydroFab.Api.Data;

namespace HydroFab.Api.Endpoints;

public static class ToolEndpoints
{
    public static void MapToolEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/tools").WithTags("Tools");

        // GET /api/tools — list all tools with their limits
        group.MapGet("/", async (FabDbContext db) =>
        {
            var tools = await db.Tools
                .OrderBy(t => t.Id)
                .Select(t => new
                {
                    t.Id,
                    t.Name,
                    t.Zone,
                    WaterLimitLph  = t.WaterLimitLph,
                    EnergyLimitKwh = t.EnergyLimitKwh,
                    MinRecyclingPct = t.MinRecyclingPct,
                })
                .ToListAsync();

            return Results.Ok(tools);
        })
        .WithName("GetTools")
        .WithSummary("List all tools and their configured limits");

        // GET /api/tools/status — latest reading per tool with health status
        group.MapGet("/status", async (FabDbContext db) =>
        {
            // Latest reading per tool via a raw SQL window function
            var statusList = await db.Database
                .SqlQueryRaw<ToolStatusDto>(
                    @"SELECT
                        t.id            AS ""ToolId"",
                        t.name          AS ""ToolName"",
                        t.zone          AS ""Zone"",
                        r.water_lph     AS ""WaterLph"",
                        r.energy_kwh    AS ""EnergyKwh"",
                        r.recycling_pct AS ""RecyclingPct"",
                        r.recorded_at   AS ""RecordedAt"",
                        t.water_limit_lph   AS ""WaterLimitLph"",
                        t.energy_limit_kwh  AS ""EnergyLimitKwh"",
                        t.min_recycling_pct AS ""MinRecyclingPct"",
                        CASE
                            WHEN EXISTS (
                                SELECT 1 FROM anomaly_events ae
                                WHERE ae.tool_id = t.id
                                  AND ae.resolved = false
                                  AND ae.severity = 'critical'
                            ) THEN 'critical'
                            WHEN EXISTS (
                                SELECT 1 FROM anomaly_events ae
                                WHERE ae.tool_id = t.id
                                  AND ae.resolved = false
                                  AND ae.severity = 'warning'
                            ) THEN 'warning'
                            ELSE 'normal'
                        END AS ""Status""
                      FROM tools t
                      LEFT JOIN LATERAL (
                          SELECT * FROM readings
                          WHERE tool_id = t.id
                          ORDER BY recorded_at DESC
                          LIMIT 1
                      ) r ON true
                      ORDER BY t.id")
                .ToListAsync();

            return Results.Ok(statusList);
        })
        .WithName("GetToolsStatus")
        .WithSummary("Latest reading per tool with health status (normal/warning/critical)");
    }
}

// DTO for the status query result
public class ToolStatusDto
{
    public int ToolId { get; set; }
    public string ToolName { get; set; } = "";
    public string Zone { get; set; } = "";
    public decimal? WaterLph { get; set; }
    public decimal? EnergyKwh { get; set; }
    public decimal? RecyclingPct { get; set; }
    public DateTimeOffset? RecordedAt { get; set; }
    public decimal WaterLimitLph { get; set; }
    public decimal EnergyLimitKwh { get; set; }
    public decimal MinRecyclingPct { get; set; }
    public string Status { get; set; } = "normal";
}
