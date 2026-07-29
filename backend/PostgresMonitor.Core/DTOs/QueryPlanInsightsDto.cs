namespace PostgresMonitor.Core.DTOs;

public class QueryPlanInsightsDto
{
    public List<string> Problems { get; set; } = new();
    public List<RecommendationDto> Recommendations { get; set; } = new();
    public decimal? EstimatedImprovement { get; set; }
}

public class RecommendationDto
{
    public string Type { get; set; } = string.Empty; // "index", "query_optimization", "configuration"
    public string Description { get; set; } = string.Empty;
    public string? SqlScript { get; set; }
    public string Impact { get; set; } = string.Empty; // "low", "medium", "high"
}
