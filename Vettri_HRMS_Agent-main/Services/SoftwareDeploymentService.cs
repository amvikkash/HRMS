using System.Diagnostics;
using System.Net.Http;
using System.Security.Cryptography;
using HaodaOne.Agent.Models;
using Microsoft.Extensions.Logging;

namespace HaodaOne.Agent.Services;

public sealed class SoftwareDeploymentService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IApiClientService _apiClient;
    private readonly SoftwareDetectionService _detectionService;
    private readonly ILogger<SoftwareDeploymentService> _logger;

    public SoftwareDeploymentService(
        IHttpClientFactory httpClientFactory,
        IApiClientService apiClient,
        SoftwareDetectionService detectionService,
        ILogger<SoftwareDeploymentService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _apiClient = apiClient;
        _detectionService = detectionService;
        _logger = logger;
    }

    public async Task ExecuteAsync(SoftwareDeploymentJob job, CancellationToken cancellationToken)
    {
        string localInstallerFileName = BuildLocalInstallerFileName(job.InstallerUrl, job.TargetId);
        string installerPath = Path.Combine(Path.GetTempPath(), "HaodaOne", "Software", localInstallerFileName);
        Directory.CreateDirectory(Path.GetDirectoryName(installerPath)!);

        _logger.LogInformation(
            "Software deployment lifecycle started: machine={MachineName}; targetId={TargetId}; deploymentId={DeploymentId}; package={PackageName}; version={Version}; installerHostPath={InstallerHostPath}; extractedFile={LocalInstallerFileName}; localPath={InstallerPath}",
            Environment.MachineName,
            job.TargetId,
            job.DeploymentId,
            job.PackageName,
            job.Version,
            SafeUrlHostPath(job.InstallerUrl),
            localInstallerFileName,
            installerPath);

        try
        {
            await UpdateStatusOrThrowAsync(job, "DEVICE_REACHED", null, null, null, cancellationToken);
            await UpdateStatusOrThrowAsync(job, "JOB_RECEIVED", null, null, null, cancellationToken);
            if (_detectionService.IsInstalled(job.DetectionRule, job.Version))
            {
                await UpdateStatusOrThrowAsync(job, "COMPLETED", null, null, job.Version, cancellationToken);
                _logger.LogInformation("Software deployment target {TargetId} already has {Package} {Version}", job.TargetId, job.PackageName, job.Version);
                return;
            }

            _logger.LogInformation(
                "Software deployment accepted by this machine: machine={MachineName}; targetId={TargetId}; deploymentId={DeploymentId}; package={PackageName}; version={Version}",
                Environment.MachineName,
                job.TargetId,
                job.DeploymentId,
                job.PackageName,
                job.Version);

            await UpdateStatusOrThrowAsync(job, "DOWNLOADING", null, null, null, cancellationToken);
            _logger.LogWarning("Software deployment download start: machine={MachineName}; deploymentId={DeploymentId}; targetId={TargetId}; localFile={LocalInstallerFileName}; installerHostPath={InstallerHostPath}", Environment.MachineName, job.DeploymentId, job.TargetId, localInstallerFileName, SafeUrlHostPath(job.InstallerUrl));
            await DownloadAsync(job.InstallerUrl, installerPath, cancellationToken);
            VerifyChecksum(installerPath, job.ChecksumSha256);
            await UpdateStatusOrThrowAsync(job, "DOWNLOAD_VERIFIED", null, null, null, cancellationToken);

            await UpdateStatusOrThrowAsync(job, "INSTALLING", null, null, null, cancellationToken);
            _logger.LogWarning("Software deployment execution start: machine={MachineName}; deploymentId={DeploymentId}; targetId={TargetId}; localFile={LocalInstallerFileName}", Environment.MachineName, job.DeploymentId, job.TargetId, localInstallerFileName);
            await InstallAsync(job, installerPath, cancellationToken);
            await UpdateStatusOrThrowAsync(job, "INSTALLATION_COMPLETED", null, null, null, cancellationToken);
            await UpdateStatusOrThrowAsync(job, "VERIFYING", null, null, null, cancellationToken);
            bool installed = false;
            for (var attempt = 0; attempt < 5 && !installed; attempt++)
            {
                installed = _detectionService.IsInstalled(job.DetectionRule, job.Version);
                if (!installed && attempt < 4)
                    await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
            }
            if (!installed)
                throw new InvalidOperationException("Installer completed but the configured detection rule did not find the requested application version");
            await UpdateStatusOrThrowAsync(job, "COMPLETED", null, null, job.Version, cancellationToken);
            _logger.LogInformation("Software deployment target {TargetId} installed {Package} {Version}; statusUpdate=INSTALLED", job.TargetId, job.PackageName, job.Version);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Software deployment target {TargetId} failed", job.TargetId);
            string? errorCode = ex is System.ComponentModel.Win32Exception win32 ? $"WIN32_{win32.NativeErrorCode}" : ex is TimeoutException ? "INSTALLER_TIMEOUT" : null;
            bool failureReported = await _apiClient.UpdateSoftwareDeploymentStatusAsync(job.TargetId, "FAILED", errorCode, ex.Message, null, cancellationToken);
            _logger.LogWarning("Software deployment failure status update: deploymentId={DeploymentId}; targetId={TargetId}; acknowledged={Acknowledged}", job.DeploymentId, job.TargetId, failureReported);
        }
        finally
        {
            try { if (File.Exists(installerPath)) File.Delete(installerPath); }
            catch (Exception ex) { _logger.LogWarning(ex, "Could not remove installer for deployment target {TargetId}", job.TargetId); }
        }
    }

    private static string BuildLocalInstallerFileName(string installerUrl, long targetId)
    {
        if (string.IsNullOrWhiteSpace(installerUrl))
            throw new InvalidOperationException("Installer URL is empty");

        if (!Uri.TryCreate(installerUrl, UriKind.Absolute, out var uri) || uri.Scheme is not ("https" or "http"))
            throw new InvalidOperationException("Installer URL must be an absolute HTTP(S) URL");

        string fileName = Path.GetFileName(Uri.UnescapeDataString(uri.AbsolutePath));
        if (string.IsNullOrWhiteSpace(fileName))
            throw new InvalidOperationException("Installer URL does not contain a valid filename in its path");

        string cleanFileName = RemoveInvalidWindowsPathCharacters(fileName);
        if (string.IsNullOrWhiteSpace(cleanFileName) || !cleanFileName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Installer URL must resolve to a valid .exe filename for local execution");

        if (cleanFileName.StartsWith($"{targetId}-", StringComparison.OrdinalIgnoreCase))
            return cleanFileName;

        return $"{targetId}-{cleanFileName}";
    }

    private static string RemoveInvalidWindowsPathCharacters(string fileName)
    {
        string invalidChars = new string(Path.GetInvalidFileNameChars());
        foreach (char invalidChar in invalidChars)
        {
            fileName = fileName.Replace(invalidChar, '_');
        }

        fileName = fileName.Trim();
        fileName = fileName.TrimEnd('.');
        fileName = fileName.Replace(" ", "_");
        if (string.IsNullOrWhiteSpace(fileName))
            throw new InvalidOperationException("Installer filename was empty after sanitization");

        return fileName;
    }

    private async Task DownloadAsync(string url, string destination, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme is not ("https" or "http"))
            throw new InvalidOperationException("Installer URL must be an absolute HTTP(S) URL");

        _logger.LogInformation("Downloading installer from URL host/path {InstallerHostPath} to local path {Destination}", SafeUrlHostPath(url), destination);

        using var response = await _httpClientFactory.CreateClient().GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();
        await using var source = await response.Content.ReadAsStreamAsync(cancellationToken);
        await using var target = File.Create(destination);
        await source.CopyToAsync(target, cancellationToken);

        _logger.LogWarning("Installer download complete: localFile={LocalInstallerFileName}; exists={Exists}; hostPath={InstallerHostPath}", Path.GetFileName(destination), File.Exists(destination), SafeUrlHostPath(url));
    }

    private async Task UpdateStatusOrThrowAsync(SoftwareDeploymentJob job, string status, string? errorCode, string? errorMessage, string? installedVersion, CancellationToken cancellationToken)
    {
        bool acknowledged = await _apiClient.UpdateSoftwareDeploymentStatusAsync(job.TargetId, status, errorCode, errorMessage, installedVersion, cancellationToken);
        _logger.LogWarning("Software deployment status update: deploymentId={DeploymentId}; targetId={TargetId}; status={Status}; acknowledged={Acknowledged}", job.DeploymentId, job.TargetId, status, acknowledged);
        if (!acknowledged)
            throw new InvalidOperationException($"Backend did not acknowledge deployment status '{status}' for target {job.TargetId}");
    }

    private static void VerifyChecksum(string path, string expectedChecksum)
    {
        if (string.IsNullOrWhiteSpace(expectedChecksum)) return;
        using var stream = File.OpenRead(path);
        string actual = Convert.ToHexString(SHA256.HashData(stream));
        if (!actual.Equals(expectedChecksum.Trim(), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Installer SHA-256 checksum did not match the package metadata");
    }

    private static string SafeUrlHostPath(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "<empty>";
        try
        {
            var uri = new Uri(value);
            return $"{uri.Host}{uri.AbsolutePath}";
        }
        catch
        {
            return "<invalid-url>";
        }
    }

    private async Task InstallAsync(SoftwareDeploymentJob job, string installerPath, CancellationToken cancellationToken)
    {
        string installerType = job.InstallerType.Trim().ToUpperInvariant();
        string fileName;
        string arguments;

        switch (installerType)
        {
            case "INNO_SETUP":
                fileName = installerPath;
                arguments = string.IsNullOrWhiteSpace(job.SilentInstallArguments)
                    ? "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-"
                    : job.SilentInstallArguments;
                break;
            default:
                throw new InvalidOperationException($"Installer type '{job.InstallerType}' is not supported by this Windows agent");
        }

        _logger.LogInformation("Starting installer with clean local path {InstallerPath} and arguments {Arguments}", installerPath, arguments);

        using var process = Process.Start(new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            UseShellExecute = false,
            CreateNoWindow = true,
            WorkingDirectory = Path.GetDirectoryName(installerPath)!
        }) ?? throw new InvalidOperationException("Could not start installer process");

        using var installerTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        installerTimeout.CancelAfter(TimeSpan.FromMinutes(10));
        try
        {
            await process.WaitForExitAsync(installerTimeout.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                if (!process.HasExited)
                    process.Kill(entireProcessTree: true);
            }
            catch (Exception killException)
            {
                _logger.LogWarning(killException, "Could not terminate timed-out installer for deployment target {TargetId}", job.TargetId);
            }

            throw new TimeoutException("Installer did not exit within 10 minutes");
        }
        if (process.ExitCode != 0)
            throw new InvalidOperationException($"Installer exited with code {process.ExitCode}");
    }
}
