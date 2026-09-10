namespace HaodaOne.Agent.Services;

public interface ITokenProtectionService
{
    /// <summary>Encrypts a plaintext token for storage in appsettings (machine-scoped DPAPI).</summary>
    string Protect(string plaintextToken);

    /// <summary>Decrypts a token previously produced by Protect(). Returns "" if unset/invalid.</summary>
    string Unprotect(string encryptedToken);
}
