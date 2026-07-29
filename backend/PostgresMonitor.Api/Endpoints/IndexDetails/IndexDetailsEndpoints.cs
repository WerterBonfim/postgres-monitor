using Microsoft.Extensions.Logging;
using PostgresMonitor.Infrastructure.Services;

namespace PostgresMonitor.Api.Endpoints.IndexDetails;

internal class IndexDetailsEndpointsLogger { }

public static class IndexDetailsEndpoints
{
    public static WebApplication MapIndexDetailsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/postgresql/connections/{id}/indexes/{schema}/{table}/{index}/details")
            .WithTags("Index Details");

        group.MapGet("", async (
            string id,
            string schema,
            string table,
            string index,
            MonitoringService monitoringService,
            ILogger<IndexDetailsEndpointsLogger> logger) =>
        {
            try
            {
                var details = await monitoringService.GetIndexDetailsAsync(id, schema, table, index);
                var indexDetails = details;
                return Results.Ok(new
                {
                    schemaName = indexDetails.SchemaName,
                    tableName = indexDetails.TableName,
                    indexName = indexDetails.IndexName,
                    indexScans = indexDetails.IndexScans,
                    indexTuplesRead = indexDetails.IndexTuplesRead,
                    indexTuplesFetched = indexDetails.IndexTuplesFetched,
                    indexSize = indexDetails.IndexSize,
                    tableSize = indexDetails.TableSize,
                    indexPercentOfTable = indexDetails.IndexPercentOfTable,
                    isUnique = indexDetails.IsUnique,
                    isPrimary = indexDetails.IsPrimary,
                    isValid = indexDetails.IsValid,
                    indexDefinition = indexDetails.IndexDefinition,
                    tableSeqScans = indexDetails.TableSeqScans,
                    tableIndexScans = indexDetails.TableIndexScans,
                    tableIndexUsageRatio = indexDetails.TableIndexUsageRatio,
                    tableLiveTuples = indexDetails.TableLiveTuples,
                    tableDeadTuples = indexDetails.TableDeadTuples,
                    tableDeadTupleRatio = indexDetails.TableDeadTupleRatio,
                    tableInserts = indexDetails.TableInserts,
                    tableUpdates = indexDetails.TableUpdates,
                    tableDeletes = indexDetails.TableDeletes,
                    lastVacuum = indexDetails.LastVacuum,
                    lastAutovacuum = indexDetails.LastAutovacuum,
                    lastAnalyze = indexDetails.LastAnalyze,
                    lastAutoanalyze = indexDetails.LastAutoanalyze,
                    vacuumCount = indexDetails.VacuumCount,
                    autovacuumCount = indexDetails.AutovacuumCount,
                    analyzeCount = indexDetails.AnalyzeCount,
                    autoanalyzeCount = indexDetails.AutoanalyzeCount,
                    totalReorganizations = indexDetails.TotalReorganizations
                });
            }
            catch (InvalidOperationException ex)
            {
                logger.LogWarning(ex, "Index not found: {Schema}.{Table}.{Index}", schema, table, index);
                return Results.NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error getting index details for connection {ConnectionId}, schema {Schema}, table {Table}, index {Index}", id, schema, table, index);
                var detail = (ex.Message ?? "").Replace("\r", " ").Replace("\n", " ");
                return Results.Json(
                    new { title = "Erro ao obter detalhes do índice", detail, type = ex.GetType().Name },
                    statusCode: 500);
            }
        })
        .WithName("GetIndexDetails");

        return app;
    }
}
