using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HydroFab.Api.Models;

[Table("tools")]
public class Tool
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("name")]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Column("zone")]
    [MaxLength(50)]
    public string Zone { get; set; } = string.Empty;

    [Column("water_limit_lph")]
    public decimal WaterLimitLph { get; set; }

    [Column("energy_limit_kwh")]
    public decimal EnergyLimitKwh { get; set; }

    [Column("min_recycling_pct")]
    public decimal MinRecyclingPct { get; set; }
}
