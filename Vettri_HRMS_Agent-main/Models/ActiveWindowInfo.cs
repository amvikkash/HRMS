namespace HaodaOne.Agent.Models;

/// <summary>
/// A single point-in-time snapshot of the foreground window, as read from Win32.
/// This is the raw signal; ActivityTrackerService turns a stream of these into
/// ActivitySession records with start/end/duration.
/// </summary>
public sealed record ActiveWindowInfo(
    string ProcessName,
    string WindowTitle,
    int ProcessId,
    DateTimeOffset CapturedAtUtc)
{
    public static readonly ActiveWindowInfo Empty = new("idle", string.Empty, 0, DateTimeOffset.UtcNow);

    public bool IsIdle => ProcessName.Equals("idle", StringComparison.OrdinalIgnoreCase);
}
