import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Monitor, Wifi, WifiOff, Activity, AppWindow, Clock, CircleDot } from 'lucide-react';
import {
  monitoringApi,
  isDeviceOnline,
  getSessionId,
  getSessionEmployeeName,
  getSessionApp,
  getSessionDeviceName,
  getSessionStart,
  getSessionDurationSeconds,
  aggregateSessionsByApp,
  getDeviceStatus,
  getDeviceCurrentApplication,
  getDeviceCurrentWindow,
  getDeviceEmployeeName,
  getDeviceLastSeen,
} from '../../api/endpoints/monitoring';
import { employeesApi } from '../../api/endpoints/employees';
import { todayRangeIST, timeAgoIST, formatDurationShort } from '../../utils/formatDateTime';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonCard, SkeletonText } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';

export default function MonitoringDashboard() {
  const { from, to } = useMemo(() => todayRangeIST(), []);

  const {
    data: devices,
    isLoading: devicesLoading,
    isError: devicesError,
    refetch: refetchDevices,
    dataUpdatedAt: devicesUpdatedAt,
  } = useQuery({ queryKey: ['monitoring-devices'], queryFn: monitoringApi.devices, refetchInterval: 20_000 });

  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: employeesApi.list });

  const {
    data: todaySessions,
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useQuery({ queryKey: ['monitoring-sessions-today', from, to], queryFn: () => monitoringApi.sessions(from, to) });

  const totalEmployees = employees?.length ?? 0;
  const onlineDevices = useMemo(() => (devices || []).filter(isDeviceOnline), [devices]);
  const onlineEmployeeIds = useMemo(() => new Set(onlineDevices.map((device) => device.employeeId).filter(Boolean)), [onlineDevices]);
  const activeEmployees = useMemo(() => onlineDevices.filter((device) => ['ONLINE', 'ACTIVE'].includes(getDeviceStatus(device))).length, [onlineDevices]);
  const idleEmployees = useMemo(() => onlineDevices.filter((device) => getDeviceStatus(device) === 'IDLE').length, [onlineDevices]);
  const offlineEmployees = Math.max(totalEmployees - onlineEmployeeIds.size, 0);

  const totalTrackedSeconds = useMemo(
    () => (todaySessions || []).reduce((sum, s) => sum + getSessionDurationSeconds(s), 0),
    [todaySessions]
  );
  const activeEmployeesToday = useMemo(() => {
    const names = new Set((todaySessions || []).map((s) => getSessionEmployeeName(s)));
    return names.size;
  }, [todaySessions]);

  const topApps = useMemo(() => aggregateSessionsByApp(todaySessions, 5), [todaySessions]);
  const maxAppSeconds = topApps[0]?.seconds || 1;

  const recentActivity = useMemo(
    () =>
      [...(todaySessions || [])]
        .sort((a, b) => new Date(getSessionStart(b)) - new Date(getSessionStart(a)))
        .slice(0, 8),
    [todaySessions]
  );

  const kpis = [
    { label: 'Employees', value: totalEmployees, icon: Monitor, accent: 'var(--hz-primary-600)' },
    { label: 'Active', value: activeEmployees, icon: Activity, accent: 'var(--hz-success-500)' },
    { label: 'Idle', value: idleEmployees, icon: CircleDot, accent: 'var(--hz-warning-500)' },
    { label: 'Offline', value: offlineEmployees, icon: WifiOff, accent: 'var(--hz-gray-500)' },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader eyebrow="Monitoring / Live" title="Workforce pulse" description="Current employee status from agent heartbeats and foreground activity" actions={<span className="text-secondary-hz" style={{ fontSize: 'var(--hz-text-sm)' }}>Updated {devicesUpdatedAt ? timeAgoIST(devicesUpdatedAt) : '—'}</span>} />

      {devicesError && <ErrorState description="Couldn't load monitoring devices." onRetry={refetchDevices} />}

      {!devicesError && (
        <div className="row g-3">
          {devicesLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div className="col-12 col-sm-6 col-xl-3" key={i}>
                <SkeletonCard />
              </div>
            ))}
          {!devicesLoading &&
            kpis.map((kpi) => (
              <div className="col-12 col-sm-6 col-xl-3" key={kpi.label}>
                <Card hoverable className="hz-stat">
                  <div className="d-flex align-items-start justify-content-between">
                    <div>
                      <p className="text-secondary-hz mb-1" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>
                        {kpi.label}
                      </p>
                      <p className="hz-stat__value" style={{ marginBottom: 0 }}>
                        {kpi.value}
                      </p>
                    </div>
                    <div className="hz-stat__icon" style={{ background: `${kpi.accent}1a`, color: kpi.accent }}>
                      <kpi.icon size={20} />
                    </div>
                  </div>
                </Card>
              </div>
            ))}
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <Card hoverable title="Today's Activity Summary" subtitle="Asia/Kolkata">
            {sessionsLoading && <SkeletonText lines={3} />}
            {sessionsError && <ErrorState description="Couldn't load today's activity." onRetry={refetchSessions} />}
            {!sessionsLoading && !sessionsError && (
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div className="hz-stat__icon" style={{ background: 'var(--hz-primary-50)', color: 'var(--hz-primary-600)' }}>
                    <Clock size={18} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 'var(--hz-text-lg)', marginBottom: 0 }}>
                      {formatDurationShort(totalTrackedSeconds)}
                    </p>
                    <p className="text-secondary-hz" style={{ fontSize: 12, marginBottom: 0 }}>
                      Total tracked time today
                    </p>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <div className="hz-stat__icon" style={{ background: 'var(--hz-success-50)', color: 'var(--hz-success-500)' }}>
                    <Activity size={18} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 'var(--hz-text-lg)', marginBottom: 0 }}>{activeEmployeesToday}</p>
                    <p className="text-secondary-hz" style={{ fontSize: 12, marginBottom: 0 }}>
                      Active employees today
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="col-12 col-xl-8">
          <Card hoverable title="Top Applications by Duration" subtitle="Today, all employees">
            {sessionsLoading && <SkeletonText lines={4} />}
            {sessionsError && <ErrorState description="Couldn't load application usage." onRetry={refetchSessions} />}
            {!sessionsLoading && !sessionsError && topApps.length === 0 && (
              <EmptyState icon={AppWindow} title="No application activity yet today" />
            )}
            {!sessionsLoading && !sessionsError && topApps.length > 0 && (
              <div className="d-flex flex-column gap-3">
                {topApps.map((app) => {
                  const pct = Math.round((app.seconds / maxAppSeconds) * 100);
                  return (
                    <div key={app.applicationName}>
                      <div className="d-flex justify-content-between mb-1">
                        <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>{app.applicationName}</span>
                        <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)', fontWeight: 600 }}>
                          {formatDurationShort(app.seconds)}
                        </span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: 'var(--hz-gray-100)', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: 8,
                            borderRadius: 999,
                            width: `${pct}%`,
                            background: 'var(--hz-primary-500)',
                            transition: 'width 500ms ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card title="Live workforce" subtitle="Status is based on the latest authenticated agent heartbeat" actions={<Link to="/monitoring/devices" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, color: 'var(--hz-primary-600)' }}>Manage devices</Link>}>
        {!devicesLoading && !devicesError && (devices || []).length === 0 && <EmptyState icon={Monitor} title="No employees are active right now." description="Connected agent heartbeats will appear here." />}
        {!devicesLoading && !devicesError && (devices || []).length > 0 && <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Employee</th><th>Status</th><th>Current application</th><th>Current window</th><th>Device</th><th>Last seen</th></tr></thead><tbody>{devices.map((device) => { const status = getDeviceStatus(device); const statusLabel = status === 'IDLE' ? 'Idle' : status === 'OFFLINE' ? 'Offline' : 'Active'; return <tr key={device.id || device.deviceId}><td style={{ fontWeight: 600 }}>{getDeviceEmployeeName(device) || 'Unassigned'}</td><td><span className="d-inline-flex align-items-center gap-2"><span style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'OFFLINE' ? 'var(--hz-gray-500)' : status === 'IDLE' ? 'var(--hz-warning-500)' : 'var(--hz-success-500)' }} />{statusLabel}</span></td><td>{status === 'OFFLINE' ? '—' : getDeviceCurrentApplication(device) || '—'}</td><td className="text-truncate" style={{ maxWidth: 260 }}>{status === 'OFFLINE' ? '—' : getDeviceCurrentWindow(device) || '—'}</td><td>{device.deviceName || '—'}</td><td>{timeAgoIST(getDeviceLastSeen(device))}</td></tr>; })}</tbody></table></div>}
      </Card>

      <Card
        hoverable
        title="Recent Activity"
        subtitle="Latest sessions reported by agents"
        actions={
          <Link to="/monitoring/activity" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, color: 'var(--hz-primary-600)' }}>
            View all →
          </Link>
        }
      >
        {sessionsLoading && <SkeletonText lines={4} />}
        {sessionsError && <ErrorState description="Couldn't load recent activity." onRetry={refetchSessions} />}
        {!sessionsLoading && !sessionsError && recentActivity.length === 0 && (
          <EmptyState icon={Activity} title="No activity yet today" description="Sessions reported by the Windows Agent will show up here." />
        )}
        {!sessionsLoading && !sessionsError && recentActivity.length > 0 && (
          <div className="d-flex flex-column gap-3">
            {recentActivity.map((s) => (
              <div key={getSessionId(s)} className="d-flex align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                  <Avatar name={getSessionEmployeeName(s)} size="sm" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>
                      {getSessionEmployeeName(s)}
                    </div>
                    <div className="text-truncate" style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>
                      {getSessionApp(s)} · {getSessionDeviceName(s)}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--hz-text-muted)', flexShrink: 0 }}>{timeAgoIST(getSessionStart(s))}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="d-flex justify-content-end">
        <Link to="/monitoring/devices" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, color: 'var(--hz-primary-600)' }}>
          Manage devices →
        </Link>
      </div>
    </div>
  );
}
