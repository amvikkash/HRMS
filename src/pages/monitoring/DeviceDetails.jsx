import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Monitor, AppWindow, Activity, KeyRound, Copy, Terminal, MonitorUp, ShieldCheck, RefreshCw, Ban, Network } from 'lucide-react';
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
import StatusBadge from '../../components/ui/StatusBadge';
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
  const supportKey = ['remote-support-jobs', id];

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
  const supportQuery = useQuery({
    queryKey: supportKey,
    queryFn: () => monitoringApi.remoteSupportJobs(id),
    refetchInterval: (query) => {
      const latestSupport = [...(query.state.data || [])].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
      return latestSupport && ['READY', 'FAILED'].includes(latestSupport.status) ? false : 3000;
    },
  });
  const supportMutation = useMutation({ mutationFn: (operation) => ({ configure: monitoringApi.configureRemoteSupport, detect: monitoringApi.detectRemoteSupport, rotate: monitoringApi.rotateRemoteSupport, disable: monitoringApi.disableRemoteSupport }[operation](id)), onSuccess: () => queryClient.invalidateQueries({ queryKey: supportKey }) });
  const latestSupport = useMemo(
    () => [...(supportQuery.data || [])].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0],
    [supportQuery.data]
  );
  const rustDeskConnectUrl = latestSupport?.status === 'READY' && latestSupport?.rustDeskId
    ? `rustdesk://connect/${encodeURIComponent(latestSupport.rustDeskId.trim())}`
    : null;
  const supportSummaryStatus = latestSupport?.status === 'READY'
    ? 'READY'
    : latestSupport?.status === 'FAILED'
      ? 'FAILED'
      : latestSupport
        ? 'PROVISIONING'
        : 'NOT_CONFIGURED';
  const supportStages = [
    'CONFIGURE_CLICKED',
    'BACKEND_RECEIVED',
    'JOB_CREATED',
    'AGENT_REACHED',
    'AGENT_STARTED',
    'CREDENTIAL_READY',
    'RUSTDESK_PROVISIONING',
    'PASSWORD_CONFIGURED',
    'SERVER_CONFIGURED',
    'SERVICE_READY',
    'ID_VERIFIED',
    'RESULT_SENT',
    'BACKEND_RESULT_ACCEPTED',
  ];
  const terminalStage = latestSupport?.status === 'FAILED' ? 'FAILED' : latestSupport?.status === 'READY' ? 'READY' : null;
  const displayedStages = terminalStage ? [...supportStages, terminalStage] : supportStages;
  const currentStageIndex = latestSupport?.provisioningStage ? displayedStages.indexOf(latestSupport.provisioningStage) : -1;

  const handleRustDeskConnect = () => {
    if (!rustDeskConnectUrl) return;
    window.location.href = rustDeskConnectUrl;
  };

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
                  <StatusBadge status={isDeviceOnline(device) ? 'ACTIVE' : 'INACTIVE'} variant={isDeviceOnline(device) ? 'success' : 'neutral'} dot>
                    {isDeviceOnline(device) ? 'Online' : 'Offline'}
                  </StatusBadge>
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
            <Link to={`/monitoring/devices/${id}/cli`} className="text-decoration-none"><Button size="sm" variant="secondary" icon={Terminal}>Vettri CLI</Button></Link>
            <Link to={`/monitoring/devices/${id}/remote-desktop`} className="text-decoration-none"><Button size="sm" variant="secondary" icon={MonitorUp}>Remote Desktop</Button></Link>
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
        <div className="col-12">
          <Card title="Remote Support" subtitle="RustDesk Remote Support is separate from the existing Vettri Remote Desktop WebRTC flow. The Agent provisions and manages RustDesk locally, and this screen shows the RustDesk ID plus the configured password for the current READY session.">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <ShieldCheck size={18} />
                  <strong>{supportSummaryStatus}</strong>
                </div>
                <div className="text-secondary-hz" style={{ fontSize: 13 }}>
                  {latestSupport?.provisioningStage
                    ? `Current stage: ${latestSupport.provisioningStage}`
                    : latestSupport?.version
                      ? `RustDesk ${latestSupport.version}`
                      : 'RustDesk version not verified'}
                </div>
                {latestSupport?.errorMessage && (
                  <div className="text-danger mt-2" style={{ fontSize: 13 }}>
                    Error: {latestSupport.errorMessage}
                  </div>
                )}
                {currentStageIndex >= 0 && (
                  <div className="mt-3 d-flex flex-column gap-2">
                    {displayedStages.map((stage, index) => {
                      const completed = currentStageIndex >= index && stage !== 'FAILED';
                      const active = currentStageIndex === index;
                      const failed = latestSupport?.status === 'FAILED' && stage === 'FAILED';

                      return (
                        <div key={stage} className="d-flex align-items-center gap-2" style={{ fontSize: 12 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: failed ? '#dc2626' : completed ? '#16a34a' : active ? '#f59e0b' : '#d1d5db',
                              display: 'inline-block',
                              boxShadow: active ? '0 0 0 4px rgba(245, 158, 11, 0.15)' : 'none',
                            }}
                          />
                          <span style={{ color: failed ? '#b91c1c' : completed ? '#166534' : active ? '#b45309' : 'var(--hz-text-secondary)' }}>
                            {stage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {latestSupport?.rustDeskId && latestSupport?.status === 'READY' && (
                  <div className="mt-2">
                    <div className="text-secondary-hz" style={{ fontSize: 13, marginBottom: 6 }}>RustDesk ID</div>
                    <div className="d-flex align-items-center gap-2">
                      <code style={{ fontSize: 13, padding: '4px 8px', background: 'var(--hz-gray-50)', borderRadius: 4, fontFamily: 'monospace', fontWeight: 600 }}>
                        {latestSupport.rustDeskId.replace(/(\d{3})(?=\d)/g, '$1 ')}
                      </code>
                      <Button
                        size="xs"
                        variant="secondary"
                        icon={Copy}
                        onClick={() => {
                          navigator.clipboard.writeText(latestSupport.rustDeskId);
                          // Could add toast notification here
                        }}
                        aria-label="Copy RustDesk ID"
                      >
                        Copy
                      </Button>
                    </div>
                    {latestSupport?.rustDeskPassword && (
                      <div className="mt-3">
                        <div className="text-secondary-hz" style={{ fontSize: 13, marginBottom: 6 }}>RustDesk Password</div>
                        <div className="d-flex align-items-center gap-2">
                          <code style={{ fontSize: 13, padding: '4px 8px', background: 'var(--hz-gray-50)', borderRadius: 4, fontFamily: 'monospace', fontWeight: 600 }}>
                            {latestSupport.rustDeskPassword}
                          </code>
                          <Button
                            size="xs"
                            variant="secondary"
                            icon={Copy}
                            onClick={() => {
                              navigator.clipboard.writeText(latestSupport.rustDeskPassword);
                            }}
                            aria-label="Copy RustDesk Password"
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="text-secondary-hz mt-2" style={{ fontSize: 12, lineHeight: 1.5 }}>
                      This opens the installed RustDesk client using the current READY RustDesk ID and password shown above.
                    </div>
                  </div>
                )}
                {latestSupport?.errorMessage && (
                  <div className="text-danger mt-2" style={{ fontSize: 13 }}>
                    Error: {latestSupport.errorMessage}
                  </div>
                )}
              </div>
              <div className="d-flex gap-2 flex-wrap">
                {latestSupport?.status === 'READY' && latestSupport?.rustDeskId && (
                  <Button
                    size="sm"
                    icon={Network}
                    disabled={!isDeviceOnline(device) || supportMutation.isPending || !rustDeskConnectUrl}
                    onClick={handleRustDeskConnect}
                  >
                    Connect via RustDesk
                  </Button>
                )}
                {latestSupport?.status === 'READY' ? (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={ShieldCheck}
                      disabled={!isDeviceOnline(device) || supportMutation.isPending}
                      onClick={() => supportMutation.mutate('configure')}
                    >
                      Reconfigure
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={KeyRound}
                      disabled={!isDeviceOnline(device) || supportMutation.isPending}
                      onClick={() => supportMutation.mutate('rotate')}
                    >
                      Rotate password
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      icon={Ban}
                      disabled={!isDeviceOnline(device) || supportMutation.isPending}
                      onClick={() => supportMutation.mutate('disable')}
                    >
                      Disable
                    </Button>
                  </>
                ) : latestSupport?.status === 'FAILED' ? (
                  <Button
                    size="sm"
                    icon={ShieldCheck}
                    disabled={!isDeviceOnline(device) || supportMutation.isPending}
                    onClick={() => supportMutation.mutate('configure')}
                  >
                    Retry Configure
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      icon={ShieldCheck}
                      disabled={!isDeviceOnline(device) || supportMutation.isPending}
                      onClick={() => supportMutation.mutate('configure')}
                    >
                      Configure
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={RefreshCw}
                      disabled={!isDeviceOnline(device) || supportMutation.isPending}
                      onClick={() => supportMutation.mutate('detect')}
                    >
                      Detect
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>
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
