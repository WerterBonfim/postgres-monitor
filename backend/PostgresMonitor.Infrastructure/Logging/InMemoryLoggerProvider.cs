using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace PostgresMonitor.Infrastructure.Logging;

public class InMemoryLoggerProvider : ILoggerProvider
{
    private readonly ConcurrentQueue<string> _logs = new();
    private readonly int _maxLogs;
    private readonly object _lock = new();

    public InMemoryLoggerProvider(int maxLogs = 500)
    {
        _maxLogs = maxLogs;
    }

    public ILogger CreateLogger(string categoryName)
    {
        return new InMemoryLogger(categoryName, this);
    }

    public void AddLog(string message)
    {
        lock (_lock)
        {
            _logs.Enqueue($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {message}");
            
            // Manter apenas as últimas N linhas
            while (_logs.Count > _maxLogs)
            {
                _logs.TryDequeue(out _);
            }
        }
    }

    public string[] GetLogs(int maxLines = 100)
    {
        lock (_lock)
        {
            var logs = _logs.ToArray();
            var startIndex = Math.Max(0, logs.Length - maxLines);
            return logs.Skip(startIndex).ToArray();
        }
    }

    public void Dispose()
    {
        // Nada para limpar
    }
}

internal class InMemoryLogger : ILogger
{
    private readonly string _categoryName;
    private readonly InMemoryLoggerProvider _provider;

    public InMemoryLogger(string categoryName, InMemoryLoggerProvider provider)
    {
        _categoryName = categoryName;
        _provider = provider;
    }

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull
    {
        return null;
    }

    public bool IsEnabled(LogLevel logLevel)
    {
        return logLevel >= LogLevel.Information;
    }

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        if (!IsEnabled(logLevel))
            return;

        var message = formatter(state, exception);
        var logLevelStr = logLevel switch
        {
            LogLevel.Trace => "TRACE",
            LogLevel.Debug => "DEBUG",
            LogLevel.Information => "INFO",
            LogLevel.Warning => "WARN",
            LogLevel.Error => "ERROR",
            LogLevel.Critical => "CRITICAL",
            _ => "INFO"
        };

        var fullMessage = $"[{logLevelStr}] [{_categoryName}] {message}";
        
        if (exception != null)
        {
            fullMessage += $"\n{exception}";
        }

        _provider.AddLog(fullMessage);
    }
}
