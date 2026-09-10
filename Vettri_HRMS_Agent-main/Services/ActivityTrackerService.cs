using HaodaOne.Agent.Configuration;
using HaodaOne.Agent.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HaodaOne.Agent.Services;

/// <summary>
/// The app-switch state machine described in the spec:
///
///   09:00 Chrome  -> open session (Chrome, start=09:00)
///   09:30 Excel   -> switch detected: close Chrome session (end=09:30, duration=30m),
///                    enqueue it, open new session (Excel, start=09:30)
///
/// A "switch" is a change in process name OR a materially different window title within
/// the same process (e.g. chrome.exe navigating from Gmail to a Salesforce tab) — title-only
/// changes are treated as a switch too, since window title is how we report what the user
/// was doing, not just which .exe was open.
/// </summary>
public sealed class ActivityTrackerService : IActivityTrackerService
{
    private readonly ILogger<ActivityTrackerService> _logger;
    private readonly AgentSettings _settings;
    private readonly ILocalCacheService _cache;

    private readonly object _lock = new();
    private ActivitySession? _current;
    private ActiveWindowInfo _lastObserved = ActiveWindowInfo.Empty;

    public ActivitySession? CurrentSession
    {
        get { lock (_lock) { return _current; } }
    }

    public ActivityTrackerService(
        ILogger<ActivityTrackerService> logger,
        IOptions<AgentSettings> settings,
        ILocalCacheService cache)
    {
        _logger = logger;
        _settings = settings.Value;
        _cache = cache;
    }

    public void ObserveActiveWindow(ActiveWindowInfo observed, DeviceInfo device)
    {
        lock (_lock)
        {
            bool isSameApp = _current is not null
                && !observed.IsIdle
                && string.Equals(_current.ProcessName, observed.ProcessName, StringComparison.OrdinalIgnoreCase)
                && string.Equals(_current.WindowTitle, observed.WindowTitle, StringComparison.Ordinal);

            if (isSameApp)
            {
                _lastObserved = observed;
                return; // still the same app/window, nothing to do
            }

            // Something changed: switched app, switched window title, or went idle/came back.
            CloseCurrentSessionInternal(observed.CapturedAtUtc);

            if (!observed.IsIdle)
            {
                _current = new ActivitySession
                {
                    DeviceId = device.DeviceId,
                    Username = device.Username,
                    ProcessName = observed.ProcessName,
                    ApplicationName = FriendlyAppName(observed.ProcessName),
                    WindowTitle = observed.WindowTitle,
                    StartTimeUtc = observed.CapturedAtUtc,
                    IsIdleSession = false
                };

                _logger.LogDebug("New session started: {App} - {Title}", _current.ApplicationName, _current.WindowTitle);
            }
            else
            {
                _current = new ActivitySession
                {
                    DeviceId = device.DeviceId,
                    Username = device.Username,
                    ProcessName = "idle",
                    ApplicationName = "Idle",
                    WindowTitle = string.Empty,
                    StartTimeUtc = observed.CapturedAtUtc,
                    IsIdleSession = true
                };
            }

            _lastObserved = observed;
        }
    }

    public void CloseCurrentSession()
    {
        lock (_lock)
        {
            CloseCurrentSessionInternal(DateTimeOffset.UtcNow);
        }
    }

    /// <summary>Must be called under _lock.</summary>
    private void CloseCurrentSessionInternal(DateTimeOffset endTimeUtc)
    {
        if (_current is null)
        {
            return;
        }

        _current.Close(endTimeUtc);

        if (_current.DurationSeconds >= _settings.MinSessionDurationSeconds)
        {
            _cache.EnqueueSession(_current);
            _logger.LogInformation(
                "Session closed: {App} ran {Duration}s ({Title})",
                _current.ApplicationName, _current.DurationSeconds, Truncate(_current.WindowTitle, 60));
        }
        else
        {
            _logger.LogDebug(
                "Session discarded (below MinSessionDurationSeconds): {App} {Duration}s",
                _current.ApplicationName, _current.DurationSeconds);
        }

        _current = null;
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max] + "...";

    /// <summary>Maps well-known process names to friendly display names for reporting/dashboards.</summary>
    private static string FriendlyAppName(string processName)
    {
        return processName.ToLowerInvariant() switch
        {
            "chrome.exe" => "Google Chrome",
            "msedge.exe" => "Microsoft Edge",
            "firefox.exe" => "Mozilla Firefox",
            "excel.exe" => "Microsoft Excel",
            "winword.exe" => "Microsoft Word",
            "powerpnt.exe" => "Microsoft PowerPoint",
            "outlook.exe" => "Microsoft Outlook",
            "teams.exe" => "Microsoft Teams",
            "ms-teams.exe" => "Microsoft Teams",
            "code.exe" => "Visual Studio Code",
            "devenv.exe" => "Visual Studio",
            "slack.exe" => "Slack",
            "zoom.exe" => "Zoom",
            "explorer.exe" => "File Explorer",
            "notepad.exe" => "Notepad",
            "idle" => "Idle",
            _ => processName
        };
    }
}
