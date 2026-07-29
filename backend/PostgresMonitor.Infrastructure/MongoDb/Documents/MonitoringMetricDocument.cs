namespace PostgresMonitor.Infrastructure.MongoDb.Documents;

// Classe mantida para compatibilidade, mas não mais usada (substituída por MonitoringMetricEntity)
public class MonitoringMetricDocument
{
    public string Id { get; set; } = string.Empty;

    public string ConnectionId { get; set; } = string.Empty;

    public DateTime CollectedAt { get; set; }

    public Dictionary<string, object>? DatabaseStats { get; set; }

    public List<SlowQueryDto> SlowQueries { get; set; } = new();

    public List<TableStatsDto> TableStats { get; set; } = new();

    public ConnectionStatsDto? ConnectionStats { get; set; }

    public LockStatsDto? LockStats { get; set; }

    public List<IndexStatsDto> IndexStats { get; set; } = new();

    public List<IndexRecommendationDto> IndexRecommendations { get; set; } = new();

    public List<TableEfficiencyDto> TableEfficiency { get; set; } = new();

    public DatabaseEfficiencyDto? DatabaseEfficiency { get; set; }
}

public record SlowQueryDto(
    string Query,
    long Calls,
    decimal TotalTime,
    decimal MeanTime,
    decimal MaxTime
);

public record TableStatsDto(
    string SchemaName,
    string TableName,
    long SeqScan,
    long SeqTupRead,
    long IdxScan,
    long IdxTupFetch,
    long TupleInsert,
    long TupleUpdate,
    long TupleDelete
);

public record ConnectionStatsDto(
    int ActiveConnections,
    int IdleConnections,
    int TotalConnections
);

public record LockStatsDto(
    int LockCount,
    int LockedRelations
);

public record IndexStatsDto(
    string SchemaName,
    string TableName,
    string IndexName,
    long IndexScans,
    long IndexTuplesRead,
    long IndexTuplesFetched,
    long IndexSize,
    long TableSize,
    double PercentOfTable,
    string Status
);

public record IndexRecommendationDto(
    string TableName,
    string SchemaName,
    string? ColumnName,
    string Reason,
    string ExpectedImpact,
    string SqlScript,
    string RecommendationType
);

public record TableEfficiencyDto(
    string SchemaName,
    string TableName,
    long SeqScanCount,
    long IndexScanCount,
    double SeqIndexRatio,
    double CacheHitRatio,
    long TableSize,
    bool NeedsAttention
);

public record DatabaseEfficiencyDto(
    double GlobalCacheHitRatio,
    double CommitRollbackRatio,
    long TempFilesCount,
    long TempBytes
);
