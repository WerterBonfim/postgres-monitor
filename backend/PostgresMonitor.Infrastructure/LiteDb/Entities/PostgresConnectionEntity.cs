using LiteDB;

namespace PostgresMonitor.Infrastructure.LiteDb.Entities;

public class PostgresConnectionEntity
{
    [BsonId]
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
    public string Database { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool SslEnabled { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }
}
