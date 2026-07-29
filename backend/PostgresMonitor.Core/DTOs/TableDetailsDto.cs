namespace PostgresMonitor.Core.DTOs;

public readonly record struct TableColumnDto(
    string ColumnName,
    string DataType,
    bool IsNullable,
    string? DefaultValue,
    bool IsPrimaryKey,
    int? CharacterMaximumLength,
    int? NumericPrecision,
    int? NumericScale
);

public readonly record struct TableDetailsDto(
    string SchemaName,
    string TableName,
    long TableSize,
    long IndexSize,
    long TotalSize,
    long RowCount,
    long LiveTuples,
    long DeadTuples,
    double DeadTupleRatio,
    long SeqScans,
    long SeqTupRead,
    long IndexScans,
    long IndexTupFetch,
    double IndexUsageRatio,
    double CacheHitRatio,
    long Inserts,
    long Updates,
    long Deletes,
    DateTime? LastVacuum,
    DateTime? LastAutovacuum,
    DateTime? LastAnalyze,
    DateTime? LastAutoanalyze,
    long VacuumCount,
    long AutovacuumCount,
    long AnalyzeCount,
    long AutoanalyzeCount,
    long TotalReorganizations,
    List<TableColumnDto> Columns,
    string ImpactLevel,
    string ImpactDescription
);
