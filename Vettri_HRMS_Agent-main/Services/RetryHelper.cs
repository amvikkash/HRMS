using Microsoft.Extensions.Logging;

namespace HaodaOne.Agent.Services;

/// <summary>
/// Small, dependency-free exponential-backoff-with-jitter retry helper. The heavy lifting
/// (surviving being offline for hours/days) is handled by the local cache/queue, not by
/// retrying forever here — this just smooths over transient blips (Wi-Fi hiccup, API
/// restart, brief 5xx) without hammering the server.
/// </summary>
internal static class RetryHelper
{
    internal sealed class NonRetryableException(string message) : Exception(message);
    internal sealed class RetryAfterException(TimeSpan delay, string message) : Exception(message)
    {
        public TimeSpan Delay { get; } = delay;
    }

    public static async Task<T?> ExecuteWithRetryAsync<T>(
        Func<Task<T>> action,
        int maxAttempts,
        int baseDelaySeconds,
        ILogger logger,
        string operationName,
        CancellationToken cancellationToken)
        where T : class
    {
        var random = Random.Shared;

        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                return await action();
            }
            catch (Exception ex) when (attempt < maxAttempts && IsRetryable(ex, cancellationToken))
            {
                double jitterMs = random.Next(0, 500);
                var delay = ex is RetryAfterException retryAfter
                    ? retryAfter.Delay
                    : TimeSpan.FromSeconds(baseDelaySeconds * Math.Pow(2, attempt - 1)) + TimeSpan.FromMilliseconds(jitterMs);

                logger.LogWarning(
                    ex,
                    "{Operation} failed (attempt {Attempt}/{Max}); retrying in {Delay}s",
                    operationName, attempt, maxAttempts, Math.Round(delay.TotalSeconds, 1));

                await Task.Delay(delay, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(
                    ex, "{Operation} failed after {Max} attempts; leaving data queued locally",
                    operationName, maxAttempts);
                return null;
            }
        }

        return null;
    }

    private static bool IsRetryable(Exception exception, CancellationToken cancellationToken) => exception is RetryAfterException
        || exception is not NonRetryableException && (exception is not OperationCanceledException || !cancellationToken.IsCancellationRequested);
}
