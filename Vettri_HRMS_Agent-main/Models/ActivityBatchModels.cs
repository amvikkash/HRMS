namespace HaodaOne.Agent.Models;

public sealed class ActivityBatchRequest
{
    public DeviceInfo Device { get; set; } = new();

    public List<ActivitySession> Sessions { get; set; } = new();

    public DateTimeOffset BatchSentAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class ActivityBatchResponse
{
    public bool Success { get; set; }

    public string? Message { get; set; }

    /// <summary>Session IDs the server actually accepted; used to prune the local cache safely.</summary>
    public List<string> AcceptedSessionIds { get; set; } = new();
}

/// <summary>Generic wrapper matching a typical Spring Boot ApiResponse&lt;T&gt; envelope.</summary>
public sealed class ApiEnvelope<T>
{
    public bool Success { get; set; }

    public string? Message { get; set; }

    public T? Data { get; set; }

    public int? StatusCode { get; set; }
}
