using System.Text.Json;
using HaodaOne.Agent.Configuration;
using HaodaOne.Agent.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HaodaOne.Agent.Services;

/// <summary>
/// Persists each pending activity session as its own small JSON file under
/// %ProgramData%\HaodaOne\Agent\Cache\pending\{sessionId}.json.
///
/// Disk is the source of truth here — deliberately NOT mirrored into an in-memory
/// dictionary of every pending session. An earlier version kept a ConcurrentDictionary
/// of every queued ActivitySession in memory; during a multi-day API outage on an
/// offline laptop that grows without bound (a real memory-leak vector), and it was
/// redundant with data already durable on disk. PeekPending now reads a bounded page
/// directly from disk each time it's called, so memory use stays flat regardless of
/// how long the backlog has been accumulating.
///
/// Corrupted or partially-written files are quarantined rather than retried forever,
/// so a single bad file can't spam the log on every flush cycle indefinitely.
/// </summary>
public sealed class LocalCacheService : ILocalCacheService
{
    private readonly ILogger<LocalCacheService> _logger;
    private readonly AgentSettings _settings;
    private readonly string _pendingDir;
    private readonly string _quarantineDir;

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = false };

    public LocalCacheService(ILogger<LocalCacheService> logger, IOptions<AgentSettings> settings)
    {
        _logger = logger;
        _settings = settings.Value;
        _pendingDir = Path.Combine(_settings.LocalCacheFolder, "pending");
        _quarantineDir = Path.Combine(_settings.LocalCacheFolder, "quarantine");
        Directory.CreateDirectory(_pendingDir);
        Directory.CreateDirectory(_quarantineDir);
    }

    public int PendingCount
    {
        get
        {
            try
            {
                return Directory.EnumerateFiles(_pendingDir, "*.json").Count();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to count pending cache files");
                return 0;
            }
        }
    }

    public void EnqueueSession(ActivitySession session)
    {
        try
        {
            string path = Path.Combine(_pendingDir, session.SessionId + ".json");
            string tmpPath = path + ".tmp";
            File.WriteAllText(tmpPath, JsonSerializer.Serialize(session, JsonOptions));
            // Rename-after-write means a mid-write crash only ever leaves an orphaned
            // .tmp file (cleaned up by LoadFromDisk/PurgeStaleFiles), never a corrupt
            // .json that a later read could half-parse.
            File.Move(tmpPath, path, overwrite: true);
            LogCapacityWarningIfNeeded();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist session {SessionId} to disk cache", session.SessionId);
        }
    }

    public IReadOnlyList<ActivitySession> PeekPending(int maxCount)
    {
        if (!Directory.Exists(_pendingDir))
        {
            return Array.Empty<ActivitySession>();
        }

        // Order by file write time as a cheap proxy for session start order — avoids
        // deserializing the entire backlog just to sort it. Only the requested page
        // is actually parsed into memory.
        var candidateFiles = Directory.EnumerateFiles(_pendingDir, "*.json")
            .Select(f => new FileInfo(f))
            .OrderBy(f => f.LastWriteTimeUtc)
            .Take(maxCount)
            .ToList();

        var result = new List<ActivitySession>(candidateFiles.Count);
        foreach (var file in candidateFiles)
        {
            var session = TryReadSession(file.FullName);
            if (session is not null)
            {
                result.Add(session);
            }
        }

        return result;
    }

    public void Acknowledge(IEnumerable<string> sessionIds)
    {
        foreach (var id in sessionIds)
        {
            try
            {
                string path = Path.Combine(_pendingDir, id + ".json");
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete acknowledged cache file for session {SessionId}", id);
            }
        }
    }

    public void LoadFromDisk()
    {
        if (!Directory.Exists(_pendingDir))
        {
            return;
        }

        // Clean up .tmp leftovers from a write that was interrupted by a crash/power
        // loss before the rename completed — these are never valid and would otherwise
        // accumulate forever.
        int orphanedTmp = 0;
        foreach (var tmpFile in Directory.EnumerateFiles(_pendingDir, "*.tmp"))
        {
            try
            {
                File.Delete(tmpFile);
                orphanedTmp++;
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Could not remove orphaned tmp file {File}", tmpFile);
            }
        }

        if (orphanedTmp > 0)
        {
            _logger.LogWarning("Removed {Count} orphaned .tmp file(s) from a previous interrupted write", orphanedTmp);
        }

        int pendingCount = PendingCount;
        if (pendingCount > 0)
        {
            _logger.LogInformation("{Count} pending session(s) found in local cache after restart", pendingCount);
        }
    }

    public void PurgeStaleFiles()
    {
        if (!Directory.Exists(_pendingDir))
        {
            return;
        }

        var cutoff = DateTime.UtcNow.AddDays(-_settings.MaxCacheFileAgeDays);
        long totalBytes = 0;
        var files = Directory.EnumerateFiles(_pendingDir, "*.json")
            .Select(f => new FileInfo(f))
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .ToList();

        foreach (var file in files)
        {
            totalBytes += file.Length;
            bool tooOld = file.LastWriteTimeUtc < cutoff;
            bool overBudget = totalBytes > _settings.MaxCacheSizeMb * 1024L * 1024L;

            if (tooOld || overBudget)
            {
                try
                {
                    file.Delete();
                    _logger.LogWarning(
                        "Purged queued activity file {File} under the documented {RetentionDays}-day/" +
                        "{MaxSizeMb} MB retention policy; this activity was not uploaded",
                        file.Name, _settings.MaxCacheFileAgeDays, _settings.MaxCacheSizeMb);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to purge cache file {File}", file.Name);
                }
            }
        }
    }

    private void LogCapacityWarningIfNeeded()
    {
        try
        {
            long bytes = Directory.EnumerateFiles(_pendingDir, "*.json").Sum(file => new FileInfo(file).Length);
            long limit = _settings.MaxCacheSizeMb * 1024L * 1024L;
            if (limit > 0 && bytes >= limit * _settings.QueueWarningPercent / 100L)
                _logger.LogWarning("Local activity queue is {Percent}% full ({Bytes} of {Limit} bytes); " +
                    "new activity remains queued but retention may purge oldest files",
                    bytes * 100 / limit, bytes, limit);
        }
        catch (Exception ex) { _logger.LogDebug(ex, "Could not calculate local activity queue size"); }
    }

    /// <summary>
    /// Reads and deserializes one cache file. A file that fails to parse (partial write
    /// that slipped past the tmp-rename guard, disk corruption, a future incompatible
    /// schema change) is moved to the quarantine folder instead of being deleted outright
    /// (preserves the data for manual inspection) or left in place (which would otherwise
    /// cause the same parse failure — and the same log warning — on every single flush
    /// cycle forever).
    /// </summary>
    private ActivitySession? TryReadSession(string path)
    {
        try
        {
            var json = File.ReadAllText(path);
            var session = JsonSerializer.Deserialize<ActivitySession>(json, JsonOptions);
            if (session is not null)
            {
                return session;
            }

            QuarantineFile(path, "deserialized to null");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Quarantining unreadable cache file {File}", path);
            QuarantineFile(path, ex.Message);
            return null;
        }
    }

    private void QuarantineFile(string path, string reason)
    {
        try
        {
            string fileName = Path.GetFileName(path);
            string dest = Path.Combine(_quarantineDir, $"{DateTime.UtcNow:yyyyMMddHHmmss}_{fileName}");
            File.Move(path, dest, overwrite: true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to quarantine bad cache file {Path} (reason: {Reason})", path, reason);
        }
    }
}
