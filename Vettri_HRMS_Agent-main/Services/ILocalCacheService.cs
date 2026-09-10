using HaodaOne.Agent.Models;

namespace HaodaOne.Agent.Services;

public interface ILocalCacheService
{
    /// <summary>Queues a completed session in memory + persists it to disk immediately.</summary>
    void EnqueueSession(ActivitySession session);

    /// <summary>Returns up to <paramref name="maxCount"/> pending sessions ready to be sent, oldest first.</summary>
    IReadOnlyList<ActivitySession> PeekPending(int maxCount);

    /// <summary>Removes sessions the server confirmed it accepted, both from memory and disk.</summary>
    void Acknowledge(IEnumerable<string> sessionIds);

    /// <summary>Loads any sessions persisted from a previous run (e.g. after a reboot or crash).</summary>
    void LoadFromDisk();

    /// <summary>Deletes cache files older than the configured retention window.</summary>
    void PurgeStaleFiles();

    int PendingCount { get; }
}
