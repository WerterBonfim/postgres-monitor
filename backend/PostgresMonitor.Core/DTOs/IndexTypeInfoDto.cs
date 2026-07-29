namespace PostgresMonitor.Core.DTOs;

public readonly record struct IndexTypeUsageDto(
    string IndexType,
    string IndexTypeName,
    int Count,
    long TotalSize,
    long TotalScans,
    List<string> UsedInTables
);

public readonly record struct IndexTypeInfoDto(
    string IndexType,
    string IndexTypeName,
    string Description,
    string WhenToUse,
    string Advantages,
    string Disadvantages,
    string Example,
    bool IsUsed,
    int UsageCount,
    long TotalSize
);
