using Microsoft.Extensions.Logging;
using PostgresMonitor.Core.DTOs;
using PostgresMonitor.Core.Services;

namespace PostgresMonitor.Infrastructure.Analysis;

public class QueryPlanAnalyzer
{
    private readonly ILogger<QueryPlanAnalyzer> _logger;

    public QueryPlanAnalyzer(ILogger<QueryPlanAnalyzer> logger)
    {
        _logger = logger;
    }

    public QueryPlanInsightsDto Analyze(QueryPlanNodeDto plan)
    {
        var insights = new QueryPlanInsightsDto();

        AnalyzeNode(plan, insights);

        return insights;
    }

    private void AnalyzeNode(QueryPlanNodeDto node, QueryPlanInsightsDto insights)
    {
        // Detectar Sequential Scans
        if (node.NodeType == "Seq Scan")
        {
            insights.Problems.Add($"Sequential Scan detectado na tabela '{node.RelationName}'. Considere criar um índice.");

            if (!string.IsNullOrEmpty(node.RelationName))
            {
                insights.Recommendations.Add(new RecommendationDto
                {
                    Type = "index",
                    Description = $"Criar índice na tabela {node.RelationName}",
                    SqlScript = $"CREATE INDEX idx_{node.RelationName.ToLower()}_optimized ON {node.RelationName}(coluna_relevante);",
                    Impact = "high"
                });
            }
        }

        // Detectar custos altos
        if (node.Cost != null && node.Cost.Total > 1000)
        {
            insights.Problems.Add($"Operação {node.NodeType} com custo alto ({node.Cost.Total}). Considere otimizar a query.");
        }

        // Detectar discrepâncias entre estimativas e valores reais
        if (node.Rows != null && node.Rows.Estimated > 0 && node.Rows.Actual.HasValue)
        {
            var ratio = (decimal)node.Rows.Actual.Value / node.Rows.Estimated;
            if (ratio is > 10 or < 0.1m)
            {
                insights.Problems.Add($"Estimativa incorreta: esperado {node.Rows.Estimated} linhas, encontrado {node.Rows.Actual}. Atualize as estatísticas do PostgreSQL.");
                insights.Recommendations.Add(new RecommendationDto
                {
                    Type = "configuration",
                    Description = "Atualizar estatísticas da tabela",
                    SqlScript = $"ANALYZE {node.RelationName ?? "tabela"};",
                    Impact = "medium"
                });
            }
        }

        // Analisar filhos recursivamente
        foreach (var child in node.Children)
        {
            AnalyzeNode(child, insights);
        }
    }
}
