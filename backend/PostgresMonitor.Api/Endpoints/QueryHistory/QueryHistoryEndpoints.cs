using PostgresMonitor.Infrastructure.Services;

namespace PostgresMonitor.Api.Endpoints.QueryHistory;

public static class QueryHistoryEndpoints
{
    public static WebApplication MapQueryHistoryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/postgresql/connections/{id}/query-history")
            .WithTags("Query History");

        group.MapGet("", async (
            string id,
            QueryHistoryService queryHistoryService) =>
        {
            var history = await queryHistoryService.GetQueryHistoryAsync(id, limit: 10);

            return Results.Ok(history.Select(q => new
            {
                id = q.Id,
                connectionId = q.ConnectionId,
                executedAt = q.ExecutedAt,
                query = q.Query,
                calls = q.Calls,
                totalTime = q.TotalTime,
                meanTime = q.MeanTime,
                minTime = q.MinTime,
                maxTime = q.MaxTime,
                rows = q.Rows,
                sharedBlksHit = q.SharedBlksHit,
                sharedBlksRead = q.SharedBlksRead,
                tempBlksRead = q.TempBlksRead,
                tempBlksWritten = q.TempBlksWritten,
                blkReadTime = q.BlkReadTime,
                blkWriteTime = q.BlkWriteTime,
                impactLevel = q.ImpactLevel,
                impactDescription = q.ImpactDescription
            }).ToList());
        })
        .WithName("GetQueryHistory");

        return app;
    }
}
