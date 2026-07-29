using PostgresMonitor.Infrastructure.MongoDb.Documents;

namespace PostgresMonitor.Infrastructure.Repositories;

public interface IConnectionRepository
{
    Task<PostgresConnectionDocument> CreateAsync(PostgresConnectionDocument connection);
    Task<List<PostgresConnectionDocument>> GetAllAsync();
    Task<PostgresConnectionDocument?> GetByIdAsync(string id);
    Task<bool> SetAsDefaultAsync(string id);
    Task<bool> DeleteAsync(string id);
}
