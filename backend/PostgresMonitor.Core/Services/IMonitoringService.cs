using PostgresMonitor.Core.DTOs;

namespace PostgresMonitor.Core.Services;

public interface IMonitoringService
{
    Task CollectMetricsAsync(string connectionId, CancellationToken cancellationToken = default);
    Task<List<string>> GetPostgresLogsAsync(string connectionId, int maxLines = 100, CancellationToken cancellationToken = default);
    Task<IndexDetailsDto> GetIndexDetailsAsync(string connectionId, string schemaName, string tableName, string indexName, CancellationToken cancellationToken = default);
    Task<TableDetailsDto> GetTableDetailsAsync(string connectionId, string schemaName, string tableName, CancellationToken cancellationToken = default);
    Task<List<IndexTypeInfoDto>> GetIndexTypesInfoAsync(string connectionId, CancellationToken cancellationToken = default);
}
