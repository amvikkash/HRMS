namespace HaodaOne.Agent.Models;

public sealed class HeartbeatRequest
{
    public DeviceInfo Device { get; set; } = new();

    public string Status { get; set; } = "ONLINE"; // ONLINE | IDLE | LOCKED

    public string CurrentUser { get; set; } = string.Empty;

    public DateTimeOffset LastSeenUtc { get; set; } = DateTimeOffset.UtcNow;

    public string CurrentApplication { get; set; } = string.Empty;

    public string CurrentWindowTitle { get; set; } = string.Empty;

    public string AgentVersion { get; set; } = string.Empty;
}

public sealed class HeartbeatResponse
{
    public bool Success { get; set; }

    public string? Message { get; set; }

    /// <summary>Lets the server push config changes (e.g. new polling interval) without redeploying.</summary>
    public RemoteAgentDirective? Directive { get; set; }
}

/// <summary>Optional server-driven overrides, applied in-memory only (never persisted over local config).</summary>
public sealed class RemoteAgentDirective
{
    public int? HeartbeatIntervalSeconds { get; set; }

    public bool? PauseMonitoring { get; set; }
}
