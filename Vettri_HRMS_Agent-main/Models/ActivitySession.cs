namespace HaodaOne.Agent.Models;

/// <summary>
/// One tracked "app in focus" session, e.g. chrome.exe from 09:00 to 09:30 = 1800s.
/// This is the unit that gets queued locally and shipped to the API in batches.
/// </summary>
public sealed class ActivitySession
{
    /// <summary>Client-generated GUID so the server can de-duplicate on retry/replay.</summary>
    public string SessionId { get; set; } = Guid.NewGuid().ToString("N");

    public string DeviceId { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string ProcessName { get; set; } = string.Empty;

    public string ApplicationName { get; set; } = string.Empty;

    public string WindowTitle { get; set; } = string.Empty;

    public DateTimeOffset StartTimeUtc { get; set; }

    public DateTimeOffset? EndTimeUtc { get; set; }

    public int DurationSeconds { get; set; }

    public bool IsIdleSession { get; set; }

    /// <summary>True once EndTime/Duration have been finalized (app switched away from).</summary>
    public bool IsClosed => EndTimeUtc.HasValue;

    public void Close(DateTimeOffset endTimeUtc)
    {
        EndTimeUtc = endTimeUtc;
        var span = endTimeUtc - StartTimeUtc;
        DurationSeconds = span.TotalSeconds > 0 ? (int)Math.Round(span.TotalSeconds) : 0;
    }
}
