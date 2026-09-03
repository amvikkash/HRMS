import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Monitor, AppWindow, Activity, KeyRound, Copy } from 'lucide-react';
import {
  monitoringApi,
  getDeviceName,
  getDeviceEmployeeName,
  getDeviceEmployeeId,
  isDeviceOnline,
  getDeviceLastSeen,
  getDeviceOS,
  getDeviceAgentVersion,
  getSessionId,
  getSessionApp,
  getSessionWindowTitle,
  getSessionStart,
  getSessionEnd,
  getSessionDurationSeconds,
  aggregateSessionsByApp,
} from '../../api/endpoints/monitoring';
import { formatDateTimeIST, timeAgoIST, formatDurationShort } from '../../utils/formatDateTime';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonText } from '../../components/ui/Skeleton';
import Dialog from '../../components/ui/Dialog';
import Button from '../../components/ui/Button';

export default function DeviceDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [reason, setReason] = useState('');
  const [newToken, setNewToken] = useState('');

  const {
    data: device,
    isLoading: deviceLoading,
    isError: deviceError,
    refetch: refetchDevice,
  } = useQuery({ queryKey: ['monitoring-device', id], queryFn: () => monitoringApi.deviceById(id), refetchInterval: 30_000 });

  const {
    data: sessions,
    isLoading: sessionsLoading,
    isError: sessionsError,
    refetch: refetchSessions,
  } = useQuery({ queryKey: ['monitoring-sessions-device', id], queryFn: () => monitoringApi.sessionsByDevice(id) });

  const requestOtp = useMutation({ mutationFn: () => monitoringApi.requestTokenOtp(id) });
  const confirmOtp = useMutation({
    mutationFn: () => monitoringApi.confirmTokenOtp(id, otp, reason),
    onSuccess: (result) => {
      setNewToken(result.newToken);
      setOtp('');
      queryClient.invalidateQueries({ queryKey: ['monitoring-token-history', id] });
    },
  });

  const recentSessions = useMemo(
    () => [...(sessions || [])].sort((a, b) => new Date(getSessionStart(b)) - new Date(getSessionStart(a))).slice(0, 25),
    [sessions]
  );
  const appUsage = useMemo(() => aggregateSessionsByApp(sessions, 8), [sessions]);
  const maxAppSeconds = appUsage[0]?.seconds || 1;

  const sessionColumns = [
    { key: 'application', label: 'Application', headerClassName: 'ps-4', className: 'ps-4', render: (s) => getSessionApp(s), style: { fontWeight: 600 } },
    { key: 'windowTitle', label: 'Window Title', render: (s) => getSessionWindowTitle(s) },
    { key: 'start', label: 'Start Time', render: (s) => formatDateTimeIST(getSessionStart(s)) },
    { key: 'end', label: 'End Time', render: (s) => formatDateTimeIST(getSessionEnd(s)) },
    {
      key: 'duration',
      label: 'Duration',
      headerClassName: 'pe-4',
      className: 'pe-4',
      render: (s) => formatDurationShort(getSessionDurationSeconds(s)),
    },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      <Link
        to="/monitoring/devices"
        className="d-inline-flex align-items-center gap-1 text-decoration-none"
        style={{ color: 'var(--hz-text-secondary)', fontSize: 'var(--hz-text-sm)', width: 'fit-content' }}
      >
        <ArrowLeft size={15} /> Back to Devices
      </Link>

      {deviceError && <ErrorState description="Couldn't load this device." onRetry={refetchDevice} />}

      {deviceLoading && (
        <Card>
          <SkeletonText lines={4} />
        </Card>
      )}

      {!deviceLoading && !deviceError && device && (
        <Card>
          <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="hz-stat__icon" style={{ width: 48, height: 48, background: 'var(--hz-primary-50)', color: 'var(--hz-primary-600)' }}>
                <Monitor size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: 'var(--hz-text-xl)', fontWeight: 700, marginBottom: 2 }}>{getDeviceName(device)}</h1>
                <div className="d-flex align-items-center gap-2">
                  <Badge variant={isDeviceOnline(device) ? 'success' : 'neutral'} dot>
                    {isDeviceOnline(device) ? 'Online' : 'Offline'}
                  </Badge>
                  <span style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>
                    Last heartbeat {timeAgoIST(getDeviceLastSeen(device))}
                  </span>
                </div>
              </div>
            </div>
            {getDeviceEmployeeId(device) && (
              <Link to={`/employees/${getDeviceEmployeeId(device)}`} className="text-decoration-none">
                <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, color: 'var(--hz-primary-600)' }}>
                  View {getDeviceEmployeeName(device) || 'employee'} →
                </span>
              </Link>
            )}
            <Button size="sm" icon={KeyRound} onClick={() => { setOtpOpen(true); requestOtp.mutate(); }}>
              Rotate token
            </Button>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-6 col-md-3">
              <p className="text-secondary-hz mb-1" style={{ fontSize: 12, fontWeight: 500 }}>
                Employee
              </p>
              <p style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, marginBottom: 0 }}>{getDeviceEmployeeName(device) || '—'}</p>
            </div>
            <div className="col-6 col-md-3">
              <p className="text-secondary-hz mb-1" style={{ fontSize: 12, fontWeight: 500 }}>
                Operating System
              </p>
              <p style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, marginBottom: 0 }}>{getDeviceOS(device)}</p>
            </div>
            <div className="col-6 col-md-3">
              <p className="text-secondary-hz mb-1" style={{ fontSize: 12, fontWeight: 500 }}>
                Agent Version
              </p>
              <p style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, marginBottom: 0 }}>{getDeviceAgentVersion(device)}</p>
            </div>
            <div className="col-6 col-md-3">
              <p className="text-secondary-hz mb-1" style={{ fontSize: 12, fontWeight: 500 }}>
                Last Heartbeat (IST)
              </p>
              <p style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, marginBottom: 0 }}>{formatDateTimeIST(getDeviceLastSeen(device))}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <Card hoverable title="Application Usage Summary" subtitle="Most recent sessions on this device">
            {sessionsLoading && <SkeletonText lines={4} />}
            {sessionsError && <ErrorState description="Couldn't load application usage." onRetry={refetchSessions} />}
            {!sessionsLoading && !sessionsError && appUsage.length === 0 && (
              <div className="hz-state">
                <div className="hz-state__icon-wrap">
                  <AppWindow size={26} />
                </div>
                <p className="hz-state__title">No activity recorded yet</p>
              </div>
            )}
            {!sessionsLoading && !sessionsError && appUsage.length > 0 && (
              <div className="d-flex flex-column gap-3">
                {appUsage.map((app) => {
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

        <div className="col-12 col-xl-8">
          <Card hoverable title="Recent Activity Sessions" bodyClassName="p-0">
            <Table
              columns={sessionColumns}
              rows={recentSessions}
              getRowKey={(s) => getSessionId(s)}
              isLoading={sessionsLoading}
              isError={sessionsError}
              onRetry={refetchSessions}
              emptyIcon={Activity}
              emptyTitle="No activity sessions yet"
              emptyDescription="Sessions reported by the Windows Agent for this device will show up here."
            />
          </Card>
        </div>
      </div>

      <Dialog
        open={otpOpen}
        onClose={() => { setOtpOpen(false); setNewToken(''); requestOtp.reset(); confirmOtp.reset(); }}
        title="Rotate agent token"
        description="A verification code will be sent to your registered email."
        footer={<Button variant="secondary" onClick={() => setOtpOpen(false)}>Close</Button>}
      >
        {requestOtp.isPending && <p className="text-secondary-hz">Sending verification code...</p>}
        {requestOtp.isError && <p className="text-danger">{requestOtp.error?.response?.data?.message || 'Could not send the verification code.'}</p>}
        {!newToken ? (
          <form onSubmit={(event) => { event.preventDefault(); confirmOtp.mutate(); }} className="d-flex flex-column gap-3">
            <label className="form-label mb-0">Verification code
              <input className="form-control mt-1" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value)} required />
            </label>
            <label className="form-label mb-0">Reason (optional)
              <input className="form-control mt-1" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={255} />
            </label>
            {confirmOtp.isError && <p className="text-danger mb-0">{confirmOtp.error?.response?.data?.message || 'Invalid verification code.'}</p>}
            <Button type="submit" loading={confirmOtp.isPending} disabled={otp.length !== 6}>Confirm rotation</Button>
          </form>
        ) : (
          <div className="d-flex flex-column gap-3">
            <p className="mb-0">Copy this token now. It will not be shown again.</p>
            <div className="input-group">
              <input className="form-control" value={newToken} readOnly aria-label="New agent token" />
              <Button icon={Copy} variant="secondary" aria-label="Copy token" onClick={() => navigator.clipboard.writeText(newToken)}>Copy</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
