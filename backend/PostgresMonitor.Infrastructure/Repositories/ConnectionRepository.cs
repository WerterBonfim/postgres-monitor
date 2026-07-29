using PostgresMonitor.Infrastructure.LiteDb;
using PostgresMonitor.Infrastructure.LiteDb.Entities;
using PostgresMonitor.Infrastructure.MongoDb.Documents;

namespace PostgresMonitor.Infrastructure.Repositories;

public class ConnectionRepository
{
    private readonly LiteDbContext _context;

    public ConnectionRepository(LiteDbContext context)
    {
        _context = context;
    }

    public async Task<PostgresConnectionDocument> CreateAsync(PostgresConnectionDocument connection)
    {
        return await Task.Run(() =>
        {
            var entity = new PostgresConnectionEntity
            {
                Name = connection.Name,
                Host = connection.Host,
                Port = connection.Port,
                Database = connection.Database,
                Username = connection.Username,
                PasswordHash = connection.PasswordHash,
                SslEnabled = connection.SslEnabled,
                IsDefault = connection.IsDefault,
                CreatedAt = connection.CreatedAt == default ? DateTime.UtcNow : connection.CreatedAt
            };

            // Se esta conexão é padrão, remover padrão de outras
            if (entity.IsDefault)
            {
                var existingDefault = _context.Connections.FindOne(e => e.IsDefault && e.Id != entity.Id);
                if (existingDefault != null)
                {
                    existingDefault.IsDefault = false;
                    _context.Connections.Update(existingDefault);
                }
            }

            _context.Connections.Insert(entity);
            
            return new PostgresConnectionDocument
            {
                Id = entity.Id.ToString(),
                Name = entity.Name,
                Host = entity.Host,
                Port = entity.Port,
                Database = entity.Database,
                Username = entity.Username,
                PasswordHash = entity.PasswordHash,
                SslEnabled = entity.SslEnabled,
                IsDefault = entity.IsDefault,
                CreatedAt = entity.CreatedAt
            };
        });
    }

    public async Task<List<PostgresConnectionDocument>> GetAllAsync()
    {
        return await Task.Run(() =>
        {
            var entities = _context.Connections.FindAll().ToList();
            return entities.Select(e => new PostgresConnectionDocument
            {
                Id = e.Id.ToString(),
                Name = e.Name,
                Host = e.Host,
                Port = e.Port,
                Database = e.Database,
                Username = e.Username,
                PasswordHash = e.PasswordHash,
                SslEnabled = e.SslEnabled,
                IsDefault = e.IsDefault,
                CreatedAt = e.CreatedAt
            }).ToList();
        });
    }

    public async Task<PostgresConnectionDocument?> GetByIdAsync(string id)
    {
        if (!int.TryParse(id, out var intId))
            return null;

        return await Task.Run(() =>
        {
            var entity = _context.Connections.FindById(intId);
            if (entity == null)
                return null;

            return new PostgresConnectionDocument
            {
                Id = entity.Id.ToString(),
                Name = entity.Name,
                Host = entity.Host,
                Port = entity.Port,
                Database = entity.Database,
                Username = entity.Username,
                PasswordHash = entity.PasswordHash,
                SslEnabled = entity.SslEnabled,
                IsDefault = entity.IsDefault,
                CreatedAt = entity.CreatedAt
            };
        });
    }

    public async Task<bool> SetAsDefaultAsync(string id)
    {
        if (!int.TryParse(id, out var intId))
            return false;

        return await Task.Run(() =>
        {
            var entity = _context.Connections.FindById(intId);
            if (entity == null)
                return false;

            // Remover padrão de todas as outras conexões
            var allConnections = _context.Connections.FindAll().ToList();
            foreach (var conn in allConnections)
            {
                if (conn.IsDefault && conn.Id != intId)
                {
                    conn.IsDefault = false;
                    _context.Connections.Update(conn);
                }
            }

            // Definir esta como padrão
            entity.IsDefault = true;
            _context.Connections.Update(entity);
            return true;
        });
    }

    public async Task<bool> DeleteAsync(string id)
    {
        if (!int.TryParse(id, out var intId))
            return false;

        return await Task.Run(() => _context.Connections.Delete(intId));
    }
}
