using PostgresMonitor.Infrastructure.Services;

namespace PostgresMonitor.Api.Endpoints.PostgreSQLLogs;

public static class PostgreSQLLogsEndpoints
{
    public static WebApplication MapPostgreSQLLogsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/postgresql/connections/{id}/logs")
            .WithTags("PostgreSQL Logs");

        group.MapGet("", async (
            string id,
            MonitoringService monitoringService,
            int? maxLines) =>
        {
            try
            {
                var logs = await monitoringService.GetPostgresLogsAsync(id, maxLines ?? 100);
                return Results.Ok(new { logs });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        })
        .WithName("GetPostgresLogs");

        return app;
    }
}
