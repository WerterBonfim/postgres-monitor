using PostgresMonitor.Core.DTOs;

namespace PostgresMonitor.Core.Services;

public interface IQueryPlanAnalyzer
{
    QueryPlanInsightsDto Analyze(QueryPlanNodeDto plan);
}
