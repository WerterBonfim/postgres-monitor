using LiteDB;
using PostgresMonitor.Infrastructure.LiteDb.Entities;

namespace PostgresMonitor.Infrastructure.LiteDb;

public sealed class LiteDbContext : IDisposable
{
    private readonly LiteDatabase _database;
    private readonly string _databasePath;

    public LiteDbContext(string? databasePath = null)
    {
        _databasePath = databasePath ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "PostgresMonitor",
            "postgresmonitor.db"
        );

        // Garante que o diretório existe
        var directory = Path.GetDirectoryName(_databasePath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        _database = new LiteDatabase(_databasePath);
        InitializeCollections();
    }

    private void InitializeCollections()
    {
        // Cria índices para melhor performance
        var connections = Connections;
        connections.EnsureIndex(x => x.Id);
        connections.EnsureIndex(x => x.Name);

        var metrics = Metrics;
        metrics.EnsureIndex(x => x.Id);
        metrics.EnsureIndex(x => x.ConnectionId);
        metrics.EnsureIndex(x => x.CollectedAt);

        var historicalMetrics = HistoricalMetrics;
        historicalMetrics.EnsureIndex(x => x.Id);
        historicalMetrics.EnsureIndex(x => x.ConnectionId);
        historicalMetrics.EnsureIndex(x => x.PeriodStart);
        historicalMetrics.EnsureIndex(x => x.PeriodType);

        var queryHistory = QueryHistory;
        queryHistory.EnsureIndex(x => x.Id);
        queryHistory.EnsureIndex(x => x.ConnectionId);
        queryHistory.EnsureIndex(x => x.ExecutedAt);
    }

    public ILiteCollection<PostgresConnectionEntity> Connections =>
        _database.GetCollection<PostgresConnectionEntity>("connections");

    public ILiteCollection<MonitoringMetricEntity> Metrics =>
        _database.GetCollection<MonitoringMetricEntity>("metrics");

    public ILiteCollection<HistoricalMetricEntity> HistoricalMetrics =>
        _database.GetCollection<HistoricalMetricEntity>("historical_metrics");

    public ILiteCollection<QueryHistoryEntity> QueryHistory =>
        _database.GetCollection<QueryHistoryEntity>("query_history");

    public void Dispose()
    {
        _database?.Dispose();
    }
}
