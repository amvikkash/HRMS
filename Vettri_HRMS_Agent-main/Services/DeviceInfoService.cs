using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Reflection;
using Microsoft.Extensions.Logging;
using HaodaOne.Agent.Models;
using HaodaOne.Agent.Native;

namespace HaodaOne.Agent.Services;

/// <summary>
/// Collects device identity fields. Running as LocalSystem, so this sees the machine's
/// state, not necessarily the interactively logged-on user for username/domain — we
/// resolve the interactive user separately via WTS session enumeration when available,
/// falling back to the service's own identity otherwise.
/// </summary>
public sealed class DeviceInfoService : IDeviceInfoService
{
    private readonly ILogger<DeviceInfoService> _logger;
    private string? _cachedDeviceId;

    public DeviceInfoService(ILogger<DeviceInfoService> logger)
    {
        _logger = logger;
    }

    public DeviceInfo GetDeviceInfo()
    {
        return new DeviceInfo
        {
            DeviceId = GetOrCreateDeviceId(),
            DeviceName = Environment.MachineName,
            Username = GetInteractiveUsername(),
            DomainName = GetDomainName(),
            IpAddress = GetPrimaryIpAddress(),
            OperatingSystem = "Windows",
            OsVersion = Environment.OSVersion.VersionString,
            AgentVersion = GetAgentVersion(),
            MacAddress = GetPrimaryMacAddress()
        };
    }

    /// <summary>
    /// Stable identifier for this device across reinstalls/reboots, derived from the
    /// Windows MachineGuid (persists for the life of the OS install) rather than
    /// MachineName alone, since hostnames can be renamed.
    /// </summary>
    private string GetOrCreateDeviceId()
    {
        if (_cachedDeviceId is not null)
        {
            return _cachedDeviceId;
        }

        try
        {
            using var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(
                @"SOFTWARE\Microsoft\Cryptography");
            var guid = key?.GetValue("MachineGuid") as string;
            _cachedDeviceId = !string.IsNullOrWhiteSpace(guid)
                ? guid
                : Environment.MachineName;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not read MachineGuid, falling back to machine name as device id");
            _cachedDeviceId = Environment.MachineName;
        }

        return _cachedDeviceId;
    }

    private string GetInteractiveUsername()
    {
        // The service itself runs as LocalSystem/NetworkService, so Environment.UserName
        // would report the service account, not the logged-in employee. WTS session
        // enumeration (via query.exe fallback) gives us the actual interactive user.
        try
        {
            string? sessionUser = WtsInteropHelper.GetActiveConsoleUsername();
            if (!string.IsNullOrWhiteSpace(sessionUser))
            {
                return sessionUser;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "WTS session lookup failed, falling back to Environment.UserName");
        }

        return Environment.UserName;
    }

    private string GetDomainName()
    {
        try
        {
            return Environment.UserDomainName;
        }
        catch
        {
            return "WORKGROUP";
        }
    }

    private static string GetPrimaryIpAddress()
    {
        try
        {
            foreach (var nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.OperationalStatus != OperationalStatus.Up ||
                    nic.NetworkInterfaceType == NetworkInterfaceType.Loopback)
                {
                    continue;
                }

                var ipProps = nic.GetIPProperties();
                var ipv4 = ipProps.UnicastAddresses
                    .FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork);

                if (ipv4 is not null)
                {
                    return ipv4.Address.ToString();
                }
            }
        }
        catch
        {
            // fall through
        }

        return "0.0.0.0";
    }

    private static string GetPrimaryMacAddress()
    {
        try
        {
            var nic = NetworkInterface.GetAllNetworkInterfaces()
                .FirstOrDefault(n => n.OperationalStatus == OperationalStatus.Up &&
                                      n.NetworkInterfaceType != NetworkInterfaceType.Loopback);

            return nic?.GetPhysicalAddress().ToString() ?? string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string GetAgentVersion()
    {
        return Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0.0";
    }
}
