using HaodaOne.Agent.Models;

namespace HaodaOne.Agent.Services;

public interface IActivityTrackerService
{
    /// <summary>
    /// Feed the latest active-window snapshot into the tracker. If it represents a switch
    /// away from the current app, the previous session is closed (End/Duration set) and
    /// enqueued for upload; a new open session is started for the new app.
    /// </summary>
    void ObserveActiveWindow(ActiveWindowInfo current, DeviceInfo device);

    /// <summary>The session currently in progress (still open, no EndTime yet), if any.</summary>
    ActivitySession? CurrentSession { get; }

    /// <summary>Forces the current open session closed, e.g. on service shutdown.</summary>
    void CloseCurrentSession();
}
