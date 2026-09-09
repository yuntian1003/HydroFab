using Microsoft.EntityFrameworkCore;
using HydroFab.Api.Data;
using HydroFab.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// ------------------------------------------------------------------
// Services
// ------------------------------------------------------------------

// EF Core + Npgsql
builder.Services.AddDbContext<FabDbContext>(options =>
{
    var connStr = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Host=localhost;Port=5432;Database=hydrofab;Username=fab;Password=fab_secret";
    options.UseNpgsql(connStr);
});

// CORS (allow Angular dev server)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",
                "http://localhost:80",
                "http://localhost"
            )
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "HydroFab API",
        Version = "v1",
        Description = "REST API for the Fab Utility Monitor — serves tool status, " +
                      "readings history, and anomaly alerts to the Angular dashboard.",
    });
});

var app = builder.Build();

// ------------------------------------------------------------------
// Middleware
// ------------------------------------------------------------------

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// ------------------------------------------------------------------
// Endpoints
// ------------------------------------------------------------------

app.MapToolEndpoints();
app.MapReadingEndpoints();
app.MapAlertEndpoints();

// Health check
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTimeOffset.UtcNow }))
   .WithTags("Health")
   .ExcludeFromDescription();

app.Run();
