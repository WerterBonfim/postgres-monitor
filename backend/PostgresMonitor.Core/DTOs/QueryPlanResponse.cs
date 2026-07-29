using PostgresMonitor.Core.DTOs;

namespace PostgresMonitor.Core.DTOs;

public class QueryPlanResponse
{
    public QueryPlanNodeDto Plan { get; set; } = null!;
    public decimal PlanningTime { get; set; }
    public decimal ExecutionTime { get; set; }
    public string RawJson { get; set; } = string.Empty;
    public QueryPlanInsightsDto Insights { get; set; } = null!;
}
