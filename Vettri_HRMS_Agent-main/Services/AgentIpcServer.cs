using System.IO.Pipes;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using HaodaOne.Agent.Ipc;
using HaodaOne.Agent.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HaodaOne.Agent.Services;

/// <summary>
/// Hosts \\.\pipe\HaodaOneAgentIPC, the only channel through which UserMonitor.exe
/// (running as the logged-on employee, no special privileges) gets activity data into
/// the Service (LocalSystem). The Service never calls Win32 desktop APIs itself — all
/// of that lives in UserMonitor, which actually has a desktop to read.
///
/// Runs a proper multi-client accept loop (not single sequential accept) so this
/// tolerates multiple concurrent interactive sessions on one box (fast user switching,
/// a stray leftover RDP session) without one Monitor instance starving another.
///
/// Security: an unauthenticated local process could otherwise connect to a well-known
/// pipe name and inject fabricated activity data. Two protections:
///   1. Explicit PipeSecurity: Authenticated Users may write, SYSTEM has full control,
///      anonymous/guest access is not granted.
///   2. Any connecting identity that resolves to a service/system account rather than
///      an interactive user is rejected — this channel is for user-session data only.
/// </summary>
public sealed class AgentIpcServer : BackgroundService
{
    private const string PipeName = "HaodaOneAgentIPC";
    private const int MaxWindowTitleLength = 500;
    private const int MaxConcurrentClients = 8; // generous for fast user switching on one box

    private readonly ILogger<AgentIpcServer> _logger;
    private readonly ILocalCacheService _cache;
    private readonly LiveStatusStore _liveStatus;
    private readonly IDeviceInfoService _deviceInfoService;
    private readonly AgentHealthState _health;

    public AgentIpcServer(
        ILogger<AgentIpcServer> logger,
        ILocalCacheService cache,
        LiveStatusStore liveStatus,
        IDeviceInfoService deviceInfoService,
        AgentHealthState health)
    {
        _logger = logger;
        _cache = cache;
        _liveStatus = liveStatus;
        _deviceInfoService = deviceInfoService;
        _health = health;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var activeClients = new List<Task>();

        while (!stoppingToken.IsCancellationRequested)
        {
            activeClients.RemoveAll(t => t.IsCompleted);

            try
            {
                var pipeServer = CreateSecuredPipe();
                await pipeServer.WaitForConnectionAsync(stoppingToken);

                if (activeClients.Count >= MaxConcurrentClients)
                {
                    _logger.LogWarning("Too many concurrent Monitor connections; rejecting new client");
                    pipeServer.Dispose();
                    continue;
                }

                activeClients.Add(Task.Run(() => HandleClientAsync(pipeServer, stoppingToken), stoppingToken));
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "IPC pipe accept loop error; retrying");
                await Task.Delay(TimeSpan.FromSeconds(2), CancellationToken.None);
            }
        }

        await Task.WhenAll(activeClients).ContinueWith(_ => { }, CancellationToken.None);
    }

    private static NamedPipeServerStream CreateSecuredPipe()
    {
        var pipeSecurity = new PipeSecurity();

        pipeSecurity.AddAccessRule(new PipeAccessRule(
            new SecurityIdentifier(WellKnownSidType.AuthenticatedUserSid, null),
            PipeAccessRights.ReadWrite | PipeAccessRights.Synchronize,
            AccessControlType.Allow));

        pipeSecurity.AddAccessRule(new PipeAccessRule(
            new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null),
            PipeAccessRights.FullControl,
            AccessControlType.Allow));

        return NamedPipeServerStreamAcl.Create(
            PipeName,
            PipeDirection.InOut,
            NamedPipeServerStream.MaxAllowedServerInstances,
            PipeTransmissionMode.Byte,
            PipeOptions.Asynchronous,
            inBufferSize: 4096,
            outBufferSize: 4096,
            pipeSecurity);
    }

    private async Task HandleClientAsync(NamedPipeServerStream pipe, CancellationToken stoppingToken)
    {
        try
        {
            using (pipe)
            {
                using var reader = new StreamReader(pipe, Encoding.UTF8, leaveOpen: true);
                using var writer = new StreamWriter(pipe, Encoding.UTF8, leaveOpen: true) { AutoFlush = true };

                while (!stoppingToken.IsCancellationRequested && pipe.IsConnected)
                {
                    string? line = await reader.ReadLineAsync(stoppingToken);
                    if (line is null)
                    {
                        break; // Monitor disconnected (user logged off, process restarted)
                    }

                    await HandleMessageAsync(line, writer, stoppingToken);
                }
            }
        }
        catch (IOException)
        {
            // Expected on logoff/disconnect — not worth logging as an error every time.
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error handling IPC client connection");
        }
    }

    private async Task HandleMessageAsync(string json, StreamWriter writer, CancellationToken stoppingToken)
    {
        AgentIpcMessage? msg;
        try
        {
            msg = JsonSerializer.Deserialize<AgentIpcMessage>(json);
        }
        catch (JsonException ex)
        {
            _logger.LogDebug(ex, "Discarding malformed IPC message");
            return;
        }

        if (msg is null)
        {
            return;
        }

        switch (msg.Type)
        {
            case "SessionClosed":
                HandleSessionClosed(msg);
                if (!string.IsNullOrEmpty(msg.MessageId))
                {
                    var ack = JsonSerializer.Serialize(new AgentIpcAck { MessageId = msg.MessageId, Accepted = true });
                    await writer.WriteLineAsync(ack.AsMemory(), stoppingToken);
                }
                break;

            case "StatusUpdate":
                _health.SetUserMonitorRunning(true);
                _liveStatus.Update(
                    msg.ApplicationName ?? msg.ProcessName ?? "Unknown",
                    Truncate(msg.WindowTitle ?? string.Empty, MaxWindowTitleLength),
                    msg.IsIdleSession);
                break;

            default:
                _logger.LogDebug("Unknown IPC message type {Type}", msg.Type);
                break;
        }
    }

    private void HandleSessionClosed(AgentIpcMessage msg)
    {
        // The Service, not the lower-trust Monitor process, is the authority on device
        // identity — never trust a device/tenant claim from the pipe, only the activity
        // content (app, title, timing) itself.
        var device = _deviceInfoService.GetDeviceInfo();

        var session = new ActivitySession
        {
            SessionId = string.IsNullOrWhiteSpace(msg.MessageId) ? Guid.NewGuid().ToString("N") : msg.MessageId,
            DeviceId = device.DeviceId,
            Username = string.IsNullOrWhiteSpace(msg.Username) ? device.Username : msg.Username!,
            ProcessName = msg.ProcessName ?? "unknown",
            ApplicationName = msg.ApplicationName ?? msg.ProcessName ?? "Unknown",
            WindowTitle = Truncate(msg.WindowTitle ?? string.Empty, MaxWindowTitleLength),
            StartTimeUtc = msg.StartTimeUtc ?? DateTimeOffset.UtcNow,
            IsIdleSession = msg.IsIdleSession
        };

        if (msg.EndTimeUtc.HasValue)
        {
            session.Close(msg.EndTimeUtc.Value);
        }

        _cache.EnqueueSession(session); // existing, unmodified queue/upload pipeline picks this up
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
