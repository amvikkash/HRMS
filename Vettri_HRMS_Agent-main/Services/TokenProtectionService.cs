using System.Runtime.Versioning;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;

namespace HaodaOne.Agent.Services;

/// <summary>
/// Wraps Windows Data Protection API (DPAPI) with LocalMachine scope, so the agent
/// authentication token stored in appsettings.json is encrypted at rest and is only
/// decryptable on the specific machine it was encrypted on — copying appsettings.json
/// to another laptop yields garbage, not a working token.
///
/// LocalMachine scope (rather than CurrentUser) is required because the Windows Service
/// runs as LocalSystem/NetworkService and must decrypt without any interactive user logged in.
/// </summary>
[SupportedOSPlatform("windows")]
public sealed class TokenProtectionService : ITokenProtectionService
{
    private readonly ILogger<TokenProtectionService> _logger;

    // Additional entropy binds the ciphertext to this application specifically, so another
    // process running as LocalSystem on the same box can't casually decrypt our token.
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("HaodaOne.Agent.v1");

    public TokenProtectionService(ILogger<TokenProtectionService> logger)
    {
        _logger = logger;
    }

    public string Protect(string plaintextToken)
    {
        if (string.IsNullOrWhiteSpace(plaintextToken))
        {
            return string.Empty;
        }

        byte[] plainBytes = Encoding.UTF8.GetBytes(plaintextToken);
        try
        {
            byte[] cipherBytes = ProtectedData.Protect(plainBytes, Entropy, DataProtectionScope.LocalMachine);
            return Convert.ToBase64String(cipherBytes);
        }
        finally
        {
            // Best-effort: .NET strings are immutable so the original `plaintextToken`
            // argument can't be scrubbed, but the byte[] copy we made can be, shrinking
            // the window the secret sits in memory before GC would otherwise collect it.
            CryptographicOperations.ZeroMemory(plainBytes);
        }
    }

    public string Unprotect(string encryptedToken)
    {
        if (string.IsNullOrWhiteSpace(encryptedToken))
        {
            return string.Empty;
        }

        byte[]? plainBytes = null;
        try
        {
            byte[] cipherBytes = Convert.FromBase64String(encryptedToken);
            plainBytes = ProtectedData.Unprotect(cipherBytes, Entropy, DataProtectionScope.LocalMachine);
            return Encoding.UTF8.GetString(plainBytes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to decrypt agent token. Re-run install-service.ps1 -AgentToken <token> to re-provision it.");
            return string.Empty;
        }
        finally
        {
            if (plainBytes is not null)
            {
                CryptographicOperations.ZeroMemory(plainBytes);
            }
        }
    }
}
