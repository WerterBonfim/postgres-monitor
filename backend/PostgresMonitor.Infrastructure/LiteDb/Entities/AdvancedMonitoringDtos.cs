namespace PostgresMonitor.Infrastructure.LiteDb.Entities;

public readonly record struct QueryDetailDto(
    string Query,
    long Calls,
    decimal TotalTime,
    decimal MeanTime,
    decimal MinTime,
    decimal MaxTime,
    long Rows,
    long SharedBlksHit,
    long SharedBlksRead,
    long TempBlksRead,
    long TempBlksWritten,
    decimal BlkReadTime,
    decimal BlkWriteTime
);

public readonly record struct TransactionDetailDto(
    int Pid,
    string Datname,
    string Usename,
    string? ApplicationName,
    string? ClientAddr,
    DateTime BackendStart,
    DateTime? XactStart,
    DateTime? QueryStart,
    string State,
    string? Query,
    string? WaitEventType,
    string? WaitEvent,
    TimeSpan? Runtime
);

public readonly record struct LockDetailDto(
    int Pid,
    string LockType,
    string? Relation,
    string Mode,
    bool Granted,
    DateTime? WaitStart,
    string? Query
);

public readonly record struct BlockingLockDto(
    int BlockedPid,
    string BlockedUser,
    string? BlockedQuery,
    int BlockingPid,
    string BlockingUser,
    string? BlockingQuery,
    string? Relation,
    string BlockedMode,
    string BlockingMode,
    TimeSpan? BlockedDuration
);

public readonly record struct WalStatsDto(
    long TotalWalSize,
    long CheckpointTimed,
    long CheckpointReq,
    decimal CheckpointWriteTime,
    decimal CheckpointSyncTime,
    string? WalLevel,
    bool? WalCompression,
    long? MaxWalSize,
    long? MinWalSize
);

public readonly record struct TablespaceDto(
    string Name,
    string? Location,
    long Size
);

public readonly record struct MemoryConfigDto(
    long SharedBuffers,
    long WorkMem,
    long MaintenanceWorkMem,
    long EffectiveCacheSize,
    long TempBuffers,
    int MaxConnections,
    long WalBuffers,
    long EstimatedTotalMemory
);

public readonly record struct SystemInfoDto(
    string Version,
    int ServerVersionNum,
    string? DataDirectory,
    string? ConfigFile
);
