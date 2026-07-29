using Microsoft.Extensions.Logging;
using PostgresMonitor.Infrastructure.LiteDb;
using PostgresMonitor.Infrastructure.LiteDb.Entities;

namespace PostgresMonitor.Infrastructure.Services;

public sealed class HistoricalMetricsService
{
    private readonly ILogger<HistoricalMetricsService> _logger;
    private readonly LiteDbContext _context;

    public HistoricalMetricsService(
        ILogger<HistoricalMetricsService> logger,
        LiteDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public async Task<List<HistoricalMetricEntity>> GetHistoricalMetricsAsync(
        string connectionId,
        string period,
        CancellationToken cancellationToken = default)
    {
        return await Task.Run(() =>
        {
            var endDate = DateTime.UtcNow;
            DateTime startDate;

            switch (period.ToLower())
            {
                case "24h":
                    startDate = endDate.AddHours(-24);
                    break;
                case "7d":
                    startDate = endDate.AddDays(-7);
                    break;
                case "30d":
                    startDate = endDate.AddDays(-30);
                    break;
                default:
                    startDate = endDate.AddHours(-24);
                    break;
            }

            return _context.HistoricalMetrics
                .Find(m => m.ConnectionId == connectionId &&
                           m.PeriodStart >= startDate &&
                           m.PeriodEnd <= endDate)
                .OrderBy(m => m.PeriodStart)
                .ToList();
        }, cancellationToken);
    }

    public async Task<List<HistoricalMetricEntity>> GetHistoricalMetricsRangeAsync(
        string connectionId,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        return await Task.Run(() =>
        {
            return _context.HistoricalMetrics
                .Find(m => m.ConnectionId == connectionId &&
                           m.PeriodStart >= startDate &&
                           m.PeriodEnd <= endDate)
                .OrderBy(m => m.PeriodStart)
                .ToList();
        }, cancellationToken);
    }

    public async Task AggregateMetricsAsync(
        string connectionId,
        CancellationToken cancellationToken = default)
    {
        await Task.Run(() =>
        {
            try
            {
                var now = DateTime.UtcNow;
                
                // Agregar por hora (últimas 24 horas)
                var hourlyStart = now.AddHours(-24);
                var hourlyMetrics = _context.Metrics
                    .Find(m => m.ConnectionId == connectionId &&
                               m.CollectedAt >= hourlyStart &&
                               m.CollectedAt < now)
                    .ToList();

                if (hourlyMetrics.Any())
                {
                    var hourlyGroups = hourlyMetrics
                        .GroupBy(m => new
                        {
                            Year = m.CollectedAt.Year,
                            Month = m.CollectedAt.Month,
                            Day = m.CollectedAt.Day,
                            Hour = m.CollectedAt.Hour
                        })
                        .ToList();

                    foreach (var group in hourlyGroups)
                    {
                        var periodStart = new DateTime(
                            group.Key.Year,
                            group.Key.Month,
                            group.Key.Day,
                            group.Key.Hour,
                            0,
                            0,
                            DateTimeKind.Utc);
                        var periodEnd = periodStart.AddHours(1);

                        // Verificar se já existe
                        var existing = _context.HistoricalMetrics
                            .FindOne(m => m.ConnectionId == connectionId &&
                                         m.PeriodStart == periodStart &&
                                         m.PeriodType == "Hourly");

                        if (existing == null)
                        {
                            var aggregated = AggregateMetricsData(group.ToList());
                            var historical = new HistoricalMetricEntity
                            {
                                ConnectionId = connectionId,
                                PeriodStart = periodStart,
                                PeriodEnd = periodEnd,
                                PeriodType = "Hourly",
                                AggregatedData = aggregated
                            };

                            _context.HistoricalMetrics.Insert(historical);
                        }
                    }
                }

                // Agregar por dia (últimos 30 dias)
                var dailyStart = now.AddDays(-30);
                var dailyMetrics = _context.Metrics
                    .Find(m => m.ConnectionId == connectionId &&
                               m.CollectedAt >= dailyStart &&
                               m.CollectedAt < now)
                    .ToList();

                if (dailyMetrics.Any())
                {
                    var dailyGroups = dailyMetrics
                        .GroupBy(m => new
                        {
                            Year = m.CollectedAt.Year,
                            Month = m.CollectedAt.Month,
                            Day = m.CollectedAt.Day
                        })
                        .ToList();

                    foreach (var group in dailyGroups)
                    {
                        var periodStart = new DateTime(
                            group.Key.Year,
                            group.Key.Month,
                            group.Key.Day,
                            0,
                            0,
                            0,
                            DateTimeKind.Utc);
                        var periodEnd = periodStart.AddDays(1);

                        // Verificar se já existe
                        var existing = _context.HistoricalMetrics
                            .FindOne(m => m.ConnectionId == connectionId &&
                                         m.PeriodStart == periodStart &&
                                         m.PeriodType == "Daily");

                        if (existing == null)
                        {
                            var aggregated = AggregateMetricsData(group.ToList());
                            var historical = new HistoricalMetricEntity
                            {
                                ConnectionId = connectionId,
                                PeriodStart = periodStart,
                                PeriodEnd = periodEnd,
                                PeriodType = "Daily",
                                AggregatedData = aggregated
                            };

                            _context.HistoricalMetrics.Insert(historical);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error aggregating metrics for connection {ConnectionId}", connectionId);
            }
        }, cancellationToken);
    }

    private Dictionary<string, object> AggregateMetricsData(List<MonitoringMetricEntity> metrics)
    {
        var aggregated = new Dictionary<string, object>();

        if (!metrics.Any())
            return aggregated;

        // Agregar ConnectionStats
        var connectionStats = metrics
            .Where(m => m.ConnectionStats != null)
            .Select(m => m.ConnectionStats!)
            .ToList();

        if (connectionStats.Any())
        {
            aggregated["avgActiveConnections"] = connectionStats.Average(c => c.ActiveConnections);
            aggregated["maxActiveConnections"] = connectionStats.Max(c => c.ActiveConnections);
            aggregated["avgIdleConnections"] = connectionStats.Average(c => c.IdleConnections);
            aggregated["avgTotalConnections"] = connectionStats.Average(c => c.TotalConnections);
        }

        // Agregar DatabaseEfficiency
        var dbEfficiency = metrics
            .Where(m => m.DatabaseEfficiency != null)
            .Select(m => m.DatabaseEfficiency!)
            .ToList();

        if (dbEfficiency.Any())
        {
            aggregated["avgGlobalCacheHitRatio"] = dbEfficiency.Average(e => e.GlobalCacheHitRatio);
            aggregated["avgCommitRollbackRatio"] = dbEfficiency.Average(e => e.CommitRollbackRatio);
            aggregated["totalTempFiles"] = dbEfficiency.Sum(e => e.TempFilesCount);
            aggregated["totalTempBytes"] = dbEfficiency.Sum(e => e.TempBytes);
        }

        // Agregar LockStats
        var lockStats = metrics
            .Where(m => m.LockStats != null)
            .Select(m => m.LockStats!)
            .ToList();

        if (lockStats.Any())
        {
            aggregated["avgLockCount"] = lockStats.Average(l => l.LockCount);
            aggregated["maxLockCount"] = lockStats.Max(l => l.LockCount);
            aggregated["avgLockedRelations"] = lockStats.Average(l => l.LockedRelations);
        }

        // Contagem de métricas
        aggregated["metricCount"] = metrics.Count;
        aggregated["collectedAtStart"] = metrics.Min(m => m.CollectedAt);
        aggregated["collectedAtEnd"] = metrics.Max(m => m.CollectedAt);

        return aggregated;
    }
}
