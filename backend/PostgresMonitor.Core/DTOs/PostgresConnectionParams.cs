namespace PostgresMonitor.Core.DTOs;

public readonly record struct PostgresConnectionParams(
    string Host,
    int Port,
    string Database,
    string Username,
    string Password,
    bool SslEnabled = false
);
