using PostgresMonitor.Infrastructure.Logging;

namespace PostgresMonitor.Api.Endpoints.BackendLogs;

public static class BackendLogsEndpoints
{
    public static WebApplication MapBackendLogsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/backend/logs")
            .WithTags("Backend Logs");

        group.MapGet("", async (
            InMemoryLoggerProvider loggerProvider,
            int? maxLines) =>
        {
            try
            {
                var logs = loggerProvider.GetLogs(maxLines ?? 100);
                return Results.Ok(new { logs });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        })
        .WithName("GetBackendLogs");

        return app;
    }
}
