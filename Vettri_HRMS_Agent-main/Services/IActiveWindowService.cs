using HaodaOne.Agent.Models;

namespace HaodaOne.Agent.Services;

public interface IActiveWindowService
{
    /// <summary>Captures the current foreground application, or ActiveWindowInfo.Empty ("idle") if none/idle.</summary>
    ActiveWindowInfo GetCurrentActiveWindow();
}
