using Microsoft.Win32;

namespace HaodaOne.Agent.Services;

public sealed class SoftwareDetectionService
{
    public bool IsInstalled(string detectionRule, string expectedVersion)
    {
        if (string.IsNullOrWhiteSpace(detectionRule)) return false;
        var separator = detectionRule.IndexOf('|');
        if (separator <= 0 || separator == detectionRule.Length - 1) return false;

        string type = detectionRule[..separator].Trim().ToUpperInvariant();
        string value = detectionRule[(separator + 1)..].Trim();
        return type switch
        {
            "FILE_EXISTS" => File.Exists(Environment.ExpandEnvironmentVariables(value)),
            "REGISTRY_UNINSTALL" => RegistryDisplayNameExists(value, expectedVersion),
            _ => false
        };
    }

    private static bool RegistryDisplayNameExists(string displayName, string expectedVersion)
    {
        foreach (RegistryView view in new[] { RegistryView.Registry64, RegistryView.Registry32 })
        {
            using var baseKey = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, view);
            using var uninstall = baseKey.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall");
            if (uninstall is null) continue;
            foreach (string subKeyName in uninstall.GetSubKeyNames())
            {
                using var app = uninstall.OpenSubKey(subKeyName);
                string? name = app?.GetValue("DisplayName") as string;
                if (name is null || !name.Equals(displayName, StringComparison.OrdinalIgnoreCase)) continue;
                if (string.IsNullOrWhiteSpace(expectedVersion)) return true;
                string? installedVersion = app?.GetValue("DisplayVersion") as string;
                if (string.Equals(installedVersion?.Trim(), expectedVersion.Trim(), StringComparison.OrdinalIgnoreCase))
                    return true;
            }
        }
        return false;
    }
}
