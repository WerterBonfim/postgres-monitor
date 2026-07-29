using PostgresMonitor.Core.DTOs;

namespace PostgresMonitor.Core.Services;

public interface IQueryPlanService
{
    Task<QueryPlanResponse> ExecuteExplainAnalyzeAsync(
        PostgresConnectionParams connectionParams,
        string query,
        CancellationToken cancellationToken = default);
}
