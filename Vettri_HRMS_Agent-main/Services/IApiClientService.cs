using HaodaOne.Agent.Models;

namespace HaodaOne.Agent.Services;

public interface IApiClientService
{
    Task<(bool Success, HeartbeatResponse? Response)> SendHeartbeatAsync(
        HeartbeatRequest request, CancellationToken cancellationToken);

    Task<(bool Success, ActivityBatchResponse? Response)> SendActivityBatchAsync(
        ActivityBatchRequest request, CancellationToken cancellationToken);

    Task<(bool Success, IReadOnlyList<SoftwareDeploymentJob> Jobs)> GetSoftwareDeploymentJobsAsync(
        CancellationToken cancellationToken);

    Task<bool> UpdateSoftwareDeploymentStatusAsync(
        long targetId, string status, string? errorCode, string? errorMessage, string? installedVersion,
        CancellationToken cancellationToken);
}
