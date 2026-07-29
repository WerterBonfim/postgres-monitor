using PostgresMonitor.Core.DTOs;
using PostgresMonitor.Infrastructure.Analysis;
using PostgresMonitor.Infrastructure.PostgreSQL;
using PostgresMonitor.Infrastructure.Repositories;
using PostgresMonitor.Infrastructure.Services;

namespace PostgresMonitor.Api.Endpoints.QueryPlan;

public static class QueryPlanEndpoints
{
    public static WebApplication MapQueryPlanEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/postgresql/query-plan")
            .WithTags("Query Plan");

        group.MapPost("", async (
            QueryPlanRequest request,
            ConnectionRepository connectionRepository,
            QueryPlanService queryPlanService,
            QueryPlanAnalyzer queryPlanAnalyzer,
            CryptoService cryptoService) =>
        {
            var connection = await connectionRepository.GetByIdAsync(request.ConnectionId);
            if (connection == null)
                return Results.NotFound("Connection not found");

            try
            {
                var password = cryptoService.Decrypt(connection.PasswordHash);
                var connectionParams = new PostgresConnectionParams(
                    connection.Host,
                    connection.Port,
                    connection.Database,
                    connection.Username,
                    password,
                    connection.SslEnabled
                );

                var response = await queryPlanService.ExecuteExplainAnalyzeAsync(connectionParams, request.Query);
                response.Insights = queryPlanAnalyzer.Analyze(response.Plan);

                return Results.Ok(response);
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        })
        .WithName("ExecuteQueryPlan");

        return app;
    }
}
