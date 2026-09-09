using Microsoft.EntityFrameworkCore;
using HydroFab.Api.Data;

namespace HydroFab.Api.Endpoints;

public static class AlertEndpoints
{
    public static void MapAlertEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/alerts").WithTags("Alerts");

        // GET /api/alerts — unresolved anomaly events
        group.MapGet("/", async (FabDbContext db) =>
        {
            var alerts = await db.AnomalyEvents
                .Include(a => a.Tool)
                .Where(a => !a.Resolved)
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
        .WithSummary("List unresolved anomaly events, newest first");

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
