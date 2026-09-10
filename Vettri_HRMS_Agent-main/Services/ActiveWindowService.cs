using System.Diagnostics;
using HaodaOne.Agent.Configuration;
using HaodaOne.Agent.Models;
using HaodaOne.Agent.Native;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HaodaOne.Agent.Services;

/// <summary>
/// Reads the current foreground window via user32 and resolves it to a friendly
/// application name + process name. Marks the user idle when there's been no
/// keyboard/mouse input for longer than AgentSettings.IdleThresholdSeconds.
/// </summary>
public sealed class ActiveWindowService : IActiveWindowService
{
    private readonly ILogger<ActiveWindowService> _logger;
    private readonly AgentSettings _settings;

    // Small cache so we don't re-resolve MainModule/FileVersionInfo for the same PID every poll.
    private (int Pid, string FriendlyName)? _lastResolved;

    public ActiveWindowService(ILogger<ActiveWindowService> logger, IOptions<AgentSettings> settings)
    {
        _logger = logger;
        _settings = settings.Value;
    }

    public ActiveWindowInfo GetCurrentActiveWindow()
    {
        try
        {
            int idleSeconds = Win32Interop.GetIdleSeconds();
            if (idleSeconds >= _settings.IdleThresholdSeconds)
            {
                return ActiveWindowInfo.Empty; // "idle"
            }

            IntPtr hWnd = Win32Interop.GetForegroundWindowHandle();
            if (hWnd == IntPtr.Zero)
            {
                return ActiveWindowInfo.Empty;
            }

            string title = Win32Interop.GetWindowTitle(hWnd);
            uint pid = Win32Interop.GetWindowProcessId(hWnd);
            if (pid == 0)
            {
                return ActiveWindowInfo.Empty;
            }

            string processName = ResolveProcessName((int)pid);
            if (string.IsNullOrWhiteSpace(processName))
            {
                return ActiveWindowInfo.Empty;
            }

            return new ActiveWindowInfo(processName, title, (int)pid, DateTimeOffset.UtcNow);
        }
        catch (Exception ex)
        {
            // Never let a transient Win32 failure (window closing mid-read, access denied on a
            // protected process, etc.) crash the polling loop.
            _logger.LogDebug(ex, "Failed to read active window; treating as idle for this tick");
            return ActiveWindowInfo.Empty;
        }
    }

    private string ResolveProcessName(int pid)
    {
        if (_lastResolved.HasValue && _lastResolved.Value.Pid == pid)
        {
            return _lastResolved.Value.FriendlyName;
        }

        try
        {
            using var process = Process.GetProcessById(pid);
            string name = process.ProcessName.ToLowerInvariant() + ".exe";
            _lastResolved = (pid, name);
            return name;
        }
        catch (ArgumentException)
        {
            // Process already exited between GetWindowThreadProcessId and GetProcessById.
            return string.Empty;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not resolve process name for PID {Pid}", pid);
            return string.Empty;
        }
    }
}
