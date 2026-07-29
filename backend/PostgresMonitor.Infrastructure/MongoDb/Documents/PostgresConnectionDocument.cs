namespace PostgresMonitor.Infrastructure.MongoDb.Documents;

public class PostgresConnectionDocument
{
    public string Id { get; set; } = string.Empty;

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
