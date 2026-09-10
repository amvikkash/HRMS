using System.Diagnostics;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;
using System.Text.Json;

namespace HaodaOne.Agent.UserMonitor;

internal static class Program
{
    private const string PipeName = "HaodaOneAgentIPC";
    private const int PollMilliseconds = 1000;
    private const int MinimumSessionSeconds = 3;
    private const int IdleThresholdSeconds = 300;

    private static async Task Main()
    {
        string username = WindowsIdentity.GetCurrent().Name;
        string logDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "HaodaOne", "Agent", "Logs");
        Directory.CreateDirectory(logDirectory);
        string logPath = Path.Combine(logDirectory, $"monitor-{DateTime.UtcNow:yyyyMMdd}.log");
        await LogAsync(logPath, $"Haoda One User Monitor starting for {username}");

        MonitorState? state = null;
        while (true)
        {
            try
            {
                await using var pipe = new NamedPipeClientStream(".", PipeName, PipeDirection.Out, PipeOptions.Asynchronous);
                await pipe.ConnectAsync(5000);
                await LogAsync(logPath, "Connected to HaodaOneAgentIPC");
                state = await TrackAsync(pipe, username, logPath, state);
            }
            catch (Exception ex) when (ex is IOException or TimeoutException or UnauthorizedAccessException)
            {
                await LogAsync(logPath, $"Pipe unavailable: {ex.Message}");
                await Task.Delay(5000);
            }
        }
    }

    private static async Task<MonitorState?> TrackAsync(Stream pipe, string username, string logPath, MonitorState? state)
    {
        using var writer = new StreamWriter(pipe, new UTF8Encoding(false), leaveOpen: true) { AutoFlush = true };
        while (pipe is { CanWrite: true })
        {
            var snapshot = ReadForegroundWindow();
            if (snapshot is null)
            {
                await Task.Delay(PollMilliseconds);
                continue;
            }

            bool idle = GetIdleSeconds() >= IdleThresholdSeconds;
            if (state is null || !string.Equals(state.ProcessName, snapshot.ProcessName, StringComparison.OrdinalIgnoreCase))
            {
                if (state is not null)
                    await CloseSessionAsync(writer, state, DateTimeOffset.UtcNow, username, logPath);

                state = new MonitorState(snapshot.ProcessName, snapshot.ApplicationName, snapshot.WindowTitle, DateTimeOffset.UtcNow, idle);
                await LogAsync(logPath, $"New session started: {snapshot.ApplicationName} - {snapshot.WindowTitle}");
            }
            else
            {
                state = state with { WindowTitle = snapshot.WindowTitle, IsIdle = idle };
            }

            await WriteAsync(writer, new AgentIpcMessage
            {
                Type = "StatusUpdate",
                ProcessName = state.ProcessName,
                ApplicationName = state.ApplicationName,
                WindowTitle = state.WindowTitle,
                Username = username,
                IsIdleSession = state.IsIdle,
                StartTimeUtc = state.StartTimeUtc
            });
            await Task.Delay(PollMilliseconds);
        }

        return state;
    }

    private static async Task CloseSessionAsync(StreamWriter writer, MonitorState state, DateTimeOffset end, string username, string logPath)
    {
        if ((end - state.StartTimeUtc).TotalSeconds < MinimumSessionSeconds)
            return;

        await WriteAsync(writer, new AgentIpcMessage
        {
            Type = "SessionClosed",
            MessageId = Guid.NewGuid().ToString("N"),
            ProcessName = state.ProcessName,
            ApplicationName = state.ApplicationName,
            WindowTitle = state.WindowTitle,
            Username = username,
            IsIdleSession = state.IsIdle,
            StartTimeUtc = state.StartTimeUtc,
            EndTimeUtc = end,
            DurationSeconds = Math.Max(1, (int)Math.Round((end - state.StartTimeUtc).TotalSeconds))
        });
        await LogAsync(logPath, $"Session closed: {state.ApplicationName}");
    }

    private static async Task WriteAsync(StreamWriter writer, AgentIpcMessage message)
    {
        await writer.WriteLineAsync(JsonSerializer.Serialize(message));
    }

    private static async Task LogAsync(string path, string message)
    {
        await File.AppendAllTextAsync(path, $"{DateTimeOffset.Now:O} {message}{Environment.NewLine}");
    }

    private static ForegroundSnapshot? ReadForegroundWindow()
    {
        IntPtr handle = GetForegroundWindow();
        if (handle == IntPtr.Zero) return null;
        var titleBuilder = new StringBuilder(512);
        GetWindowText(handle, titleBuilder, titleBuilder.Capacity);
        GetWindowThreadProcessId(handle, out uint processId);
        try
        {
            using var process = Process.GetProcessById((int)processId);
            return new ForegroundSnapshot(process.ProcessName, process.MainModule?.FileVersionInfo.FileDescription ?? process.ProcessName, titleBuilder.ToString());
        }
        catch
        {
            return null;
        }
    }

    private static double GetIdleSeconds()
    {
        if (!GetLastInputInfo(out LASTINPUTINFO info)) return 0;
        return ((uint)Environment.TickCount - info.dwTime) / 1000d;
    }

    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool GetLastInputInfo(out LASTINPUTINFO info);

    private struct LASTINPUTINFO { public uint cbSize; public uint dwTime; public LASTINPUTINFO() { cbSize = (uint)Marshal.SizeOf<LASTINPUTINFO>(); dwTime = 0; } }
    private sealed record ForegroundSnapshot(string ProcessName, string ApplicationName, string WindowTitle);
    private sealed record MonitorState(string ProcessName, string ApplicationName, string WindowTitle, DateTimeOffset StartTimeUtc, bool IsIdle);
    private sealed class AgentIpcMessage
    {
        public string Type { get; set; } = string.Empty;
        public string? MessageId { get; set; }
        public string? ProcessName { get; set; }
        public string? ApplicationName { get; set; }
        public string? WindowTitle { get; set; }
        public string? Username { get; set; }
        public bool IsIdleSession { get; set; }
        public DateTimeOffset? StartTimeUtc { get; set; }
        public DateTimeOffset? EndTimeUtc { get; set; }
        public int DurationSeconds { get; set; }
    }
}
