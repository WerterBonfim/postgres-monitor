using PostgresMonitor.Infrastructure.Services;

namespace PostgresMonitor.Api.Endpoints.IndexTypes;

public static class IndexTypesEndpoints
{
    public static WebApplication MapIndexTypesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/postgresql/connections/{id}/index-types")
            .WithTags("Index Types");

        group.MapGet("", async (
            string id,
            MonitoringService monitoringService) =>
        {
            try
            {
                var indexTypesInfo = await monitoringService.GetIndexTypesInfoAsync(id);
                return Results.Ok(indexTypesInfo.Select(it => new
                {
                    indexType = it.IndexType,
                    indexTypeName = it.IndexTypeName,
                    description = it.Description,
                    whenToUse = it.WhenToUse,
                    advantages = it.Advantages,
                    disadvantages = it.Disadvantages,
                    example = it.Example,
                    isUsed = it.IsUsed,
                    usageCount = it.UsageCount,
                    totalSize = it.TotalSize
                }).ToList());
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        })
        .WithName("GetIndexTypesInfo");

        return app;
    }
}
