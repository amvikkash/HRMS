using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net;
using System.Text.Json;
using HaodaOne.Agent.Configuration;
using HaodaOne.Agent.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HaodaOne.Agent.Services;

/// <summary>
/// Talks to the Haoda One Spring Boot API. Every call:
///   1. Attaches "Authorization: Bearer {token}" (token decrypted from DPAPI at call time,
///      never cached in plaintext longer than the single request).
///   2. Runs through RetryHelper for transient failures.
///   3. Returns (false, null) rather than throwing on final failure, so callers can fall
///      back to the local cache instead of crashing the worker loop.
/// </summary>
public sealed class ApiClientService : IApiClientService
{
    /// <summary>
    /// FIX - see incident writeup below. JsonContent.Create(body) and
    /// ReadFromJsonAsync&lt;T&gt;() were previously called with NO options,
    /// which means System.Text.Json's real default (JsonSerializerOptions.Default):
    /// PropertyNamingPolicy = null (keeps C# PascalCase as-is) and
    /// PropertyNameCaseInsensitive = false. Two independent, symmetric bugs
    /// came from that:
    ///
    ///   1. OUTGOING (request body): ActivityBatchRequest/DeviceInfo/ActivitySession
    ///      serialized as PascalCase ("Sessions", "SessionId", "Device", ...).
    ///      The Spring Boot backend's Jackson binding is case-sensitive and
    ///      expects camelCase, so "Sessions" never matched the DTO's "sessions"
    ///      field and silently bound to an empty list - no exception anywhere,
    ///      the controller returned 200, and activity_session never got new
    ///      rows despite the API call "succeeding".
    ///
    ///   2. INCOMING (response body): the backend's AgentEnvelope&lt;T&gt; serializes
    ///      as camelCase ("success", "data", "acceptedSessionIds" - Jackson's
    ///      default), but ApiEnvelope&lt;T&gt;/ActivityBatchResponse here are
    ///      PascalCase. Case-sensitive deserialization meant envelope.Data
    ///      always came back null, which fell through to
    ///      SendActivityBatchAsync's "assume the whole batch succeeded" fallback -
    ///      so QueueFlushWorker logged "Flushed N/N session(s)" and pruned the
    ///      local cache regardless of what the server actually persisted. This
    ///      is why the agent's own logs looked completely healthy while the
    ///      database received nothing: the false-success fallback masked bug #1
    ///      from ever surfacing anywhere the ops team could see it.
    ///
    /// JsonSerializerDefaults.Web sets PropertyNameCaseInsensitive = true AND
    /// PropertyNamingPolicy = CamelCase, which fixes both directions at once
    /// and matches Jackson's own default convention, so the two sides no
    /// longer depend on casing correctness the other side never explicitly
    /// documented anywhere.
    /// </summary>
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly ILogger<ApiClientService> _logger;
    private readonly AgentSettings _settings;
    private readonly ITokenProtectionService _tokenProtection;
    private readonly AgentHealthState _health;

