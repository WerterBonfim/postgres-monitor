using Microsoft.Extensions.Logging;
using Npgsql;
using PostgresMonitor.Infrastructure.LiteDb;
using PostgresMonitor.Core.DTOs;
using PostgresMonitor.Infrastructure.LiteDb.Entities;
using PostgresMonitor.Infrastructure.Repositories;
using System.Text.Json;
using SlowQueryDto = PostgresMonitor.Infrastructure.LiteDb.Entities.SlowQueryDto;
using TableStatsDto = PostgresMonitor.Infrastructure.LiteDb.Entities.TableStatsDto;
using ConnectionStatsDto = PostgresMonitor.Infrastructure.LiteDb.Entities.ConnectionStatsDto;
using LockStatsDto = PostgresMonitor.Infrastructure.LiteDb.Entities.LockStatsDto;
using IndexStatsDto = PostgresMonitor.Infrastructure.LiteDb.Entities.IndexStatsDto;
using IndexRecommendationDto = PostgresMonitor.Infrastructure.LiteDb.Entities.IndexRecommendationDto;
using TableEfficiencyDto = PostgresMonitor.Infrastructure.LiteDb.Entities.TableEfficiencyDto;
using DatabaseEfficiencyDto = PostgresMonitor.Infrastructure.LiteDb.Entities.DatabaseEfficiencyDto;

namespace PostgresMonitor.Infrastructure.Services;

public sealed class MonitoringService
{
    private readonly ILogger<MonitoringService> _logger;
    private readonly ConnectionRepository _connectionRepository;
    private readonly CryptoService _cryptoService;
    private readonly LiteDbContext _context;
    private readonly QueryHistoryService _queryHistoryService;

    public MonitoringService(
        ILogger<MonitoringService> logger,
        ConnectionRepository connectionRepository,
        CryptoService cryptoService,
        LiteDbContext context,
        QueryHistoryService queryHistoryService)
    {
        _logger = logger;
        _connectionRepository = connectionRepository;
        _cryptoService = cryptoService;
        _context = context;
        _queryHistoryService = queryHistoryService;
    }

    public async Task CollectMetricsAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        var connection = await _connectionRepository.GetByIdAsync(connectionId);
        if (connection == null)
        {
            _logger.LogWarning("Connection {ConnectionId} not found", connectionId);
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        var password = _cryptoService.Decrypt(connection.PasswordHash);
        var connectionString = $"Host={connection.Host};Port={connection.Port};Database={connection.Database};Username={connection.Username};Password={password};SslMode={(connection.SslEnabled ? SslMode.Require : SslMode.Prefer)}";

        await using var pgConnection = new NpgsqlConnection(connectionString);
        try
        {
            await pgConnection.OpenAsync(cancellationToken);
        }
        catch (Exception)
        {
            throw;
        }

        var metric = new MonitoringMetricEntity
        {
            ConnectionId = connectionId,
            CollectedAt = DateTime.UtcNow,
        };

        try
        {
            metric.ConnectionStats = await CollectConnectionStatsAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting connection stats");
        }

        try
        {
            metric.LockStats = await CollectLockStatsAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting lock stats");
        }

        try
        {
            metric.SlowQueries = await CollectSlowQueriesAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting slow queries");
        }

        try
        {
            metric.TableStats = await CollectTableStatsAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting table stats");
        }

        try
        {
            metric.DatabaseStats = await CollectDatabaseStatsAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting database stats");
        }

        try
        {
            metric.IndexStats = await CollectIndexStatsAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting index stats");
            metric.IndexStats = new List<IndexStatsDto>();
        }

        try
        {
            metric.IndexRecommendations = await CollectIndexRecommendationsAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting index recommendations");
            metric.IndexRecommendations = new List<IndexRecommendationDto>();
        }

        try
        {
            metric.TableEfficiency = await CollectTableEfficiencyAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting table efficiency");
            metric.TableEfficiency = new List<TableEfficiencyDto>();
        }

        try
        {
            metric.DatabaseEfficiency = await CollectDatabaseEfficiencyAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting database efficiency");
        }

        // Verificar se pg_stat_statements está disponível
        metric.PgStatStatementsAvailable = await CheckPgStatStatementsAsync(pgConnection, cancellationToken);

        // Coletar queries detalhadas (requer pg_stat_statements)
        if (metric.PgStatStatementsAvailable)
        {
            try
            {
                metric.QueryDetails = await CollectQueryDetailsAsync(pgConnection, cancellationToken);
                
                // Salvar queries no histórico
                foreach (var queryDetail in metric.QueryDetails)
                {
                    await _queryHistoryService.SaveQueryAsync(connectionId, queryDetail);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error collecting query details");
                metric.QueryDetails = new List<QueryDetailDto>();
            }
        }

        // Coletar transações ativas
        try
        {
            metric.ActiveTransactions = await CollectActiveTransactionsAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting active transactions");
            metric.ActiveTransactions = new List<TransactionDetailDto>();
        }

        // Coletar detalhes de locks
        try
        {
            metric.LockDetails = await CollectLockDetailsAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting lock details");
            metric.LockDetails = new List<LockDetailDto>();
        }

        // Coletar bloqueios (quem bloqueia quem)
        try
        {
            metric.BlockingLocks = await CollectBlockingLocksAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting blocking locks");
            metric.BlockingLocks = new List<BlockingLockDto>();
        }

        // Coletar estatísticas WAL
        try
        {
            metric.WalStats = await CollectWalStatsAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting WAL stats");
        }

        // Coletar tablespaces
        try
        {
            metric.Tablespaces = await CollectTablespacesAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting tablespaces");
            metric.Tablespaces = new List<TablespaceDto>();
        }

        // Coletar configurações de memória
        try
        {
            metric.MemoryConfig = await CollectMemoryConfigAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting memory config");
        }

        // Coletar informações do sistema
        try
        {
            metric.SystemInfo = await CollectSystemInfoAsync(pgConnection, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting system info");
        }

        try
        {
            await Task.Run(() => _context.Metrics.Insert(metric), cancellationToken);
            _logger.LogInformation("Collected metrics for connection {ConnectionId}", connectionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving metric to LiteDB");
            throw;
        }
    }

    private async Task<ConnectionStatsDto?> CollectConnectionStatsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var query = @"
            SELECT 
                COUNT(*) FILTER (WHERE state = 'active') as active_connections,
                COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
                COUNT(*) as total_connections
            FROM pg_stat_activity
            WHERE datname = current_database();";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (await reader.ReadAsync(cancellationToken))
        {
            return new ConnectionStatsDto(
                ActiveConnections: reader.GetInt32(0),
                IdleConnections: reader.GetInt32(1),
                TotalConnections: reader.GetInt32(2)
            );
        }

        return null;
    }

    private async Task<LockStatsDto?> CollectLockStatsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var query = @"
            SELECT 
                COUNT(*) as lock_count,
                COUNT(DISTINCT relation) FILTER (WHERE relation IS NOT NULL) as locked_relations
            FROM pg_locks;";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (await reader.ReadAsync(cancellationToken))
        {
            return new LockStatsDto(
                LockCount: reader.GetInt32(0),
                LockedRelations: reader.GetInt32(1)
            );
        }

        return null;
    }

    private async Task<List<SlowQueryDto>> CollectSlowQueriesAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var slowQueries = new List<SlowQueryDto>();

        // Tenta usar pg_stat_statements primeiro (mais preciso)
        var query = @"
            SELECT 
                query,
                calls,
                total_exec_time as total_time,
                mean_exec_time as mean_time,
                max_exec_time as max_time
            FROM pg_stat_statements
            WHERE mean_exec_time > 100
            ORDER BY mean_exec_time DESC
            LIMIT 10;";

        try
        {
            await using var command = new NpgsqlCommand(query, connection);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                slowQueries.Add(new SlowQueryDto(
                    Query: reader.GetString(0),
                    Calls: reader.GetInt64(1),
                    TotalTime: reader.GetDecimal(2),
                    MeanTime: reader.GetDecimal(3),
                    MaxTime: reader.GetDecimal(4)
                ));
            }

            return slowQueries;
        }
        catch (PostgresException ex) when (ex.SqlState == "42883" || ex.SqlState == "42P01") // pg_stat_statements não disponível ou não existe
        {
            _logger.LogDebug("pg_stat_statements not available (SqlState: {SqlState}), falling back to pg_stat_activity", ex.SqlState);
        }

