using PostgresMonitor.Infrastructure.Services;

namespace PostgresMonitor.Api.Endpoints.TableDetails;

public static class TableDetailsEndpoints
{
    public static WebApplication MapTableDetailsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/postgresql/connections/{id}/tables/{schema}/{table}/details")
            .WithTags("Table Details");

        group.MapGet("", async (
            string id,
            string schema,
            string table,
            MonitoringService monitoringService) =>
        {
            try
            {
                var tableDetails = await monitoringService.GetTableDetailsAsync(id, schema, table);
                return Results.Ok(new
                {
                    schemaName = tableDetails.SchemaName,
                    tableName = tableDetails.TableName,
                    tableSize = tableDetails.TableSize,
                    indexSize = tableDetails.IndexSize,
                    totalSize = tableDetails.TotalSize,
                    rowCount = tableDetails.RowCount,
                    liveTuples = tableDetails.LiveTuples,
                    deadTuples = tableDetails.DeadTuples,
                    deadTupleRatio = tableDetails.DeadTupleRatio,
                    seqScans = tableDetails.SeqScans,
                    seqTupRead = tableDetails.SeqTupRead,
                    indexScans = tableDetails.IndexScans,
                    indexTupFetch = tableDetails.IndexTupFetch,
                    indexUsageRatio = tableDetails.IndexUsageRatio,
                    cacheHitRatio = tableDetails.CacheHitRatio,
                    inserts = tableDetails.Inserts,
                    updates = tableDetails.Updates,
                    deletes = tableDetails.Deletes,
                    lastVacuum = tableDetails.LastVacuum,
                    lastAutovacuum = tableDetails.LastAutovacuum,
                    lastAnalyze = tableDetails.LastAnalyze,
                    lastAutoanalyze = tableDetails.LastAutoanalyze,
                    vacuumCount = tableDetails.VacuumCount,
                    autovacuumCount = tableDetails.AutovacuumCount,
                    analyzeCount = tableDetails.AnalyzeCount,
                    autoanalyzeCount = tableDetails.AutoanalyzeCount,
                    totalReorganizations = tableDetails.TotalReorganizations,
                    columns = tableDetails.Columns.Select(c => new
                    {
                        columnName = c.ColumnName,
                        dataType = c.DataType,
                        isNullable = c.IsNullable,
                        defaultValue = c.DefaultValue,
                        isPrimaryKey = c.IsPrimaryKey,
                        characterMaximumLength = c.CharacterMaximumLength,
                        numericPrecision = c.NumericPrecision,
                        numericScale = c.NumericScale
                    }).ToList(),
                    impactLevel = tableDetails.ImpactLevel,
                    impactDescription = tableDetails.ImpactDescription
                });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        })
        .WithName("GetTableDetails");

        return app;
    }
}
