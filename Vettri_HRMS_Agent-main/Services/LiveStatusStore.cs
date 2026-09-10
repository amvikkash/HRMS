namespace HaodaOne.Agent.Services;

/// <summary>
/// Holds the most recent "what's the user doing right now" status reported by the
/// UserMonitor over the pipe, purely for the heartbeat's CurrentApplication/WindowTitle
/// fields. This replaces the old design where the Service ran its own
/// ActivityTrackerService and read CurrentSession directly — that logic now lives
/// entirely in the Monitor process, which is the only one with a real desktop.
/// </summary>
public sealed class LiveStatusStore
{
    private readonly object _lock = new();
    private string _currentApplication = "Unknown";
    private string _currentWindowTitle = string.Empty;
    private bool _isIdle;
    private DateTimeOffset _updatedAtUtc;

    public void Update(string application, string windowTitle, bool isIdle)
    {
        lock (_lock)
        {
            _currentApplication = application;
            _currentWindowTitle = windowTitle;
            _isIdle = isIdle;
            _updatedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    /// <summary>
    /// Returns (application, windowTitle, isIdle, hasFreshData). hasFreshData is false
    /// when no Monitor has reported in longer than maxAge — e.g. no one is logged on,
    /// the Monitor hasn't started yet, or its pipe connection dropped — so the caller
    /// can distinguish "genuinely idle" from "we simply don't know."
    /// </summary>
    public (string Application, string WindowTitle, bool IsIdle, bool HasFreshData) GetStatus(TimeSpan maxAge)
    {
        lock (_lock)
        {
            bool fresh = _updatedAtUtc != default && DateTimeOffset.UtcNow - _updatedAtUtc <= maxAge;
            return (_currentApplication, _currentWindowTitle, _isIdle, fresh);
        }
    }
}
