using PostgresMonitor.Infrastructure.Services;
using PostgresMonitor.Infrastructure.LiteDb;
using PostgresMonitor.Infrastructure.LiteDb.Entities;

namespace PostgresMonitor.Api.Endpoints.Monitoring;

public static class MonitoringEndpoints
{
    public static WebApplication MapMonitoringEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/postgresql/monitoring/{connectionId}")
            .WithTags("Monitoring");

        group.MapPost("/collect", async (
            string connectionId,
            MonitoringService monitoringService) =>
        {
            try
            {
                await monitoringService.CollectMetricsAsync(connectionId);
                return Results.Ok(new { message = "Métricas coletadas com sucesso" });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        })
        .WithName("CollectMonitoringMetrics");

        group.MapGet("", async (
            string connectionId,
            LiteDbContext context) =>
        {
            var metrics = await Task.Run(() => context.Metrics
                .Find(m => m.ConnectionId == connectionId)
                .OrderByDescending(m => m.CollectedAt)
                .Take(100)
                .ToList());

            var response = metrics.Select(m => new
            {
                id = m.Id.ToString(),
                connectionId = m.ConnectionId,
                collectedAt = m.CollectedAt,
                pgStatStatementsAvailable = m.PgStatStatementsAvailable,
                databaseStats = m.DatabaseStats,
                slowQueries = (m.SlowQueries ?? new List<SlowQueryDto>()).Select(sq => new
                {
                    query = sq.Query,
                    calls = sq.Calls,
                    totalTime = sq.TotalTime,
                    meanTime = sq.MeanTime,
                    maxTime = sq.MaxTime
                }).ToList(),
                tableStats = (m.TableStats ?? new List<TableStatsDto>()).Select(ts => new
                {
                    schemaName = ts.SchemaName,
                    tableName = ts.TableName,
                    seqScan = ts.SeqScan,
                    seqTupRead = ts.SeqTupRead,
                    idxScan = ts.IdxScan,
                    idxTupFetch = ts.IdxTupFetch,
                    tupleInsert = ts.TupleInsert,
                    tupleUpdate = ts.TupleUpdate,
                    tupleDelete = ts.TupleDelete
                }).ToList(),
                connectionStats = m.ConnectionStats != null ? new
                {
                    activeConnections = m.ConnectionStats.ActiveConnections,
                    idleConnections = m.ConnectionStats.IdleConnections,
                    totalConnections = m.ConnectionStats.TotalConnections
                } : null,
                lockStats = m.LockStats != null ? new
                {
                    lockCount = m.LockStats.LockCount,
                    lockedRelations = m.LockStats.LockedRelations
                } : null,
                indexStats = (m.IndexStats ?? new List<IndexStatsDto>()).Select(idx => new
                {
                    schemaName = idx.SchemaName,
                    tableName = idx.TableName,
                    indexName = idx.IndexName,
                    indexScans = idx.IndexScans,
                    indexTuplesRead = idx.IndexTuplesRead,
                    indexTuplesFetched = idx.IndexTuplesFetched,
                    indexSize = idx.IndexSize,
                    tableSize = idx.TableSize,
                    percentOfTable = idx.PercentOfTable,
                    status = idx.Status
                }).ToList(),
                indexRecommendations = (m.IndexRecommendations ?? new List<IndexRecommendationDto>()).Select(rec => new
                {
                    tableName = rec.TableName,
                    schemaName = rec.SchemaName,
                    columnName = rec.ColumnName,
                    reason = rec.Reason,
                    expectedImpact = rec.ExpectedImpact,
                    sqlScript = rec.SqlScript,
                    recommendationType = rec.RecommendationType
                }).ToList(),
                tableEfficiency = (m.TableEfficiency ?? new List<TableEfficiencyDto>()).Select(eff => new
                {
                    schemaName = eff.SchemaName,
                    tableName = eff.TableName,
                    seqScanCount = eff.SeqScanCount,
                    indexScanCount = eff.IndexScanCount,
                    seqIndexRatio = eff.SeqIndexRatio,
                    cacheHitRatio = eff.CacheHitRatio,
                    tableSize = eff.TableSize,
                    needsAttention = eff.NeedsAttention
                }).ToList(),
                databaseEfficiency = m.DatabaseEfficiency != null ? new
                {
                    globalCacheHitRatio = m.DatabaseEfficiency.GlobalCacheHitRatio,
                    commitRollbackRatio = m.DatabaseEfficiency.CommitRollbackRatio,
                    tempFilesCount = m.DatabaseEfficiency.TempFilesCount,
                    tempBytes = m.DatabaseEfficiency.TempBytes
                } : null,
                queryDetails = (m.QueryDetails ?? new List<QueryDetailDto>()).Select(qd => new
                {
                    query = qd.Query,
                    calls = qd.Calls,
                    totalTime = qd.TotalTime,
                    meanTime = qd.MeanTime,
                    minTime = qd.MinTime,
                    maxTime = qd.MaxTime,
                    rows = qd.Rows,
                    sharedBlksHit = qd.SharedBlksHit,
                    sharedBlksRead = qd.SharedBlksRead,
                    tempBlksRead = qd.TempBlksRead,
                    tempBlksWritten = qd.TempBlksWritten,
                    blkReadTime = qd.BlkReadTime,
                    blkWriteTime = qd.BlkWriteTime
                }).ToList(),
                activeTransactions = (m.ActiveTransactions ?? new List<TransactionDetailDto>()).Select(t => new
                {
                    pid = t.Pid,
                    datname = t.Datname,
                    usename = t.Usename,
                    applicationName = t.ApplicationName,
                    clientAddr = t.ClientAddr,
                    backendStart = t.BackendStart,
                    xactStart = t.XactStart,
                    queryStart = t.QueryStart,
                    state = t.State,
                    query = t.Query,
                    waitEventType = t.WaitEventType,
                    waitEvent = t.WaitEvent,
                    runtime = t.Runtime?.ToString()
                }).ToList(),
                lockDetails = (m.LockDetails ?? new List<LockDetailDto>()).Select(l => new
                {
                    pid = l.Pid,
                    lockType = l.LockType,
                    relation = l.Relation,
                    mode = l.Mode,
                    granted = l.Granted,
                    waitStart = l.WaitStart,
                    query = l.Query
                }).ToList(),
                blockingLocks = (m.BlockingLocks ?? new List<BlockingLockDto>()).Select(bl => new
                {
                    blockedPid = bl.BlockedPid,
                    blockedUser = bl.BlockedUser,
                    blockedQuery = bl.BlockedQuery,
                    blockingPid = bl.BlockingPid,
                    blockingUser = bl.BlockingUser,
                    blockingQuery = bl.BlockingQuery,
                    relation = bl.Relation,
                    blockedMode = bl.BlockedMode,
                    blockingMode = bl.BlockingMode,
                    blockedDuration = bl.BlockedDuration?.ToString()
                }).ToList(),
                walStats = m.WalStats.HasValue ? new
                {
                    totalWalSize = m.WalStats.Value.TotalWalSize,
                    checkpointTimed = m.WalStats.Value.CheckpointTimed,
                    checkpointReq = m.WalStats.Value.CheckpointReq,
                    checkpointWriteTime = m.WalStats.Value.CheckpointWriteTime,
                    checkpointSyncTime = m.WalStats.Value.CheckpointSyncTime,
                    walLevel = m.WalStats.Value.WalLevel,
                    walCompression = m.WalStats.Value.WalCompression,
                    maxWalSize = m.WalStats.Value.MaxWalSize,
                    minWalSize = m.WalStats.Value.MinWalSize
                } : null,
                tablespaces = (m.Tablespaces ?? new List<TablespaceDto>()).Select(ts => new
                {
                    name = ts.Name,
                    location = ts.Location,
                    size = ts.Size
                }).ToList(),
                memoryConfig = m.MemoryConfig.HasValue ? new
                {
                    sharedBuffers = m.MemoryConfig.Value.SharedBuffers,
                    workMem = m.MemoryConfig.Value.WorkMem,
                    maintenanceWorkMem = m.MemoryConfig.Value.MaintenanceWorkMem,
                    effectiveCacheSize = m.MemoryConfig.Value.EffectiveCacheSize,
                    tempBuffers = m.MemoryConfig.Value.TempBuffers,
                    maxConnections = m.MemoryConfig.Value.MaxConnections,
                    walBuffers = m.MemoryConfig.Value.WalBuffers,
                    estimatedTotalMemory = m.MemoryConfig.Value.EstimatedTotalMemory
                } : null,
                systemInfo = m.SystemInfo.HasValue ? new
                {
                    version = m.SystemInfo.Value.Version,
                    serverVersionNum = m.SystemInfo.Value.ServerVersionNum,
                    dataDirectory = m.SystemInfo.Value.DataDirectory,
                    configFile = m.SystemInfo.Value.ConfigFile
                } : null
            });

            return Results.Ok(response);
        })
        .WithName("GetMonitoringMetrics");

        return app;
    }
}
