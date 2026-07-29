using Microsoft.Extensions.Logging;
using Npgsql;
using PostgresMonitor.Core.DTOs;
using PostgresMonitor.Core.Services;
using System.Text.Json;

namespace PostgresMonitor.Infrastructure.PostgreSQL;

public class QueryPlanService
{
    private readonly ILogger<QueryPlanService> _logger;

    public QueryPlanService(ILogger<QueryPlanService> logger)
    {
        _logger = logger;
    }

    public async Task<QueryPlanResponse> ExecuteExplainAnalyzeAsync(
        PostgresConnectionParams connectionParams,
        string query,
        CancellationToken cancellationToken = default)
    {
        var connectionString = $"Host={connectionParams.Host};Port={connectionParams.Port};Database={connectionParams.Database};Username={connectionParams.Username};Password={connectionParams.Password};SslMode={(connectionParams.SslEnabled ? SslMode.Require : SslMode.Prefer)}";

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var explainQuery = $"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}";

        await using var command = new NpgsqlCommand(explainQuery, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("No query plan returned");
        }

        var jsonText = reader.GetString(0);
        var jsonDoc = JsonDocument.Parse(jsonText);
        var root = jsonDoc.RootElement[0];

        var planNode = ParsePlanNode(root.GetProperty("Plan"));
        var planningTime = root.GetProperty("Planning Time").GetDecimal();
        var executionTime = root.GetProperty("Execution Time").GetDecimal();

        return new QueryPlanResponse
        {
            Plan = planNode,
            PlanningTime = planningTime,
            ExecutionTime = executionTime,
            RawJson = jsonText
        };
    }

    private QueryPlanNodeDto ParsePlanNode(JsonElement element)
    {
        var node = new QueryPlanNodeDto
        {
            NodeType = element.GetProperty("Node Type").GetString() ?? string.Empty,
            RelationName = element.TryGetProperty("Relation Name", out var rel) ? rel.GetString() : null,
            Alias = element.TryGetProperty("Alias", out var alias) ? alias.GetString() : null,
        };

        if (element.TryGetProperty("Total Cost", out var totalCost) && element.TryGetProperty("Startup Cost", out var startupCost))
        {
            node.Cost = new CostDto
            {
                Startup = startupCost.GetDecimal(),
                Total = totalCost.GetDecimal()
            };
        }

        if (element.TryGetProperty("Actual Total Time", out var totalTime) && element.TryGetProperty("Actual Startup Time", out var startupTime))
        {
            node.ActualTime = new ActualTimeDto
            {
                First = startupTime.GetDecimal(),
                Total = totalTime.GetDecimal()
            };
        }

        if (element.TryGetProperty("Plan Rows", out var planRows) && element.TryGetProperty("Actual Rows", out var actualRows))
        {
            node.Rows = new RowsDto
            {
                Estimated = planRows.GetInt64(),
                Actual = actualRows.GetInt64()
            };
        }

        if (element.TryGetProperty("Plan Width", out var width))
        {
            node.Width = width.GetInt64();
        }

        if (element.TryGetProperty("Shared Hit Blocks", out var hit) && element.TryGetProperty("Shared Read Blocks", out var read))
        {
            node.Buffers = new BuffersDto
            {
                SharedHit = hit.GetInt64(),
                SharedRead = read.GetInt64()
            };
        }

        if (element.TryGetProperty("Plans", out var plans))
        {
            foreach (var plan in plans.EnumerateArray())
            {
                node.Children.Add(ParsePlanNode(plan));
            }
        }

        return node;
    }
}
