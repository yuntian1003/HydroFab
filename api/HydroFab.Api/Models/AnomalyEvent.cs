using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HydroFab.Api.Models;

[Table("anomaly_events")]
public class AnomalyEvent
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("tool_id")]
    public int ToolId { get; set; }

    [Column("reading_id")]
    public long ReadingId { get; set; }

    [Column("type")]
    [MaxLength(30)]
    public string Type { get; set; } = string.Empty;

    [Column("severity")]
    [MaxLength(10)]
    public string Severity { get; set; } = string.Empty;

    [Column("detected_at")]
    public DateTimeOffset DetectedAt { get; set; }

    [Column("resolved")]
    public bool Resolved { get; set; }

    [ForeignKey(nameof(ToolId))]
    public Tool? Tool { get; set; }

    [ForeignKey(nameof(ReadingId))]
    public Reading? Reading { get; set; }
}
