namespace PostgresMonitor.Core.DTOs;

public class QueryPlanNodeDto
{
    public string NodeType { get; set; } = string.Empty;
    public string? RelationName { get; set; }
    public string? Alias { get; set; }
    public CostDto? Cost { get; set; }
    public ActualTimeDto? ActualTime { get; set; }
    public RowsDto? Rows { get; set; }
    public long? Width { get; set; }
    public BuffersDto? Buffers { get; set; }
    public List<QueryPlanNodeDto> Children { get; set; } = new();
}

public class CostDto
{
    public decimal Startup { get; set; }
    public decimal Total { get; set; }
}

public class ActualTimeDto
{
    public decimal First { get; set; }
    public decimal Total { get; set; }
}

public class RowsDto
{
    public long Estimated { get; set; }
    public long? Actual { get; set; }
}

public class BuffersDto
{
    public long SharedHit { get; set; }
    public long SharedRead { get; set; }
}
