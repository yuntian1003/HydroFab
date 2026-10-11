using Microsoft.EntityFrameworkCore;
using HydroFab.Api.Data;

namespace HydroFab.Api.Endpoints;

public static class AlertEndpoints
{
    public static void MapAlertEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/alerts").WithTags("Alerts");

        // GET /api/alerts — anomaly events (defaults to unresolved, or filtered by ?resolved=true/false)
        group.MapGet("/", async (FabDbContext db, bool? resolved) =>
        {
            var query = db.AnomalyEvents
                .Include(a => a.Tool)
                .AsQueryable();

            if (resolved.HasValue)
            {
                query = query.Where(a => a.Resolved == resolved.Value);
            }
            else
            {
                query = query.Where(a => !a.Resolved);
            }

            var alerts = await query
                .OrderByDescending(a => a.DetectedAt)
                .Take(100)
                .Select(a => new
                {
                    a.Id,
                    a.ToolId,
                    ToolName = a.Tool!.Name,
                    a.Type,
                    a.Severity,
                    a.DetectedAt,
                    a.Resolved,
                })
                .ToListAsync();

            return Results.Ok(alerts);
        })
        .WithName("GetAlerts")
        .WithSummary("List anomaly events, newest first. Optional ?resolved filter");

        // GET /api/alerts/history — resolved anomaly events (audit history)
        group.MapGet("/history", async (FabDbContext db) =>
        {
            var history = await db.AnomalyEvents
                .Include(a => a.Tool)
                .Where(a => a.Resolved)
                .OrderByDescending(a => a.DetectedAt)
                .Take(100)
                .Select(a => new
                {
                    a.Id,
                    a.ToolId,
                    ToolName = a.Tool!.Name,
                    a.Type,
                    a.Severity,
                    a.DetectedAt,
                    a.Resolved,
                })
                .ToListAsync();

            return Results.Ok(history);
        })
        .WithName("GetAlertHistory")
        .WithSummary("List resolved anomaly events (history), newest first");

        // PATCH /api/alerts/{id}/resolve — mark alert as resolved
        group.MapPatch("/{id:long}/resolve", async (long id, FabDbContext db) =>
        {
            var alert = await db.AnomalyEvents.FindAsync(id);
            if (alert is null)
                return Results.NotFound(new { message = $"Alert {id} not found" });

            if (alert.Resolved)
                return Results.Ok(new { message = "Already resolved", alert.Id });

            alert.Resolved = true;
            await db.SaveChangesAsync();

            return Results.Ok(new { message = "Alert resolved", alert.Id });
        })
        .WithName("ResolveAlert")
        .WithSummary("Mark a specific alert as resolved");
    }
}
