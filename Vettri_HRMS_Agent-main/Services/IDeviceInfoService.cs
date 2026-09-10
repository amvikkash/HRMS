using HaodaOne.Agent.Models;

namespace HaodaOne.Agent.Services;

public interface IDeviceInfoService
{
    /// <summary>Returns a fresh snapshot of device/user/network info. Cheap enough to call every heartbeat.</summary>
    DeviceInfo GetDeviceInfo();
}