    public ApiClientService(
        HttpClient httpClient,
        ILogger<ApiClientService> logger,
        IOptions<AgentSettings> settings,
        ITokenProtectionService tokenProtection,
        AgentHealthState health)
    {
        _httpClient = httpClient;
        _logger = logger;
        _settings = settings.Value;
        _tokenProtection = tokenProtection;
        _health = health;

        _httpClient.BaseAddress = new Uri(EnsureTrailingSlash(NormalizeApiBaseUrl(_settings.ApiBaseUrl)));
        _httpClient.Timeout = TimeSpan.FromSeconds(_settings.HttpTimeoutSeconds);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<(bool Success, HeartbeatResponse? Response)> SendHeartbeatAsync(
        HeartbeatRequest request, CancellationToken cancellationToken)
    {
        var result = await RetryHelper.ExecuteWithRetryAsync(
            async () =>
            {
                using var message = BuildRequest(HttpMethod.Post, "api/agent/heartbeat", request);
                using var response = await _httpClient.SendAsync(message, cancellationToken);
                EnsureSuccessStatusCode(response, "heartbeat");
                var envelope = await response.Content.ReadFromJsonAsync<ApiEnvelope<HeartbeatResponse>>(
                    JsonOptions, cancellationToken);
                if (envelope?.Data is null) throw new InvalidOperationException("Heartbeat response had no data");
                if (!envelope.Success || !envelope.Data.Success) throw new RetryHelper.NonRetryableException(envelope.Message ?? "Heartbeat was rejected");
                return envelope.Data;
            },
            _settings.MaxRetryAttempts,
            _settings.RetryBaseDelaySeconds,
            _logger,
            "SendHeartbeat",
            cancellationToken);

        if (result is not null) _health.HeartbeatSucceeded();
        else if (_health.Snapshot().Connection is not AgentConnectionState.AuthenticationRequired and not AgentConnectionState.Disabled) _health.SetConnection(AgentConnectionState.Offline);
        return result is not null ? (true, result) : (false, null);
    }

    public async Task<(bool Success, ActivityBatchResponse? Response)> SendActivityBatchAsync(
        ActivityBatchRequest request, CancellationToken cancellationToken)
    {
        var result = await RetryHelper.ExecuteWithRetryAsync(
            async () =>
            {
                using var message = BuildRequest(HttpMethod.Post, "api/agent/activity/batch", request);
                using var response = await _httpClient.SendAsync(message, cancellationToken);
                EnsureSuccessStatusCode(response, "activity upload");
                var envelope = await response.Content.ReadFromJsonAsync<ApiEnvelope<ActivityBatchResponse>>(
                    JsonOptions, cancellationToken);

                if (envelope?.Data is null)
                {
                    // Previously this silently assumed full success (see JsonOptions
                    // doc comment, bug #2) - that fallback is exactly what hid bug #1
                    // from every log the ops team looked at. Now it's loud instead:
                    // treat a missing/unparseable Data payload as a hard failure so
                    // RetryHelper retries it and the session stays queued locally
                    // instead of being falsely acknowledged.
                    _logger.LogWarning(
                        "Activity batch response had no parseable Data payload (envelope.Success={Success}); " +
                        "treating batch as NOT accepted so it stays queued for retry",
                        envelope?.Success);
                    throw new InvalidOperationException(
                        "Activity batch response envelope had no Data payload");
                }

                if (!envelope.Success || !envelope.Data.Success)
                    throw new RetryHelper.NonRetryableException(envelope.Message ?? envelope.Data.Message ?? "Activity batch was rejected");

                return envelope.Data;
            },
            _settings.MaxRetryAttempts,
            _settings.RetryBaseDelaySeconds,
            _logger,
            "SendActivityBatch",
            cancellationToken);

        if (result is not null) _health.UploadSucceeded();
        else if (_health.Snapshot().Connection is not AgentConnectionState.AuthenticationRequired and not AgentConnectionState.Disabled) _health.SetConnection(AgentConnectionState.Offline);
        return result is not null ? (true, result) : (false, null);
    }

    public async Task<(bool Success, IReadOnlyList<SoftwareDeploymentJob> Jobs)> GetSoftwareDeploymentJobsAsync(
        CancellationToken cancellationToken)
    {
        var endpoint = "api/agent/software/jobs";
        _logger.LogInformation(
            "Polling software jobs: machine={MachineName}; endpoint={Endpoint}; apiBaseUrl={ApiBaseUrl}; tenantId={TenantId}",
            Environment.MachineName,
            endpoint,
            _httpClient.BaseAddress,
            _settings.TenantId);

        var result = await RetryHelper.ExecuteWithRetryAsync(
            async () =>
            {
                using var message = BuildRequest(HttpMethod.Get, endpoint);
                using var response = await _httpClient.SendAsync(message, cancellationToken);
                EnsureSuccessStatusCode(response, "software job polling");
                var envelope = await response.Content.ReadFromJsonAsync<ApiEnvelope<List<SoftwareDeploymentJob>>>(JsonOptions, cancellationToken);
                if (envelope?.Data is null || !envelope.Success)
                    throw new InvalidOperationException(envelope?.Message ?? "Software job response had no data");

                _logger.LogInformation(
                    "Software job poll response: machine={MachineName}; endpoint={Endpoint}; jobCount={JobCount}",
                    Environment.MachineName,
                    endpoint,
                    envelope.Data.Count);

                foreach (var job in envelope.Data)
                {
                    _logger.LogInformation(
                        "Pending software job: machine={MachineName}; deploymentId={DeploymentId}; targetId={TargetId}; package={PackageName}; version={Version}; installerHostPath={InstallerHostPath}",
                        Environment.MachineName,
                        job.DeploymentId,
                        job.TargetId,
                        job.PackageName,
                        job.Version,
                        SafeUrlHostPath(job.InstallerUrl));
                }

                return envelope.Data;
            }, _settings.MaxRetryAttempts, _settings.RetryBaseDelaySeconds, _logger, "GetSoftwareDeploymentJobs", cancellationToken);

        return result is null ? (false, Array.Empty<SoftwareDeploymentJob>()) : (true, result);
    }

    public async Task<bool> UpdateSoftwareDeploymentStatusAsync(
        long targetId, string status, string? errorCode, string? errorMessage, string? installedVersion,
        CancellationToken cancellationToken)
    {
        var result = await RetryHelper.ExecuteWithRetryAsync(
            async () =>
            {
                var body = new SoftwareDeploymentStatusRequest
                {
                    Status = status,
                    ErrorCode = errorCode,
                    ErrorMessage = errorMessage,
                    InstalledVersion = installedVersion
                };
                using var message = BuildRequest(HttpMethod.Post, $"api/agent/software/jobs/{targetId}/status", body);
                using var response = await _httpClient.SendAsync(message, cancellationToken);
                EnsureSuccessStatusCode(response, "software status update");
                var envelope = await response.Content.ReadFromJsonAsync<ApiEnvelope<AgentAck>>(JsonOptions, cancellationToken);
                if (envelope?.Data is null || !envelope.Success || !envelope.Data.Success)
                    throw new RetryHelper.NonRetryableException(envelope?.Message ?? "Software status update was rejected");
                return envelope.Data;
            }, _settings.MaxRetryAttempts, _settings.RetryBaseDelaySeconds, _logger, "UpdateSoftwareDeploymentStatus", cancellationToken);

        return result?.Success == true;
    }

    private void EnsureSuccessStatusCode(HttpResponseMessage response, string operation)
    {
        if (response.IsSuccessStatusCode) return;

        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            _health.SetConnection(AgentConnectionState.AuthenticationRequired);
            _logger.LogError("Authentication failed for {Operation}; agent requires re-authentication", operation);
            throw new RetryHelper.NonRetryableException("Agent authentication failed");
        }
        if (response.StatusCode == HttpStatusCode.Forbidden)
        {
            _health.SetConnection(AgentConnectionState.Disabled);
            _logger.LogError("Agent is forbidden from performing {Operation}; device may be disabled", operation);
            throw new RetryHelper.NonRetryableException("Agent is forbidden");
        }
        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            var retryAfter = response.Headers.RetryAfter?.Delta ?? TimeSpan.FromSeconds(_settings.RetryBaseDelaySeconds);
            throw new RetryHelper.RetryAfterException(TimeSpan.FromSeconds(Math.Clamp(retryAfter.TotalSeconds, 1, 900)), "Backend rate limited the agent");
        }
        if ((int)response.StatusCode >= 400 && (int)response.StatusCode < 500)
        {
            _logger.LogWarning("Backend rejected {Operation} with HTTP {Status}; it will not be retried", operation, (int)response.StatusCode);
            throw new RetryHelper.NonRetryableException($"Backend rejected operation with HTTP {(int)response.StatusCode}");
        }

