namespace PostgresMonitor.Core.DTOs;

public record QueryPlanRequest(
    string ConnectionId,
    string Query
);
