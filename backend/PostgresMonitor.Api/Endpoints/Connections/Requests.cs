namespace PostgresMonitor.Api.Endpoints.Connections;

using System.ComponentModel.DataAnnotations;

public record CreateConnectionRequest(
    string Name,
    string Host,
    int Port,
    string Database,
    string Username,
    string Password,
    bool SslEnabled = false
);
