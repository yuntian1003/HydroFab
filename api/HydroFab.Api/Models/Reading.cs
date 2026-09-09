using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HydroFab.Api.Models;

[Table("readings")]
public class Reading
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("tool_id")]
    public int ToolId { get; set; }

    [Column("water_lph")]
    public decimal WaterLph { get; set; }

    [Column("energy_kwh")]
    public decimal EnergyKwh { get; set; }

    [Column("recycling_pct")]
    public decimal RecyclingPct { get; set; }

    [Column("recorded_at")]
    public DateTimeOffset RecordedAt { get; set; }

    [ForeignKey(nameof(ToolId))]
    public Tool? Tool { get; set; }
}
