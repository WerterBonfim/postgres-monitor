using PostgresMonitor.Api.Endpoints.Connections;
using PostgresMonitor.Api.Endpoints.QueryHistory;
using PostgresMonitor.Api.Endpoints.PostgreSQLLogs;
using PostgresMonitor.Api.Endpoints.IndexDetails;
using PostgresMonitor.Api.Endpoints.TableDetails;
using PostgresMonitor.Api.Endpoints.IndexTypes;
using PostgresMonitor.Api.Endpoints.QueryPlan;
using PostgresMonitor.Api.Endpoints.Monitoring;
using PostgresMonitor.Api.Endpoints.BackendLogs;
using PostgresMonitor.Infrastructure.Analysis;
using PostgresMonitor.Infrastructure.Helpers;
using PostgresMonitor.Infrastructure.LiteDb;
using PostgresMonitor.Infrastructure.Logging;
using PostgresMonitor.Infrastructure.PostgreSQL;
using PostgresMonitor.Infrastructure.Repositories;
using PostgresMonitor.Infrastructure.Services;
using Scalar.AspNetCore;

var port = Environment.GetEnvironmentVariable("PORT") ?? "5001";
var portNumber = int.Parse(port);

if (!PortHelper.IsPortAvailable(portNumber))
{
    Console.Error.WriteLine($"ERRO: A porta {port} já está em uso. Verifique se há outra instância do aplicativo rodando.");
    Console.Error.WriteLine("Tente usar uma porta diferente definindo a variável de ambiente PORT.");
    Environment.Exit(1);
}

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls($"http://localhost:{port}");

builder.Services.AddHealthChecks();
builder.Services.AddValidation();
builder.Services.AddOpenApi();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddSingleton<LiteDbContext>(serviceProvider =>
{
    var configuration = serviceProvider.GetRequiredService<IConfiguration>();
    var dbPath = configuration.GetValue<string>("LiteDB:DatabasePath");
    return new LiteDbContext(dbPath);
});

builder.Services.AddSingleton<CryptoService>();
builder.Services.AddScoped<QueryPlanService>();
builder.Services.AddScoped<QueryPlanAnalyzer>();
builder.Services.AddScoped<ConnectionRepository>();
builder.Services.AddScoped<MonitoringService>();
builder.Services.AddScoped<HistoricalMetricsService>();
builder.Services.AddScoped<QueryHistoryService>();

var loggerProvider = new InMemoryLoggerProvider(maxLogs: 500);
builder.Services.AddSingleton(loggerProvider);
builder.Services.AddLogging(loggingBuilder =>
{
    loggingBuilder.AddProvider(loggerProvider);
});

var app = builder.Build();

app.MapHealthChecks("/health");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options
            .WithTitle("Postgres Monitor API")
            .AddDocument("v1", "Postgres Monitor");
    });
    app.MapGet("/", () => Results.Redirect("/scalar")).ExcludeFromDescription();
}
else
{
    app.MapGet("/", () => Results.Redirect("/health")).ExcludeFromDescription();
}

app.UseCors();

app.UseExceptionHandler(appErr =>
{
    appErr.Run(async ctx =>
    {
        ctx.Response.StatusCode = 500;
        ctx.Response.ContentType = "application/json; charset=utf-8";
        var ex = ctx.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        var obj = new { title = "Erro interno", detail = ex?.Message ?? "Erro desconhecido", type = ex?.GetType().Name ?? "Unknown" };
        await ctx.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(obj));
    });
});

app.MapConnectionsEndpoints();
app.MapQueryHistoryEndpoints();
app.MapPostgreSQLLogsEndpoints();
app.MapIndexDetailsEndpoints();
app.MapTableDetailsEndpoints();
app.MapIndexTypesEndpoints();
app.MapQueryPlanEndpoints();
app.MapMonitoringEndpoints();
app.MapBackendLogsEndpoints();

app.Run();
