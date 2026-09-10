namespace HaodaOne.Agent.Services;

public enum AgentConnectionState
{
    Connecting,
    Connected,
    Offline,
    AuthenticationRequired,
    Disabled,
    Degraded
}

public sealed record AgentHealthSnapshot(
    AgentConnectionState Connection,
    DateTimeOffset? LastHeartbeatUtc,
    DateTimeOffset? LastSuccessfulUploadUtc,
    int QueuedActivities,
    bool UserMonitorRunning,
    string AgentVersion);

public sealed class AgentHealthState
{
    private readonly object _gate = new();
    private AgentConnectionState _connection = AgentConnectionState.Connecting;
    private DateTimeOffset? _lastHeartbeatUtc;
    private DateTimeOffset? _lastSuccessfulUploadUtc;
    private int _queuedActivities;
    private bool _userMonitorRunning;

    public void SetConnection(AgentConnectionState state) { lock (_gate) _connection = state; }
    public void HeartbeatSucceeded() { lock (_gate) { _connection = AgentConnectionState.Connected; _lastHeartbeatUtc = DateTimeOffset.UtcNow; } }
    public void UploadSucceeded() { lock (_gate) { _connection = AgentConnectionState.Connected; _lastSuccessfulUploadUtc = DateTimeOffset.UtcNow; } }
    public void SetQueueDepth(int count) { lock (_gate) _queuedActivities = Math.Max(0, count); }
    public void SetUserMonitorRunning(bool running) { lock (_gate) _userMonitorRunning = running; }

    public AgentHealthSnapshot Snapshot() => lockSnapshot();

    private AgentHealthSnapshot lockSnapshot()
    {
        lock (_gate)
        {
            return new AgentHealthSnapshot(_connection, _lastHeartbeatUtc, _lastSuccessfulUploadUtc,
                _queuedActivities, _userMonitorRunning,
                System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "unknown");
        }
    }
}