        throw new HttpRequestException($"Backend returned HTTP {(int)response.StatusCode}");
    }

    private HttpRequestMessage BuildRequest<TBody>(HttpMethod method, string relativeUrl, TBody body)
    {
        var message = new HttpRequestMessage(method, relativeUrl)
        {
            Content = JsonContent.Create(body, options: JsonOptions)
        };

        string token = _tokenProtection.Unprotect(_settings.AgentTokenEncrypted);
        if (!string.IsNullOrWhiteSpace(token))
        {
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
        else
        {
            _logger.LogWarning("Agent token is not configured/decryptable; request will be sent unauthenticated");
        }

        message.Headers.Add("X-Agent-Version", System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString());
        message.Headers.Add("X-Tenant-Id", _settings.TenantId);

        return message;
    }

    private HttpRequestMessage BuildRequest(HttpMethod method, string relativeUrl)
    {
        var message = new HttpRequestMessage(method, relativeUrl);
        string token = _tokenProtection.Unprotect(_settings.AgentTokenEncrypted);
        if (!string.IsNullOrWhiteSpace(token))
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        message.Headers.Add("X-Agent-Version", System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString());
        message.Headers.Add("X-Tenant-Id", _settings.TenantId);
        return message;
    }

    private static string SafeUrlHostPath(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "<empty>";
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            ? $"{uri.Host}{uri.AbsolutePath}"
            : "<invalid-url>";
    }

    private static string EnsureTrailingSlash(string url) => url.EndsWith('/') ? url : url + "/";

    private static string NormalizeApiBaseUrl(string url)
    {
        var normalized = url.Trim().TrimEnd('/');

        if (normalized.EndsWith("/api/v1", StringComparison.OrdinalIgnoreCase))
        {
            normalized = normalized[..^7];
        }
        else if (normalized.EndsWith("/api", StringComparison.OrdinalIgnoreCase))
        {
            normalized = normalized[..^4];
        }

        return normalized;
    }
}
