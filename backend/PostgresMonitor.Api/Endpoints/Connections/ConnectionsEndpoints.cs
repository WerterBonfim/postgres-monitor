using PostgresMonitor.Infrastructure.MongoDb.Documents;
using PostgresMonitor.Infrastructure.Repositories;
using PostgresMonitor.Infrastructure.Services;
using System.ComponentModel.DataAnnotations;

namespace PostgresMonitor.Api.Endpoints.Connections;

public static class ConnectionsEndpoints
{
    public static WebApplication MapConnectionsEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/postgresql/connections")
            .WithTags("Connections");

        group.MapPost("", async (
            [Required] CreateConnectionRequest request,
            ConnectionRepository repository,
            CryptoService cryptoService) =>
        {
            var connection = new PostgresConnectionDocument
            {
                Name = request.Name,
                Host = request.Host,
                Port = request.Port,
                Database = request.Database,
                Username = request.Username,
                PasswordHash = cryptoService.Encrypt(request.Password),
                SslEnabled = request.SslEnabled,
                CreatedAt = DateTime.UtcNow
            };

            await repository.CreateAsync(connection);
            return Results.Created($"/api/postgresql/connections/{connection.Id}", connection);
        })
        .WithName("CreateConnection");

        group.MapGet("", async (ConnectionRepository repository) =>
        {
            var connections = await repository.GetAllAsync();
            var response = connections.Select(c => new
            {
                c.Id,
                c.Name,
                c.Host,
                c.Port,
                c.Database,
                c.Username,
                c.SslEnabled,
                c.IsDefault,
                c.CreatedAt
            });
            return Results.Ok(response);
        })
        .WithName("GetConnections");

        group.MapGet("/{id}", async (
            string id,
            ConnectionRepository repository) =>
        {
            var connection = await repository.GetByIdAsync(id);
            if (connection == null)
                return Results.NotFound();

            return Results.Ok(new
            {
                connection.Id,
                connection.Name,
                connection.Host,
                connection.Port,
                connection.Database,
                connection.Username,
                connection.SslEnabled,
                connection.IsDefault,
                connection.CreatedAt
            });
        })
        .WithName("GetConnection");

        group.MapPut("/{id}/set-default", async (
            string id,
            IConnectionRepository repository) =>
        {
            var success = await repository.SetAsDefaultAsync(id);
            if (!success)
                return Results.NotFound();

            return Results.Ok(new { message = "Conexão definida como padrão" });
        })
        .WithName("SetDefaultConnection");

        group.MapDelete("/{id}", async (
            string id,
            ConnectionRepository repository) =>
        {
            var deleted = await repository.DeleteAsync(id);
            if (!deleted)
                return Results.NotFound();

            return Results.NoContent();
        })
        .WithName("DeleteConnection");

        return app;
    }
}
