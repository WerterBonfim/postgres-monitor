using LiteDB;

namespace PostgresMonitor.Infrastructure.LiteDb.Entities;

public class HistoricalMetricEntity
{
    [BsonId]
    public int Id { get; set; }

    public string ConnectionId { get; set; } = string.Empty;

    public DateTime PeriodStart { get; set; }

    public DateTime PeriodEnd { get; set; }

    public string PeriodType { get; set; } = string.Empty; // "Hourly" or "Daily"

    public Dictionary<string, object> AggregatedData { get; set; } = new();
}
