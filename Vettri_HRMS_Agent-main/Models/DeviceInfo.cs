namespace HaodaOne.Agent.Models;

/// <summary>
/// Identifies the physical device/user pair the agent is running as.
/// Sent as part of every heartbeat and activity batch so the backend
/// can upsert the device record without a separate registration call.
/// </summary>
public sealed class DeviceInfo
{
    /// <summary>Stable hardware-derived identifier (see DeviceInfoService.GetOrCreateDeviceId).</summary>
    public string DeviceId { get; set; } = string.Empty;

    public string DeviceName { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string DomainName { get; set; } = string.Empty;

    public string IpAddress { get; set; } = string.Empty;

    public string OperatingSystem { get; set; } = string.Empty;

    public string OsVersion { get; set; } = string.Empty;

    public string AgentVersion { get; set; } = string.Empty;

    public string MacAddress { get; set; } = string.Empty;
}
