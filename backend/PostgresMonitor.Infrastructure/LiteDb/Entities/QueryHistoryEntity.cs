using LiteDB;

namespace PostgresMonitor.Infrastructure.LiteDb.Entities;

public class QueryHistoryEntity
{
    [BsonId]
    public int Id { get; set; }

    public string ConnectionId { get; set; } = string.Empty;

    public DateTime ExecutedAt { get; set; }

    public string Query { get; set; } = string.Empty;

    public long Calls { get; set; }

    public decimal TotalTime { get; set; }

    public decimal MeanTime { get; set; }

    public decimal MinTime { get; set; }

    public decimal MaxTime { get; set; }

    public long Rows { get; set; }

    public long SharedBlksHit { get; set; }

    public long SharedBlksRead { get; set; }

    public long TempBlksRead { get; set; }

    public long TempBlksWritten { get; set; }

    public decimal BlkReadTime { get; set; }

    public decimal BlkWriteTime { get; set; }

    public string ImpactLevel { get; set; } = "low"; // low, medium, high, critical

    public string ImpactDescription { get; set; } = string.Empty;
}