        // Fallback para pg_stat_activity (menos preciso, mas sempre disponível)
        query = @"
            SELECT 
                query,
                state,
                query_start,
                state_change
            FROM pg_stat_activity
            WHERE state = 'active' 
                AND query NOT LIKE '%pg_stat_activity%'
                AND query_start < NOW() - INTERVAL '1 second'
            ORDER BY query_start
            LIMIT 10;";

        await using var fallbackCommand = new NpgsqlCommand(query, connection);
        await using var fallbackReader = await fallbackCommand.ExecuteReaderAsync(cancellationToken);

        while (await fallbackReader.ReadAsync(cancellationToken))
        {
            var queryText = fallbackReader.GetString(0);
            if (string.IsNullOrWhiteSpace(queryText))
                continue;

            var queryStart = fallbackReader.GetDateTime(2);
            var elapsed = (decimal)(DateTime.UtcNow - queryStart).TotalMilliseconds;

            slowQueries.Add(new SlowQueryDto(
                Query: queryText.Length > 500 ? queryText.Substring(0, 500) + "..." : queryText,
                Calls: 1,
                TotalTime: elapsed,
                MeanTime: elapsed,
                MaxTime: elapsed
            ));
        }

        return slowQueries;
    }

    private async Task<List<TableStatsDto>> CollectTableStatsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var tableStats = new List<TableStatsDto>();

        var query = @"
            SELECT 
                schemaname,
                relname as tablename,
                seq_scan,
                seq_tup_read,
                idx_scan,
                idx_tup_fetch,
                n_tup_ins as tuple_insert,
                n_tup_upd as tuple_update,
                n_tup_del as tuple_delete
            FROM pg_stat_user_tables
            ORDER BY seq_scan + idx_scan DESC
            LIMIT 50;";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            tableStats.Add(new TableStatsDto(
                SchemaName: reader.GetString(0),
                TableName: reader.GetString(1),
                SeqScan: reader.GetInt64(2),
                SeqTupRead: reader.GetInt64(3),
                IdxScan: reader.GetInt64(4),
                IdxTupFetch: reader.GetInt64(5),
                TupleInsert: reader.GetInt64(6),
                TupleUpdate: reader.GetInt64(7),
                TupleDelete: reader.GetInt64(8)
            ));
        }

        return tableStats;
    }

    private async Task<Dictionary<string, object>> CollectDatabaseStatsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var stats = new Dictionary<string, object>();

        var query = @"
            SELECT 
                datname,
                numbackends,
                xact_commit,
                xact_rollback,
                blks_read,
                blks_hit,
                tup_returned,
                tup_fetched,
                tup_inserted,
                tup_updated,
                tup_deleted,
                temp_files,
                temp_bytes
            FROM pg_stat_database
            WHERE datname = current_database();";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (await reader.ReadAsync(cancellationToken))
        {
            stats["databaseName"] = reader.GetString(0);
            stats["numBackends"] = reader.GetInt32(1);
            stats["xactCommit"] = reader.GetInt64(2);
            stats["xactRollback"] = reader.GetInt64(3);
            stats["blksRead"] = reader.GetInt64(4);
            stats["blksHit"] = reader.GetInt64(5);
            stats["tupReturned"] = reader.GetInt64(6);
            stats["tupFetched"] = reader.GetInt64(7);
            stats["tupInserted"] = reader.GetInt64(8);
            stats["tupUpdated"] = reader.GetInt64(9);
            stats["tupDeleted"] = reader.GetInt64(10);
            stats["tempFiles"] = reader.GetInt64(11);
            stats["tempBytes"] = reader.GetInt64(12);
        }

        return stats;
    }

    private async Task<List<IndexStatsDto>> CollectIndexStatsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var indexStats = new List<IndexStatsDto>();

        var query = @"
            SELECT 
                schemaname,
                relname as tablename,
                indexrelname as indexname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch,
                pg_relation_size(indexrelid) as index_size,
                pg_relation_size(relid) as table_size
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public'
            ORDER BY idx_scan DESC;";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var indexSize = reader.GetInt64(6);
            var tableSize = reader.GetInt64(7);
            var indexScans = reader.GetInt64(3);
            
            var percentOfTable = tableSize > 0 ? (double)indexSize / tableSize * 100 : 0;
            
            string status;
            if (indexScans == 0)
                status = "unused";
            else if (indexScans < 10)
                status = "low_usage";
            else if (indexScans < 1000)
                status = "normal";
            else
                status = "high_usage";

            indexStats.Add(new IndexStatsDto(
                SchemaName: reader.GetString(0),
                TableName: reader.GetString(1),
                IndexName: reader.GetString(2),
                IndexScans: indexScans,
                IndexTuplesRead: reader.GetInt64(4),
                IndexTuplesFetched: reader.GetInt64(5),
                IndexSize: indexSize,
                TableSize: tableSize,
                PercentOfTable: percentOfTable,
                Status: status
            ));
        }

        return indexStats;
    }

    private async Task<List<IndexRecommendationDto>> CollectIndexRecommendationsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var recommendations = new List<IndexRecommendationDto>();

        // Tabelas com muitos Seq Scans e poucos Index Scans
        var query = @"
            SELECT 
                schemaname,
                relname as tablename,
                seq_scan,
                seq_tup_read,
                idx_scan,
                pg_total_relation_size(schemaname||'.'||relname) as table_size
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
                AND seq_scan > 1000
                AND (idx_scan = 0 OR seq_scan::float / NULLIF(seq_scan + idx_scan, 0)::float > 0.8)
            ORDER BY seq_tup_read DESC
            LIMIT 20;";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var schemaName = reader.GetString(0);
            var tableName = reader.GetString(1);
            var seqScan = reader.GetInt64(2);
            var seqTupRead = reader.GetInt64(3);
            var tableSize = reader.GetInt64(5);

            var impact = tableSize > 100_000_000 ? "high" : (tableSize > 10_000_000 ? "medium" : "low");

            recommendations.Add(new IndexRecommendationDto(
                TableName: tableName,
                SchemaName: schemaName,
                ColumnName: null,
                Reason: $"Tabela '{tableName}' tem {seqScan} sequential scans e poucos index scans. Considere criar índices nas colunas usadas em WHERE/JOIN/ORDER BY.",
                ExpectedImpact: impact,
                SqlScript: $"-- Analise a query primeiro:\n-- EXPLAIN ANALYZE SELECT * FROM {schemaName}.{tableName} WHERE coluna = 'valor';\n-- Depois crie o índice apropriado:\n-- CREATE INDEX CONCURRENTLY idx_{tableName.ToLower()}_optimized ON {schemaName}.{tableName}(coluna_relevante);",
                RecommendationType: "create_index"
            ));
        }

        // Índices não utilizados grandes (candidatos para remoção)
        var unusedIndexQuery = @"
            SELECT 
                schemaname,
                relname as tablename,
                indexrelname as indexname,
                pg_relation_size(indexrelid) as index_size
            FROM pg_stat_user_indexes
            WHERE schemaname = 'public'
                AND idx_scan = 0
                AND pg_relation_size(indexrelid) > 10485760
            ORDER BY pg_relation_size(indexrelid) DESC
            LIMIT 10;";

        await using var unusedCommand = new NpgsqlCommand(unusedIndexQuery, connection);
        await using var unusedReader = await unusedCommand.ExecuteReaderAsync(cancellationToken);

        while (await unusedReader.ReadAsync(cancellationToken))
        {
            var schemaName = unusedReader.GetString(0);
            var tableName = unusedReader.GetString(1);
            var indexName = unusedReader.GetString(2);
            var indexSize = unusedReader.GetInt64(3);

            var sizeMB = indexSize / 1024.0 / 1024.0;

            recommendations.Add(new IndexRecommendationDto(
                TableName: tableName,
                SchemaName: schemaName,
                ColumnName: null,
                Reason: $"Índice '{indexName}' não é utilizado (0 scans) e ocupa {sizeMB:F2} MB. Considere removê-lo se não for necessário.",
                ExpectedImpact: "low",
                SqlScript: $"DROP INDEX CONCURRENTLY {schemaName}.{indexName};",
                RecommendationType: "remove_index"
            ));
        }

        return recommendations;
    }

    private async Task<List<TableEfficiencyDto>> CollectTableEfficiencyAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var efficiency = new List<TableEfficiencyDto>();

        var query = @"
            SELECT 
                t.schemaname,
                t.relname as tablename,
                t.seq_scan,
                t.seq_tup_read,
                t.idx_scan,
                t.idx_tup_fetch,
                s.heap_blks_read,
                s.heap_blks_hit,
                pg_total_relation_size(t.schemaname||'.'||t.relname) as table_size
            FROM pg_stat_user_tables t
            LEFT JOIN pg_statio_user_tables s 
                ON t.schemaname = s.schemaname AND t.relid = s.relid
            WHERE t.schemaname = 'public'
            ORDER BY t.seq_scan + t.idx_scan DESC
            LIMIT 50;";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var seqScan = reader.GetInt64(2);
            var idxScan = reader.GetInt64(4);
            var heapRead = reader.IsDBNull(6) ? 0L : reader.GetInt64(6);
            var heapHit = reader.IsDBNull(7) ? 0L : reader.GetInt64(7);

            var totalScans = seqScan + idxScan;
            var seqIndexRatio = totalScans > 0 ? (double)seqScan / totalScans : 0;

            var totalBlks = heapHit + heapRead;
            var cacheHitRatio = totalBlks > 0 ? (double)heapHit / totalBlks * 100 : 0;

            var needsAttention = seqIndexRatio > 0.8 || cacheHitRatio < 90;

            efficiency.Add(new TableEfficiencyDto(
                SchemaName: reader.GetString(0),
                TableName: reader.GetString(1),
                SeqScanCount: seqScan,
                IndexScanCount: idxScan,
                SeqIndexRatio: seqIndexRatio,
                CacheHitRatio: cacheHitRatio,
                TableSize: reader.GetInt64(8),
                NeedsAttention: needsAttention
            ));
        }

        return efficiency;
    }

    private async Task<DatabaseEfficiencyDto?> CollectDatabaseEfficiencyAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        // Cache hit ratio global
        var cacheQuery = @"
            SELECT 
                COALESCE(sum(heap_blks_read), 0) as heap_read,
                COALESCE(sum(heap_blks_hit), 0) as heap_hit
            FROM pg_statio_user_tables;";

        double globalCacheHitRatio = 0;
        try
        {
            await using var cacheCommand = new NpgsqlCommand(cacheQuery, connection);
            await using var cacheReader = await cacheCommand.ExecuteReaderAsync(cancellationToken);

            if (await cacheReader.ReadAsync(cancellationToken))
            {
                var heapRead = cacheReader.GetInt64(0);
                var heapHit = cacheReader.GetInt64(1);
                var total = heapHit + heapRead;
                if (total > 0)
                    globalCacheHitRatio = (double)heapHit / total * 100;
            }
            // DataReader será fechado automaticamente pelo await using
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting cache hit ratio");
        }

        // Commits vs rollbacks e temp files
        var dbStatsQuery = @"
            SELECT 
                xact_commit,
                xact_rollback,
                temp_files,
                temp_bytes
            FROM pg_stat_database
            WHERE datname = current_database();";

        await using var dbCommand = new NpgsqlCommand(dbStatsQuery, connection);
        await using var dbReader = await dbCommand.ExecuteReaderAsync(cancellationToken);

        if (await dbReader.ReadAsync(cancellationToken))
        {
            var commits = dbReader.GetInt64(0);
            var rollbacks = dbReader.GetInt64(1);
            var tempFiles = dbReader.GetInt64(2);
            var tempBytes = dbReader.GetInt64(3);

            var totalTransactions = commits + rollbacks;
            var commitRollbackRatio = totalTransactions > 0 ? (double)commits / totalTransactions * 100 : 0;

            return new DatabaseEfficiencyDto(
                GlobalCacheHitRatio: globalCacheHitRatio,
                CommitRollbackRatio: commitRollbackRatio,
                TempFilesCount: tempFiles,
                TempBytes: tempBytes
            );
        }

        return null;
    }

    private async Task<bool> CheckPgStatStatementsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var query = @"
            SELECT EXISTS (
                SELECT 1 
                FROM pg_extension 
                WHERE extname = 'pg_stat_statements'
            );";

        await using var command = new NpgsqlCommand(query, connection);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is bool available && available;
    }

    private async Task<List<QueryDetailDto>> CollectQueryDetailsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var queryDetails = new List<QueryDetailDto>();

        var query = @"
            SELECT 
                query,
                calls,
                total_exec_time as total_time,
                mean_exec_time as mean_time,
                min_exec_time as min_time,
                max_exec_time as max_time,
                rows,
                shared_blks_hit,
                shared_blks_read,
                temp_blks_read,
                temp_blks_written,
                blk_read_time,
                blk_write_time
            FROM pg_stat_statements
            WHERE calls > 0
            ORDER BY total_exec_time DESC
            LIMIT 50;";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            queryDetails.Add(new QueryDetailDto(
                Query: reader.GetString(0),
                Calls: reader.GetInt64(1),
                TotalTime: reader.GetDecimal(2),
                MeanTime: reader.GetDecimal(3),
                MinTime: reader.GetDecimal(4),
                MaxTime: reader.GetDecimal(5),
                Rows: reader.GetInt64(6),
                SharedBlksHit: reader.GetInt64(7),
                SharedBlksRead: reader.GetInt64(8),
                TempBlksRead: reader.GetInt64(9),
                TempBlksWritten: reader.GetInt64(10),
                BlkReadTime: reader.GetDecimal(11),
                BlkWriteTime: reader.GetDecimal(12)
            ));
        }

        return queryDetails;
    }

    private async Task<List<TransactionDetailDto>> CollectActiveTransactionsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var transactions = new List<TransactionDetailDto>();

        var query = @"
            SELECT 
                pid,
                datname,
                usename,
                application_name,
                client_addr::text,
                backend_start,
                xact_start,
                query_start,
                state,
                query,
                wait_event_type,
                wait_event,
                CASE 
                    WHEN query_start IS NOT NULL THEN now() - query_start
                    ELSE NULL
                END as runtime
            FROM pg_stat_activity
            WHERE datname IS NOT NULL
            ORDER BY query_start DESC NULLS LAST;";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            transactions.Add(new TransactionDetailDto(
                Pid: reader.GetInt32(0),
                Datname: reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                Usename: reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                ApplicationName: reader.IsDBNull(3) ? null : reader.GetString(3),
                ClientAddr: reader.IsDBNull(4) ? null : reader.GetString(4),
                BackendStart: reader.GetDateTime(5),
                XactStart: reader.IsDBNull(6) ? null : reader.GetDateTime(6),
                QueryStart: reader.IsDBNull(7) ? null : reader.GetDateTime(7),
                State: reader.IsDBNull(8) ? string.Empty : reader.GetString(8),
                Query: reader.IsDBNull(9) ? null : reader.GetString(9),
                WaitEventType: reader.IsDBNull(10) ? null : reader.GetString(10),
                WaitEvent: reader.IsDBNull(11) ? null : reader.GetString(11),
                Runtime: reader.IsDBNull(12) ? null : (TimeSpan?)reader.GetTimeSpan(12)
            ));
        }

        return transactions;
    }

    private async Task<List<LockDetailDto>> CollectLockDetailsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var lockDetails = new List<LockDetailDto>();

        var query = @"
            SELECT 
                l.pid,
                l.locktype,
                l.relation::regclass::text,
                l.mode,
                l.granted,
                l.waitstart,
                a.query
            FROM pg_locks l
            LEFT JOIN pg_stat_activity a ON a.pid = l.pid
            ORDER BY l.granted, l.waitstart NULLS LAST;";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            lockDetails.Add(new LockDetailDto(
                Pid: reader.GetInt32(0),
                LockType: reader.GetString(1),
                Relation: reader.IsDBNull(2) ? null : reader.GetString(2),
                Mode: reader.GetString(3),
                Granted: reader.GetBoolean(4),
                WaitStart: reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                Query: reader.IsDBNull(6) ? null : reader.GetString(6)
            ));
        }

        return lockDetails;
    }

    private async Task<List<BlockingLockDto>> CollectBlockingLocksAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var blockingLocks = new List<BlockingLockDto>();

        var query = @"
            SELECT 
                blocked_locks.pid AS blocked_pid,
                blocked_activity.usename AS blocked_user,
                blocked_activity.query AS blocked_query,
                blocking_locks.pid AS blocking_pid,
                blocking_activity.usename AS blocking_user,
                blocking_activity.query AS blocking_query,
                blocked_locks.relation::regclass::text AS relation,
                blocked_locks.mode AS blocked_mode,
                blocking_locks.mode AS blocking_mode,
                now() - blocked_activity.query_start AS blocked_duration
            FROM pg_catalog.pg_locks blocked_locks
            JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
            JOIN pg_catalog.pg_locks blocking_locks
              ON blocking_locks.relation = blocked_locks.relation
                 AND blocking_locks.granted = true
                 AND blocking_locks.pid != blocked_locks.pid
            JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
            WHERE NOT blocked_locks.granted
            ORDER BY blocked_activity.query_start;";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            blockingLocks.Add(new BlockingLockDto(
                BlockedPid: reader.GetInt32(0),
                BlockedUser: reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                BlockedQuery: reader.IsDBNull(2) ? null : reader.GetString(2),
                BlockingPid: reader.GetInt32(3),
                BlockingUser: reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                BlockingQuery: reader.IsDBNull(5) ? null : reader.GetString(5),
                Relation: reader.IsDBNull(6) ? null : reader.GetString(6),
                BlockedMode: reader.GetString(7),
                BlockingMode: reader.GetString(8),
                BlockedDuration: reader.IsDBNull(9) ? null : (TimeSpan?)reader.GetTimeSpan(9)
            ));
        }

        return blockingLocks;
    }

    private async Task<WalStatsDto?> CollectWalStatsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        // Coletar estatísticas de checkpoint
        var checkpointQuery = @"
            SELECT 
                checkpoints_timed,
                checkpoints_req,
                checkpoint_write_time,
                checkpoint_sync_time
            FROM pg_stat_bgwriter
            LIMIT 1;";

        long checkpointTimed = 0;
        long checkpointReq = 0;
        decimal checkpointWriteTime = 0;
        decimal checkpointSyncTime = 0;

        await using (var command = new NpgsqlCommand(checkpointQuery, connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (await reader.ReadAsync(cancellationToken))
            {
                checkpointTimed = reader.GetInt64(0);
                checkpointReq = reader.GetInt64(1);
                checkpointWriteTime = reader.GetDecimal(2);
                checkpointSyncTime = reader.GetDecimal(3);
            }
        }

        // Coletar tamanho do WAL
        long totalWalSize = 0;
        try
        {
            var walSizeQuery = @"
                SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0');";
            await using var command = new NpgsqlCommand(walSizeQuery, connection);
            var result = await command.ExecuteScalarAsync(cancellationToken);
            if (result != null && result != DBNull.Value)
            {
                totalWalSize = Convert.ToInt64(result);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not get WAL size");
        }

        // Coletar configurações WAL
        var configQuery = @"
            SELECT 
                name,
                setting
            FROM pg_settings
            WHERE name IN ('wal_level', 'wal_compression', 'max_wal_size', 'min_wal_size');";

        string? walLevel = null;
        bool? walCompression = null;
        long? maxWalSize = null;
        long? minWalSize = null;

        await using (var command = new NpgsqlCommand(configQuery, connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var name = reader.GetString(0);
                var setting = reader.GetString(1);

                switch (name)
                {
                    case "wal_level":
                        walLevel = setting;
                        break;
                    case "wal_compression":
                        walCompression = setting == "on";
                        break;
                    case "max_wal_size":
                        maxWalSize = long.Parse(setting);
                        break;
                    case "min_wal_size":
                        minWalSize = long.Parse(setting);
                        break;
                }
            }
        }

        return new WalStatsDto(
            TotalWalSize: totalWalSize,
            CheckpointTimed: checkpointTimed,
            CheckpointReq: checkpointReq,
            CheckpointWriteTime: checkpointWriteTime,
            CheckpointSyncTime: checkpointSyncTime,
            WalLevel: walLevel,
            WalCompression: walCompression,
            MaxWalSize: maxWalSize,
            MinWalSize: minWalSize
        );
    }

    private async Task<List<TablespaceDto>> CollectTablespacesAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var tablespaces = new List<TablespaceDto>();

        var query = @"
            SELECT 
                spcname AS tablespace_name,
                pg_tablespace_location(oid) AS location,
                pg_tablespace_size(spcname) AS size
            FROM pg_tablespace
            WHERE spcname NOT IN ('pg_default', 'pg_global');";

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            tablespaces.Add(new TablespaceDto(
                Name: reader.GetString(0),
                Location: reader.IsDBNull(1) ? null : reader.GetString(1),
                Size: reader.GetInt64(2)
            ));
        }

        return tablespaces;
    }

    private async Task<MemoryConfigDto?> CollectMemoryConfigAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        var query = @"
            SELECT 
                name,
                setting
            FROM pg_settings
            WHERE name IN (
                'shared_buffers',
                'work_mem',
                'maintenance_work_mem',
                'effective_cache_size',
                'temp_buffers',
                'max_connections',
                'wal_buffers'
            );";

        long sharedBuffers = 0;
        long workMem = 0;
        long maintenanceWorkMem = 0;
        long effectiveCacheSize = 0;
        long tempBuffers = 0;
        int maxConnections = 0;
        long walBuffers = 0;

        await using var command = new NpgsqlCommand(query, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            var name = reader.GetString(0);
            var setting = reader.GetString(1);
            var value = long.Parse(setting);

            switch (name)
            {
                case "shared_buffers":
                    sharedBuffers = value;
                    break;
                case "work_mem":
                    workMem = value;
                    break;
                case "maintenance_work_mem":
                    maintenanceWorkMem = value;
                    break;
                case "effective_cache_size":
                    effectiveCacheSize = value;
                    break;
                case "temp_buffers":
                    tempBuffers = value;
                    break;
                case "max_connections":
                    maxConnections = (int)value;
                    break;
                case "wal_buffers":
                    walBuffers = value;
                    break;
            }
        }

        // Estimativa de memória total
        var estimatedTotalMemory = sharedBuffers + (workMem * maxConnections) + maintenanceWorkMem + effectiveCacheSize + walBuffers;

        return new MemoryConfigDto(
            SharedBuffers: sharedBuffers,
            WorkMem: workMem,
            MaintenanceWorkMem: maintenanceWorkMem,
            EffectiveCacheSize: effectiveCacheSize,
            TempBuffers: tempBuffers,
            MaxConnections: maxConnections,
            WalBuffers: walBuffers,
            EstimatedTotalMemory: estimatedTotalMemory
        );
    }

    private async Task<SystemInfoDto?> CollectSystemInfoAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        // Versão
        string version = string.Empty;
        int serverVersionNum = 0;

        await using (var command = new NpgsqlCommand("SELECT version(), current_setting('server_version_num')::int;", connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            if (await reader.ReadAsync(cancellationToken))
            {
                version = reader.GetString(0);
                serverVersionNum = reader.GetInt32(1);
            }
        }

        // Diretórios e arquivos
        var configQuery = @"
            SELECT 
                name,
                setting
            FROM pg_settings
            WHERE name IN ('data_directory', 'config_file');";

        string? dataDirectory = null;
        string? configFile = null;

        await using (var command = new NpgsqlCommand(configQuery, connection))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                var name = reader.GetString(0);
                var setting = reader.GetString(1);

                switch (name)
                {
                    case "data_directory":
                        dataDirectory = setting;
                        break;
                    case "config_file":
                        configFile = setting;
                        break;
                }
            }
        }

        return new SystemInfoDto(
            Version: version,
            ServerVersionNum: serverVersionNum,
            DataDirectory: dataDirectory,
            ConfigFile: configFile
        );
    }

    public async Task<List<string>> GetPostgresLogsAsync(string connectionId, int maxLines = 100, CancellationToken cancellationToken = default)
    {
        var connection = await _connectionRepository.GetByIdAsync(connectionId);
        if (connection == null)
        {
            _logger.LogWarning("Connection {ConnectionId} not found", connectionId);
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        var password = _cryptoService.Decrypt(connection.PasswordHash);
        var connectionString = $"Host={connection.Host};Port={connection.Port};Database={connection.Database};Username={connection.Username};Password={password};SslMode={(connection.SslEnabled ? SslMode.Require : SslMode.Prefer)}";

        await using var pgConnection = new NpgsqlConnection(connectionString);
        try
        {
            await pgConnection.OpenAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting to PostgreSQL for logs");
            throw;
        }

        var logs = new List<string>();

        try
        {
            // Primeiro, tentar obter o diretório de logs
            var logDirectoryQuery = @"
                SELECT setting 
                FROM pg_settings 
                WHERE name = 'log_directory';";

            string? logDirectory = null;
            await using (var command = new NpgsqlCommand(logDirectoryQuery, pgConnection))
            await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
            {
                if (await reader.ReadAsync(cancellationToken))
                {
                    logDirectory = reader.IsDBNull(0) ? null : reader.GetString(0);
                }
            }

            // Tentar obter o nome do arquivo de log
            var logFileNameQuery = @"
                SELECT setting 
                FROM pg_settings 
                WHERE name = 'log_filename';";

            string? logFileName = null;
            await using (var command = new NpgsqlCommand(logFileNameQuery, pgConnection))
            await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
            {
                if (await reader.ReadAsync(cancellationToken))
                {
                    logFileName = reader.IsDBNull(0) ? null : reader.GetString(0);
                }
            }

            // Tentar ler o arquivo de log usando pg_read_file
            // O caminho pode ser relativo ao data_directory ou absoluto
            var dataDirectoryQuery = @"
                SELECT setting 
                FROM pg_settings 
                WHERE name = 'data_directory';";

            string? dataDirectory = null;
            await using (var command = new NpgsqlCommand(dataDirectoryQuery, pgConnection))
            await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
            {
                if (await reader.ReadAsync(cancellationToken))
                {
                    dataDirectory = reader.IsDBNull(0) ? null : reader.GetString(0);
                }
            }

            // Tentar diferentes caminhos possíveis para o arquivo de log
            var possiblePaths = new List<string>();

            if (!string.IsNullOrEmpty(logDirectory) && !string.IsNullOrEmpty(logFileName))
            {
                // Se log_directory é relativo, é relativo ao data_directory
                if (!Path.IsPathRooted(logDirectory) && !string.IsNullOrEmpty(dataDirectory))
                {
                    possiblePaths.Add(Path.Combine(dataDirectory, logDirectory, logFileName));
                }
                else if (Path.IsPathRooted(logDirectory))
                {
                    possiblePaths.Add(Path.Combine(logDirectory, logFileName));
                }
            }

            // Tentar caminhos padrão com data de hoje
            if (!string.IsNullOrEmpty(dataDirectory))
            {
                var today = DateTime.Now.ToString("yyyy-MM-dd");
                possiblePaths.Add(Path.Combine(dataDirectory, "log", $"postgresql-{today}.log"));
                possiblePaths.Add(Path.Combine(dataDirectory, "pg_log", $"postgresql-{today}.log"));
            }

            // Tentar ler usando pg_read_file para cada caminho possível
            foreach (var logPath in possiblePaths)
            {
                try
                {
                    // Escapar aspas simples no caminho para SQL
                    var escapedPath = logPath.Replace("'", "''");
                    var readQuery = $@"
                        SELECT pg_read_file('{escapedPath}', 0, 1000000);";

                    await using var command = new NpgsqlCommand(readQuery, pgConnection);
                    var result = await command.ExecuteScalarAsync(cancellationToken);
                    
                    if (result != null && result != DBNull.Value)
                    {
                        var logContent = result.ToString();
                        if (!string.IsNullOrEmpty(logContent))
                        {
                            var lines = logContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                            // Pegar as últimas maxLines
                            logs.AddRange(lines.TakeLast(maxLines));
                            break;
                        }
                    }
                }
                catch (PostgresException ex) when (ex.SqlState == "42501" || ex.SqlState == "42883" || ex.SqlState == "58P01")
                {
                    // Permissão negada, função não existe, ou arquivo não encontrado
                    _logger.LogDebug("Cannot read log file {LogPath}: {Message}", logPath, ex.Message);
                    continue;
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("Error reading log file {LogPath}: {Message}", logPath, ex.Message);
                    continue;
                }
            }

            // Se não conseguiu ler nenhum arquivo, retornar uma mensagem informativa
            if (logs.Count == 0)
            {
                logs.Add("Não foi possível acessar os logs do PostgreSQL.");
                logs.Add("Possíveis razões:");
                logs.Add("1. O arquivo de log não está no diretório de dados do PostgreSQL");
                logs.Add("2. O usuário não tem permissão para ler o arquivo de log");
                logs.Add("3. O log está configurado para ser enviado para syslog ou outro destino");
                logs.Add("4. O PostgreSQL está configurado para não gerar arquivos de log");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading PostgreSQL logs");
            logs.Add($"Erro ao ler logs: {ex.Message}");
        }

        return logs;
    }

    public async Task<IndexDetailsDto> GetIndexDetailsAsync(string connectionId, string schemaName, string tableName, string indexName, CancellationToken cancellationToken = default)
    {
        var connection = await _connectionRepository.GetByIdAsync(connectionId);
        if (connection == null)
        {
            _logger.LogWarning("Connection {ConnectionId} not found", connectionId);
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        var password = _cryptoService.Decrypt(connection.PasswordHash);
        var connectionString = $"Host={connection.Host};Port={connection.Port};Database={connection.Database};Username={connection.Username};Password={password};SslMode={(connection.SslEnabled ? SslMode.Require : SslMode.Prefer)}";

        await using var pgConnection = new NpgsqlConnection(connectionString);
        try
        {
            await pgConnection.OpenAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting to PostgreSQL for index details");
            throw;
        }

        // Obter informações básicas do índice
        var indexInfoQuery = @"
            SELECT 
                i.schemaname,
                i.relname as tablename,
                i.indexrelname as indexname,
                i.idx_scan,
                i.idx_tup_read,
                i.idx_tup_fetch,
                pg_relation_size(i.indexrelid) as index_size,
                pg_relation_size(i.relid) as table_size,
                idx.indisunique as is_unique,
                idx.indisprimary as is_primary,
                idx.indisvalid as is_valid,
                pg_get_indexdef(i.indexrelid) as index_definition
            FROM pg_stat_user_indexes i
            JOIN pg_index idx ON idx.indexrelid = i.indexrelid
            WHERE i.schemaname = @schemaName
                AND i.relname = @tableName
                AND i.indexrelname = @indexName;";

        await using var indexInfoCommand = new NpgsqlCommand(indexInfoQuery, pgConnection);
        indexInfoCommand.Parameters.AddWithValue("schemaName", schemaName);
        indexInfoCommand.Parameters.AddWithValue("tableName", tableName);
        indexInfoCommand.Parameters.AddWithValue("indexName", indexName);

        await using var indexInfoReader = await indexInfoCommand.ExecuteReaderAsync(cancellationToken);

        if (!await indexInfoReader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException($"Index {schemaName}.{tableName}.{indexName} not found");
        }

        long indexScans, indexTuplesRead, indexTuplesFetched, indexSize, tableSize;
        bool isUnique, isPrimary, isValid;
        string indexDefinition;
        
        try
        {
            // Query retorna: 0=schemaname, 1=tablename, 2=indexname, 3=idx_scan, 4=idx_tup_read, 5=idx_tup_fetch,
            // 6=index_size, 7=table_size, 8=is_unique, 9=is_primary, 10=is_valid, 11=index_definition
            indexScans = indexInfoReader.IsDBNull(3) ? 0L : indexInfoReader.GetInt64(3);
            indexTuplesRead = indexInfoReader.IsDBNull(4) ? 0L : indexInfoReader.GetInt64(4);
            indexTuplesFetched = indexInfoReader.IsDBNull(5) ? 0L : indexInfoReader.GetInt64(5);
            indexSize = indexInfoReader.IsDBNull(6) ? 0L : indexInfoReader.GetInt64(6);
            tableSize = indexInfoReader.IsDBNull(7) ? 0L : indexInfoReader.GetInt64(7);
            isUnique = indexInfoReader.IsDBNull(8) ? false : indexInfoReader.GetBoolean(8);
            isPrimary = indexInfoReader.IsDBNull(9) ? false : indexInfoReader.GetBoolean(9);
            isValid = indexInfoReader.IsDBNull(10) ? true : indexInfoReader.GetBoolean(10);
            indexDefinition = indexInfoReader.IsDBNull(11) ? string.Empty : indexInfoReader.GetString(11);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading index data for {Schema}.{Table}.{Index}", schemaName, tableName, indexName);
            throw;
        }

        // Obter estatísticas da tabela relacionada
        var tableStatsQuery = @"
            SELECT 
                seq_scan,
                seq_tup_read,
                idx_scan,
                idx_tup_fetch,
                n_tup_ins,
                n_tup_upd,
                n_tup_del,
                n_live_tup,
                n_dead_tup,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze,
                vacuum_count,
                autovacuum_count,
                analyze_count,
                autoanalyze_count
            FROM pg_stat_user_tables
            WHERE schemaname = @schemaName
                AND relname = @tableName;";

        await indexInfoReader.CloseAsync();

        await using var tableStatsCommand = new NpgsqlCommand(tableStatsQuery, pgConnection);
        tableStatsCommand.Parameters.AddWithValue("schemaName", schemaName);
        tableStatsCommand.Parameters.AddWithValue("tableName", tableName);

        await using var tableStatsReader = await tableStatsCommand.ExecuteReaderAsync(cancellationToken);

        long seqScan = 0, seqTupRead = 0, idxScan = 0, idxTupFetch = 0;
        long nTupIns = 0, nTupUpd = 0, nTupDel = 0;
        long nLiveTup = 0, nDeadTup = 0;
        DateTime? lastVacuum = null, lastAutovacuum = null, lastAnalyze = null, lastAutoanalyze = null;
        long vacuumCount = 0, autovacuumCount = 0, analyzeCount = 0, autoanalyzeCount = 0;

        if (await tableStatsReader.ReadAsync(cancellationToken))
        {
            seqScan = tableStatsReader.GetInt64(0);
            seqTupRead = tableStatsReader.GetInt64(1);
            idxScan = tableStatsReader.GetInt64(2);
            idxTupFetch = tableStatsReader.GetInt64(3);
            nTupIns = tableStatsReader.GetInt64(4);
            nTupUpd = tableStatsReader.GetInt64(5);
            nTupDel = tableStatsReader.GetInt64(6);
            nLiveTup = tableStatsReader.GetInt64(7);
            nDeadTup = tableStatsReader.GetInt64(8);
            lastVacuum = tableStatsReader.IsDBNull(9) ? null : tableStatsReader.GetDateTime(9);
            lastAutovacuum = tableStatsReader.IsDBNull(10) ? null : tableStatsReader.GetDateTime(10);
            lastAnalyze = tableStatsReader.IsDBNull(11) ? null : tableStatsReader.GetDateTime(11);
            lastAutoanalyze = tableStatsReader.IsDBNull(12) ? null : tableStatsReader.GetDateTime(12);
            vacuumCount = tableStatsReader.GetInt64(13);
            autovacuumCount = tableStatsReader.GetInt64(14);
            analyzeCount = tableStatsReader.GetInt64(15);
            autoanalyzeCount = tableStatsReader.GetInt64(16);
        }

        await tableStatsReader.CloseAsync();

        // Obter informações sobre fragmentação e bloat do índice
        var bloatQuery = @"
            SELECT 
                pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
                pg_size_pretty(pg_relation_size(i.relid)) as table_size,
                CASE 
                    WHEN pg_relation_size(i.relid) > 0 
                    THEN ROUND((pg_relation_size(i.indexrelid)::numeric / pg_relation_size(i.relid)::numeric) * 100, 2)
                    ELSE 0
                END as index_percent_of_table
            FROM pg_stat_user_indexes i
            WHERE i.schemaname = @schemaName
                AND i.relname = @tableName
                AND i.indexrelname = @indexName;";

        await using var bloatCommand = new NpgsqlCommand(bloatQuery, pgConnection);
        bloatCommand.Parameters.AddWithValue("schemaName", schemaName);
        bloatCommand.Parameters.AddWithValue("tableName", tableName);
        bloatCommand.Parameters.AddWithValue("indexName", indexName);

        await using var bloatReader = await bloatCommand.ExecuteReaderAsync(cancellationToken);

        double indexPercentOfTable = 0;
        if (await bloatReader.ReadAsync(cancellationToken))
        {
            indexPercentOfTable = bloatReader.IsDBNull(2) ? 0 : bloatReader.GetDouble(2);
        }

        await bloatReader.CloseAsync();

        // Calcular eficiência do índice
        var totalScans = seqScan + idxScan;
        var indexUsageRatio = totalScans > 0 ? (double)idxScan / totalScans * 100 : 0;
        var deadTupleRatio = (nLiveTup + nDeadTup) > 0 ? (double)nDeadTup / (nLiveTup + nDeadTup) * 100 : 0;

        // Total de reorganizações (VACUUM + REINDEX)
        var totalReorganizations = vacuumCount + autovacuumCount;

        return new IndexDetailsDto(
            SchemaName: schemaName,
            TableName: tableName,
            IndexName: indexName,
            IndexScans: indexScans,
            IndexTuplesRead: indexTuplesRead,
            IndexTuplesFetched: indexTuplesFetched,
            IndexSize: indexSize,
            TableSize: tableSize,
            IndexPercentOfTable: indexPercentOfTable,
            IsUnique: isUnique,
            IsPrimary: isPrimary,
            IsValid: isValid,
            IndexDefinition: indexDefinition,
            TableSeqScans: seqScan,
            TableIndexScans: idxScan,
            TableIndexUsageRatio: indexUsageRatio,
            TableLiveTuples: nLiveTup,
            TableDeadTuples: nDeadTup,
            TableDeadTupleRatio: deadTupleRatio,
            TableInserts: nTupIns,
            TableUpdates: nTupUpd,
            TableDeletes: nTupDel,
            LastVacuum: lastVacuum,
            LastAutovacuum: lastAutovacuum,
            LastAnalyze: lastAnalyze,
            LastAutoanalyze: lastAutoanalyze,
            VacuumCount: vacuumCount,
            AutovacuumCount: autovacuumCount,
            AnalyzeCount: analyzeCount,
            AutoanalyzeCount: autoanalyzeCount,
            TotalReorganizations: totalReorganizations
        );
    }

    public async Task<TableDetailsDto> GetTableDetailsAsync(string connectionId, string schemaName, string tableName, CancellationToken cancellationToken = default)
    {
        var connection = await _connectionRepository.GetByIdAsync(connectionId);
        if (connection == null)
        {
            _logger.LogWarning("Connection {ConnectionId} not found", connectionId);
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        var password = _cryptoService.Decrypt(connection.PasswordHash);
        var connectionString = $"Host={connection.Host};Port={connection.Port};Database={connection.Database};Username={connection.Username};Password={password};SslMode={(connection.SslEnabled ? SslMode.Require : SslMode.Prefer)}";

        await using var pgConnection = new NpgsqlConnection(connectionString);
        try
        {
            await pgConnection.OpenAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting to PostgreSQL for table details");
            throw;
        }

        // Obter estatísticas da tabela
        var tableStatsQuery = @"
            SELECT 
                seq_scan,
                seq_tup_read,
                idx_scan,
                idx_tup_fetch,
                n_tup_ins,
                n_tup_upd,
                n_tup_del,
                n_live_tup,
                n_dead_tup,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze,
                vacuum_count,
                autovacuum_count,
                analyze_count,
                autoanalyze_count
            FROM pg_stat_user_tables
            WHERE schemaname = @schemaName
                AND relname = @tableName;";

        await using var tableStatsCommand = new NpgsqlCommand(tableStatsQuery, pgConnection);
        tableStatsCommand.Parameters.AddWithValue("schemaName", schemaName);
        tableStatsCommand.Parameters.AddWithValue("tableName", tableName);

        await using var tableStatsReader = await tableStatsCommand.ExecuteReaderAsync(cancellationToken);

        if (!await tableStatsReader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException($"Table {schemaName}.{tableName} not found");
        }

        var seqScan = tableStatsReader.GetInt64(0);
        var seqTupRead = tableStatsReader.GetInt64(1);
        var idxScan = tableStatsReader.GetInt64(2);
        var idxTupFetch = tableStatsReader.GetInt64(3);
        var nTupIns = tableStatsReader.GetInt64(4);
        var nTupUpd = tableStatsReader.GetInt64(5);
        var nTupDel = tableStatsReader.GetInt64(6);
        var nLiveTup = tableStatsReader.GetInt64(7);
        var nDeadTup = tableStatsReader.GetInt64(8);
        DateTime? lastVacuum = tableStatsReader.IsDBNull(9) ? null : tableStatsReader.GetDateTime(9);
        DateTime? lastAutovacuum = tableStatsReader.IsDBNull(10) ? null : tableStatsReader.GetDateTime(10);
        DateTime? lastAnalyze = tableStatsReader.IsDBNull(11) ? null : tableStatsReader.GetDateTime(11);
        DateTime? lastAutoanalyze = tableStatsReader.IsDBNull(12) ? null : tableStatsReader.GetDateTime(12);
        var vacuumCount = tableStatsReader.GetInt64(13);
        var autovacuumCount = tableStatsReader.GetInt64(14);
        var analyzeCount = tableStatsReader.GetInt64(15);
        var autoanalyzeCount = tableStatsReader.GetInt64(16);

        await tableStatsReader.CloseAsync();

        // Obter tamanhos da tabela e índices
        var sizeQuery = @"
            SELECT 
                pg_total_relation_size(schemaname||'.'||relname) as total_size,
                pg_relation_size(schemaname||'.'||relname) as table_size,
                pg_indexes_size(schemaname||'.'||relname) as index_size,
                n_live_tup as row_count
            FROM pg_stat_user_tables
            WHERE schemaname = @schemaName
                AND relname = @tableName;";

        await using var sizeCommand = new NpgsqlCommand(sizeQuery, pgConnection);
        sizeCommand.Parameters.AddWithValue("schemaName", schemaName);
        sizeCommand.Parameters.AddWithValue("tableName", tableName);

        await using var sizeReader = await sizeCommand.ExecuteReaderAsync(cancellationToken);

        long totalSize = 0, tableSize = 0, indexSize = 0, rowCount = 0;
        if (await sizeReader.ReadAsync(cancellationToken))
        {
            totalSize = sizeReader.GetInt64(0);
            tableSize = sizeReader.GetInt64(1);
            indexSize = sizeReader.GetInt64(2);
            rowCount = sizeReader.GetInt64(3);
        }

        await sizeReader.CloseAsync();

        // Obter cache hit ratio
        var cacheQuery = @"
            SELECT 
                heap_blks_hit,
                heap_blks_read
            FROM pg_statio_user_tables
            WHERE schemaname = @schemaName
                AND relname = @tableName;";

        await using var cacheCommand = new NpgsqlCommand(cacheQuery, pgConnection);
        cacheCommand.Parameters.AddWithValue("schemaName", schemaName);
        cacheCommand.Parameters.AddWithValue("tableName", tableName);

        await using var cacheReader = await cacheCommand.ExecuteReaderAsync(cancellationToken);

        long heapBlksHit = 0, heapBlksRead = 0;
        if (await cacheReader.ReadAsync(cancellationToken))
        {
            heapBlksHit = cacheReader.IsDBNull(0) ? 0 : cacheReader.GetInt64(0);
            heapBlksRead = cacheReader.IsDBNull(1) ? 0 : cacheReader.GetInt64(1);
        }

        await cacheReader.CloseAsync();

        // Obter colunas da tabela
        var columnsQuery = @"
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision,
                numeric_scale
            FROM information_schema.columns
            WHERE table_schema = @schemaName
                AND table_name = @tableName
            ORDER BY ordinal_position;";

        await using var columnsCommand = new NpgsqlCommand(columnsQuery, pgConnection);
        columnsCommand.Parameters.AddWithValue("schemaName", schemaName);
        columnsCommand.Parameters.AddWithValue("tableName", tableName);

        await using var columnsReader = await columnsCommand.ExecuteReaderAsync(cancellationToken);

        var columns = new List<TableColumnDto>();
        var primaryKeyColumns = new HashSet<string>();

        // Obter colunas que são primary key
        var pkQuery = @"
            SELECT 
                a.attname
            FROM pg_index i
            JOIN pg_class c ON c.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE n.nspname = @schemaName
                AND c.relname = @tableName
                AND i.indisprimary;";

        await columnsReader.CloseAsync();

        await using var pkCommand = new NpgsqlCommand(pkQuery, pgConnection);
        pkCommand.Parameters.AddWithValue("schemaName", schemaName);
        pkCommand.Parameters.AddWithValue("tableName", tableName);

        await using var pkReader = await pkCommand.ExecuteReaderAsync(cancellationToken);
        while (await pkReader.ReadAsync(cancellationToken))
        {
            primaryKeyColumns.Add(pkReader.GetString(0));
        }

        await pkReader.CloseAsync();

        // Ler colunas novamente
        await using var columnsReader2 = await columnsCommand.ExecuteReaderAsync(cancellationToken);
        while (await columnsReader2.ReadAsync(cancellationToken))
        {
            var columnName = columnsReader2.GetString(0);
            columns.Add(new TableColumnDto(
                ColumnName: columnName,
                DataType: columnsReader2.GetString(1),
                IsNullable: columnsReader2.GetString(2) == "YES",
                DefaultValue: columnsReader2.IsDBNull(3) ? null : columnsReader2.GetString(3),
                IsPrimaryKey: primaryKeyColumns.Contains(columnName),
                CharacterMaximumLength: columnsReader2.IsDBNull(4) ? null : columnsReader2.GetInt32(4),
                NumericPrecision: columnsReader2.IsDBNull(5) ? null : columnsReader2.GetInt32(5),
                NumericScale: columnsReader2.IsDBNull(6) ? null : columnsReader2.GetInt32(6)
            ));
        }

        await columnsReader2.CloseAsync();

        // Calcular métricas
        var totalScans = seqScan + idxScan;
        var indexUsageRatio = totalScans > 0 ? (double)idxScan / totalScans * 100 : 0;
        var deadTupleRatio = (nLiveTup + nDeadTup) > 0 ? (double)nDeadTup / (nLiveTup + nDeadTup) * 100 : 0;
        var totalBlks = heapBlksHit + heapBlksRead;
        var cacheHitRatio = totalBlks > 0 ? (double)heapBlksHit / totalBlks * 100 : 0;
        var totalReorganizations = vacuumCount + autovacuumCount;

        // Calcular impacto
        var impact = CalculateTableImpact(seqScan, idxScan, cacheHitRatio, deadTupleRatio, nLiveTup, nTupUpd, nTupDel);

        return new TableDetailsDto(
            SchemaName: schemaName,
            TableName: tableName,
            TableSize: tableSize,
            IndexSize: indexSize,
            TotalSize: totalSize,
            RowCount: rowCount,
            LiveTuples: nLiveTup,
            DeadTuples: nDeadTup,
            DeadTupleRatio: deadTupleRatio,
            SeqScans: seqScan,
            SeqTupRead: seqTupRead,
            IndexScans: idxScan,
            IndexTupFetch: idxTupFetch,
            IndexUsageRatio: indexUsageRatio,
            CacheHitRatio: cacheHitRatio,
            Inserts: nTupIns,
            Updates: nTupUpd,
            Deletes: nTupDel,
            LastVacuum: lastVacuum,
            LastAutovacuum: lastAutovacuum,
            LastAnalyze: lastAnalyze,
            LastAutoanalyze: lastAutoanalyze,
            VacuumCount: vacuumCount,
            AutovacuumCount: autovacuumCount,
            AnalyzeCount: analyzeCount,
            AutoanalyzeCount: autoanalyzeCount,
            TotalReorganizations: totalReorganizations,
            Columns: columns,
            ImpactLevel: impact.Level,
            ImpactDescription: impact.Description
        );
    }

    private (string Level, string Description) CalculateTableImpact(
        long seqScan, long idxScan, double cacheHitRatio, double deadTupleRatio,
        long liveTuples, long updates, long deletes)
    {
        var issues = new List<string>();
        var score = 0;

        // Muitos sequential scans vs index scans
        var totalScans = seqScan + idxScan;
        if (totalScans > 0)
        {
            var seqRatio = (double)seqScan / totalScans;
            if (seqRatio > 0.8)
            {
                issues.Add("Alto uso de sequential scans (poucos index scans)");
                score += 3;
            }
            else if (seqRatio > 0.5)
            {
                issues.Add("Moderado uso de sequential scans");
                score += 2;
            }
        }

        // Cache hit ratio baixo
        if (cacheHitRatio < 90)
        {
            issues.Add("Cache hit ratio baixo");
            score += 2;
        }
        else if (cacheHitRatio < 95)
        {
            issues.Add("Cache hit ratio moderado");
            score += 1;
        }

        // Muitas tuplas mortas
        if (deadTupleRatio > 20)
        {
            issues.Add("Alto percentual de tuplas mortas");
            score += 3;
        }
        else if (deadTupleRatio > 10)
        {
            issues.Add("Moderado percentual de tuplas mortas");
            score += 2;
        }

        // Tabela grande com muitas operações
        if (liveTuples > 1000000 && (updates + deletes) > 10000)
        {
            issues.Add("Tabela grande com muitas operações de escrita");
            score += 1;
        }

        // Determinar nível de impacto
        string level;
        string description;

        if (score >= 6)
        {
            level = "critical";
            description = $"Crítico: {string.Join(", ", issues)}. Requer atenção imediata.";
        }
        else if (score >= 4)
        {
            level = "high";
            description = $"Alto: {string.Join(", ", issues)}. Recomenda-se otimização.";
        }
        else if (score >= 2)
        {
            level = "medium";
            description = $"Médio: {string.Join(", ", issues)}. Pode se beneficiar de otimização.";
        }
        else
        {
            level = "low";
            description = "Baixo impacto. Performance aceitável.";
        }

        return (level, description);
    }

    public async Task<List<IndexTypeInfoDto>> GetIndexTypesInfoAsync(string connectionId, CancellationToken cancellationToken = default)
    {
        var connection = await _connectionRepository.GetByIdAsync(connectionId);
        if (connection == null)
        {
            _logger.LogWarning("Connection {ConnectionId} not found", connectionId);
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        var password = _cryptoService.Decrypt(connection.PasswordHash);
        var connectionString = $"Host={connection.Host};Port={connection.Port};Database={connection.Database};Username={connection.Username};Password={password};SslMode={(connection.SslEnabled ? SslMode.Require : SslMode.Prefer)}";

        await using var pgConnection = new NpgsqlConnection(connectionString);
        try
        {
            await pgConnection.OpenAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error connecting to PostgreSQL for index types info");
            throw;
        }

        // Obter tipos de índices disponíveis e seus usos
        var indexTypesQuery = @"
            SELECT 
                am.amname as index_type,
                COUNT(DISTINCT i.indexrelid) as count,
                COALESCE(SUM(pg_relation_size(i.indexrelid)), 0) as total_size,
                COALESCE(SUM(stat.idx_scan), 0) as total_scans,
                STRING_AGG(DISTINCT schemaname||'.'||relname, ', ' ORDER BY schemaname||'.'||relname) as used_in_tables
            FROM pg_am am
            LEFT JOIN pg_class c ON c.relam = am.oid
            LEFT JOIN pg_index i ON i.indexrelid = c.oid
            LEFT JOIN pg_stat_user_indexes stat ON stat.indexrelid = i.indexrelid
            WHERE am.amtype = 'i'
            GROUP BY am.amname
            ORDER BY am.amname;";

        await using var indexTypesCommand = new NpgsqlCommand(indexTypesQuery, pgConnection);
        await using var indexTypesReader = await indexTypesCommand.ExecuteReaderAsync(cancellationToken);

        var indexTypeUsages = new Dictionary<string, IndexTypeUsageDto>();
        while (await indexTypesReader.ReadAsync(cancellationToken))
        {
            var indexType = indexTypesReader.GetString(0);
            var count = indexTypesReader.GetInt32(1);
            var totalSize = indexTypesReader.GetInt64(2);
            var totalScans = indexTypesReader.GetInt64(3);
            var usedInTables = indexTypesReader.IsDBNull(4) 
                ? new List<string>() 
                : indexTypesReader.GetString(4).Split(", ", StringSplitOptions.RemoveEmptyEntries).ToList();

            indexTypeUsages[indexType] = new IndexTypeUsageDto(
                IndexType: indexType,
                IndexTypeName: GetIndexTypeDisplayName(indexType),
                Count: count,
                TotalSize: totalSize,
                TotalScans: totalScans,
                UsedInTables: usedInTables
            );
        }

        await indexTypesReader.CloseAsync();

        // Definir informações sobre cada tipo de índice
        var allIndexTypes = new[]
        {
            ("btree", "B-Tree", 
                "O tipo de índice padrão e mais comum no PostgreSQL. Usa uma estrutura de árvore balanceada.",
                "Use para a maioria dos casos: comparações de igualdade, range queries, ordenação, chaves primárias e foreign keys.",
                "Versátil, suporta operadores de comparação, ordenação, e é o padrão quando não especificado.",
                "Pode ser grande para dados muito grandes, não é ideal para buscas de texto completo ou arrays.",
                "CREATE INDEX idx_name ON users(email);"),
            ("hash", "Hash",
                "Índice baseado em hash, muito rápido para igualdades exatas, mas não suporta range queries.",
                "Use apenas para buscas de igualdade exata em colunas com alta cardinalidade e quando não precisa de ordenação.",
                "Muito rápido para buscas de igualdade, menor que B-Tree em alguns casos.",
                "Não suporta range queries, ordenação, ou comparações. Não é replicado em streaming replication.",
                "CREATE INDEX idx_name ON users USING hash(email);"),
            ("gin", "GIN (Generalized Inverted Index)",
                "Índice invertido generalizado, ideal para dados compostos como arrays, JSONB, e full-text search.",
                "Use para arrays, JSONB, full-text search, e tipos de dados que contêm múltiplos valores.",
                "Excelente para buscas em arrays, JSONB, e texto completo. Suporta operadores complexos.",
                "Pode ser grande e mais lento para inserções/atualizações. Requer mais manutenção.",
                "CREATE INDEX idx_name ON products USING gin(tags);"),
            ("gist", "GiST (Generalized Search Tree)",
                "Árvore de busca generalizada, permite criar índices customizados para tipos de dados complexos.",
                "Use para dados espaciais (PostGIS), range types, e tipos de dados customizados com operadores especiais.",
                "Flexível, permite índices customizados, excelente para dados espaciais e ranges.",
                "Pode ser mais lento que B-Tree para operações simples. Requer conhecimento específico.",
                "CREATE INDEX idx_name ON locations USING gist(geom);"),
            ("spgist", "SP-GiST (Space-Partitioned GiST)",
                "Árvore de busca particionada por espaço, útil para dados não balanceados e particionamento.",
                "Use para dados não balanceados, tipos de dados com particionamento natural, e alguns casos de full-text search.",
                "Bom para dados não balanceados, pode ser mais eficiente que GiST em alguns casos.",
                "Menos comum, pode ter performance variável dependendo dos dados.",
                "CREATE INDEX idx_name ON points USING spgist(location);"),
            ("brin", "BRIN (Block Range Index)",
                "Índice de bloco de range, muito compacto, ideal para dados ordenados ou com correlação física.",
                "Use para tabelas muito grandes com dados ordenados ou com correlação física (ex: timestamps, IDs sequenciais).",
                "Muito pequeno, rápido para criar, bom para dados ordenados ou correlacionados.",
                "Menos preciso que B-Tree, pode ter falsos positivos, não é bom para dados aleatórios.",
                "CREATE INDEX idx_name ON logs USING brin(created_at);")
        };

        var result = new List<IndexTypeInfoDto>();
        foreach (var (type, displayName, description, whenToUse, advantages, disadvantages, example) in allIndexTypes)
        {
            var usage = indexTypeUsages.GetValueOrDefault(type);
            result.Add(new IndexTypeInfoDto(
                IndexType: type,
                IndexTypeName: displayName,
                Description: description,
                WhenToUse: whenToUse,
                Advantages: advantages,
                Disadvantages: disadvantages,
                Example: example,
                IsUsed: usage.Count > 0,
                UsageCount: usage.Count,
                TotalSize: usage.TotalSize
            ));
        }

        return result;
    }

    private string GetIndexTypeDisplayName(string indexType)
    {
        return indexType switch
        {
            "btree" => "B-Tree",
            "hash" => "Hash",
            "gin" => "GIN (Generalized Inverted Index)",
            "gist" => "GiST (Generalized Search Tree)",
            "spgist" => "SP-GiST (Space-Partitioned GiST)",
            "brin" => "BRIN (Block Range Index)",
            _ => indexType
        };
    }
}
