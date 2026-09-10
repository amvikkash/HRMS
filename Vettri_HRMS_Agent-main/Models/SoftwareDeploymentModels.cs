namespace HaodaOne.Agent.Models;

public sealed class SoftwareDeploymentJob
{
    public long TargetId { get; set; }
    public long DeploymentId { get; set; }
    public string PackageName { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string InstallerType { get; set; } = string.Empty;
    public string InstallerUrl { get; set; } = string.Empty;
    public string ChecksumSha256 { get; set; } = string.Empty;
    public string SilentInstallArguments { get; set; } = string.Empty;
    public string DetectionRule { get; set; } = string.Empty;
}

public sealed class SoftwareDeploymentStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public string? InstalledVersion { get; set; }
}

public sealed class AgentAck
{
    public bool Success { get; set; }
    public string? Message { get; set; }
}
