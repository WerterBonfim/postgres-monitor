using Microsoft.Extensions.Logging;
using PostgresMonitor.Infrastructure.LiteDb;
using PostgresMonitor.Infrastructure.LiteDb.Entities;

namespace PostgresMonitor.Infrastructure.Services;

public sealed class QueryHistoryService
{
    private readonly LiteDbContext _context;
    private readonly ILogger<QueryHistoryService> _logger;

    public QueryHistoryService(
        LiteDbContext context,
        ILogger<QueryHistoryService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SaveQueryAsync(string connectionId, QueryDetailDto queryDetail)
    {
        try
        {
            var impact = CalculateImpact(queryDetail);

            var historyEntity = new QueryHistoryEntity
            {
                ConnectionId = connectionId,
                ExecutedAt = DateTime.UtcNow,
                Query = queryDetail.Query,
                Calls = queryDetail.Calls,
                TotalTime = queryDetail.TotalTime,
                MeanTime = queryDetail.MeanTime,
                MinTime = queryDetail.MinTime,
                MaxTime = queryDetail.MaxTime,
                Rows = queryDetail.Rows,
                SharedBlksHit = queryDetail.SharedBlksHit,
                SharedBlksRead = queryDetail.SharedBlksRead,
                TempBlksRead = queryDetail.TempBlksRead,
                TempBlksWritten = queryDetail.TempBlksWritten,
                BlkReadTime = queryDetail.BlkReadTime,
                BlkWriteTime = queryDetail.BlkWriteTime,
                ImpactLevel = impact.Level,
                ImpactDescription = impact.Description
            };

            await Task.Run(() =>
            {
                _context.QueryHistory.Insert(historyEntity);
            });

            // Manter apenas as últimas 10 queries por conexão
            await Task.Run(() =>
            {
                var allQueries = _context.QueryHistory
                    .Find(q => q.ConnectionId == connectionId)
                    .OrderByDescending(q => q.ExecutedAt)
                    .ToList();

                if (allQueries.Count > 10)
                {
                    var toDelete = allQueries.Skip(10).Select(q => q.Id).ToList();
                    foreach (var id in toDelete)
                    {
                        _context.QueryHistory.Delete(id);
                    }
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving query to history for connection {ConnectionId}", connectionId);
        }
    }

    public async Task<List<QueryHistoryEntity>> GetQueryHistoryAsync(string connectionId, int limit = 10)
    {
        try
        {
            return await Task.Run(() =>
            {
                return _context.QueryHistory
                    .Find(q => q.ConnectionId == connectionId)
                    .OrderByDescending(q => q.ExecutedAt)
                    .Take(limit)
                    .ToList();
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving query history for connection {ConnectionId}", connectionId);
            return new List<QueryHistoryEntity>();
        }
    }

    private (string Level, string Description) CalculateImpact(QueryDetailDto query)
    {
        var issues = new List<string>();
        var score = 0;

        // Tempo médio alto
        if (query.MeanTime > 1000)
        {
            issues.Add("Tempo médio muito alto");
            score += 3;
        }
        else if (query.MeanTime > 500)
        {
            issues.Add("Tempo médio elevado");
            score += 2;
        }
        else if (query.MeanTime > 100)
        {
            issues.Add("Tempo médio moderado");
            score += 1;
        }

        // Muitas leituras do disco
        var totalBlks = query.SharedBlksHit + query.SharedBlksRead;
        var diskReadRatio = totalBlks > 0 ? (double)query.SharedBlksRead / totalBlks : 0;
        if (diskReadRatio > 0.5)
        {
            issues.Add("Alto uso de leituras do disco");
            score += 2;
        }
        else if (diskReadRatio > 0.3)
        {
            issues.Add("Moderado uso de leituras do disco");
            score += 1;
        }

        // Arquivos temporários
        if (query.TempBlksRead > 0 || query.TempBlksWritten > 0)
        {
            issues.Add("Uso de arquivos temporários");
            score += 2;
        }

        // Muitas chamadas com tempo alto
        if (query.Calls > 1000 && query.MeanTime > 50)
        {
            issues.Add("Muitas chamadas com tempo elevado");
            score += 1;
        }

        // Determinar nível de impacto
        string level;
        string description;

        if (score >= 6)
        {
            level = "critical";
            description = $"Crítico: {string.Join(", ", issues)}. Requer otimização imediata.";
        }
        else if (score >= 4)
        {
            level = "high";
            description = $"Alto: {string.Join(", ", issues)}. Recomenda-se otimização.";
        }
        else if (score >= 2)
        {
            level = "medium";
            description = $"Médio: {string.Join(", ", issues)}. Pode se beneficiar de otimização.";
        }
        else
        {
            level = "low";
            description = "Baixo impacto. Performance aceitável.";
        }

        return (level, description);
    }
}
