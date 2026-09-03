import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, Copy, Download, Eye, Monitor, Plus, ShieldCheck, Search } from 'lucide-react';
import {
  monitoringApi,
  getDeviceId,
  getDeviceName,
  getDeviceEmployeeName,
  isDeviceOnline,
  getDeviceLastSeen,
  getDeviceOS,
  getDeviceAgentVersion,
} from '../../api/endpoints/monitoring';
import { timeAgoIST } from '../../utils/formatDateTime';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';

const AGENT_DOWNLOAD_URL = import.meta.env.VITE_AGENT_DOWNLOAD_URL || '';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
];

export default function Devices() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [connectOpen, setConnectOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [enrollment, setEnrollment] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['monitoring-devices'], queryFn: monitoringApi.devices, refetchInterval: 30_000 });
  const enrollmentDevices = useQuery({ queryKey: ['monitoring-device-enrollment'], queryFn: monitoringApi.devices, enabled: connectOpen && Boolean(enrollment), refetchInterval: 5_000 });
  const enroll = useMutation({
    mutationFn: () => monitoringApi.enrollDevice({ deviceName: deviceName.trim() }),
    onSuccess: (result) => { setEnrollment(result); setDeviceName(''); queryClient.invalidateQueries({ queryKey: ['monitoring-devices'] }); },
  });
  const connectedDevice = useMemo(() => {
    const enrolledId = enrollment?.device?.id ?? enrollment?.device?.deviceId;
    return (enrollmentDevices.data || []).find((device) => String(getDeviceId(device)) === String(enrolledId));
  }, [enrollment, enrollmentDevices.data]);

  useEffect(() => {
    if (connectedDevice) queryClient.invalidateQueries({ queryKey: ['monitoring-devices'] });
  }, [connectedDevice, queryClient]);

  function openConnect() { setEnrollment(null); enroll.reset(); setConnectOpen(true); }
  function closeConnect() { setConnectOpen(false); setEnrollment(null); enroll.reset(); }
  async function copyToken() { if (enrollment?.rawToken) await navigator.clipboard.writeText(enrollment.rawToken); }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data || []).filter((d) => {
      const online = isDeviceOnline(d);
      if (statusFilter === 'online' && !online) return false;
      if (statusFilter === 'offline' && online) return false;
      if (!q) return true;
      const name = getDeviceName(d).toLowerCase();
      const employee = (getDeviceEmployeeName(d) || '').toLowerCase();
      return name.includes(q) || employee.includes(q);
    });
  }, [data, search, statusFilter]);

  const columns = [
    {
      key: 'device',
      label: 'Device Name',
      headerClassName: 'ps-4',
      className: 'ps-4',
      render: (d) => (
        <Link to={`/monitoring/devices/${getDeviceId(d)}`} className="d-flex align-items-center gap-2 text-decoration-none">
          <div className="hz-stat__icon" style={{ width: 32, height: 32, background: 'var(--hz-primary-50)', color: 'var(--hz-primary-600)' }}>
            <Monitor size={15} />
          </div>
          <span style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>{getDeviceName(d)}</span>
        </Link>
      ),
    },
    { key: 'employee', label: 'Employee', render: (d) => getDeviceEmployeeName(d) || '—' },
    {
      key: 'status',
      label: 'Status',
      render: (d) => (
        <Badge variant={isDeviceOnline(d) ? 'success' : 'neutral'} dot>
          {isDeviceOnline(d) ? 'Online' : 'Offline'}
        </Badge>
      ),
    },
    {
      key: 'lastSeen',
      label: 'Last Seen',
      render: (d) => timeAgoIST(getDeviceLastSeen(d)),
      style: { color: 'var(--hz-text-secondary)' },
    },
    { key: 'os', label: 'Operating System', render: (d) => getDeviceOS(d) },
    { key: 'agentVersion', label: 'Agent Version', render: (d) => getDeviceAgentVersion(d) },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'pe-4',
      className: 'pe-4',
      render: (d) => (
        <Link
          to={`/monitoring/devices/${getDeviceId(d)}`}
          className="hz-icon-btn d-inline-flex align-items-center justify-content-center border-0"
          style={{ width: 32, height: 32 }}
          aria-label={`View ${getDeviceName(d)}`}
        >
          <Eye size={15} />
        </Link>
      ),
    },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
        <div>
          <h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>Monitored Devices</h1>
          <p className="text-secondary-hz" style={{ fontSize: 'var(--hz-text-sm)' }}>Every device enrolled with the Windows Agent</p>
        </div>
        <Button icon={Plus} onClick={openConnect}>Connect Device</Button>
      </div>

      <div className="d-flex align-items-center gap-2 flex-wrap">
        <div className="position-relative" style={{ maxWidth: 360, width: '100%' }}>
          <Search size={16} className="position-absolute" style={{ left: 12, top: 10, color: 'var(--hz-text-muted)' }} />
          <input
            type="search"
            placeholder="Search by device or employee…"
            className="form-control ps-5"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="form-select" style={{ maxWidth: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <Card bodyClassName="p-0">
        <Table
          columns={columns}
          rows={filtered}
          getRowKey={(d) => getDeviceId(d)}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyIcon={Monitor}
          emptyTitle={search || statusFilter !== 'all' ? 'No matching devices' : 'No devices connected yet'}
          emptyDescription={
            search || statusFilter !== 'all'
              ? 'Try a different search term or status filter.'
              : 'Connect a Windows computer to start monitoring employee activity.'
          }
          emptyAction={!search && statusFilter === 'all' && <Button icon={Plus} onClick={openConnect}>Connect Device</Button>}
        />
      </Card>

      <Dialog open={connectOpen} onClose={closeConnect} title="Connect a Windows Device" description="Connect an employee's Windows computer to Vettri HRMS monitoring." size="sm" footer={<Button variant="secondary" onClick={closeConnect}>{connectedDevice ? 'Done' : 'Close'}</Button>}>
        {!enrollment ? (
          <form onSubmit={(event) => { event.preventDefault(); enroll.mutate(); }} className="d-flex flex-column gap-4">
            <div className="d-flex gap-3"><Badge variant="primary">Step 1</Badge><div className="flex-grow-1"><h4 className="mb-1" style={{ fontSize: 'var(--hz-text-base)' }}>Download Vettri Agent</h4><p className="text-secondary-hz mb-2" style={{ fontSize: 'var(--hz-text-sm)' }}>Download the installer for the employee's Windows computer.</p>{AGENT_DOWNLOAD_URL ? <a className="btn btn-outline-primary d-inline-flex align-items-center gap-2" href={AGENT_DOWNLOAD_URL} target="_blank" rel="noreferrer"><Download size={16} /> Download Vettri Agent</a> : <Button type="button" variant="secondary" icon={Download} disabled>Installer link unavailable</Button>}</div></div>
            <div className="d-flex gap-3"><Badge variant="primary">Step 2</Badge><div><h4 className="mb-1" style={{ fontSize: 'var(--hz-text-base)' }}>Install Vettri Agent</h4><p className="text-secondary-hz mb-0" style={{ fontSize: 'var(--hz-text-sm)' }}>Run the installer on the employee's Windows computer.</p></div></div>
            <div className="d-flex gap-3"><Badge variant="primary">Step 3</Badge><div className="flex-grow-1"><h4 className="mb-1" style={{ fontSize: 'var(--hz-text-base)' }}>Create enrollment token</h4><p className="text-secondary-hz mb-3" style={{ fontSize: 'var(--hz-text-sm)' }}>Create a secure, company-scoped token to paste into the installer.</p><label className="form-label">Device name<input className="form-control mt-1" value={deviceName} onChange={(event) => setDeviceName(event.target.value)} placeholder="e.g. Priya's Windows PC" required maxLength={150} /></label>{enroll.isError && <p className="text-danger mb-3">{enroll.error?.response?.data?.message || 'Could not create the enrollment token.'}</p>}<Button type="submit" icon={ShieldCheck} loading={enroll.isPending} disabled={!deviceName.trim()}>Generate enrollment token</Button></div></div>
          </form>
        ) : (
          <div className="d-flex flex-column gap-4"><div className="d-flex align-items-center gap-2"><Badge variant={connectedDevice ? 'success' : 'warning'} dot>{connectedDevice ? 'Device connected' : 'Waiting for device...'}</Badge></div><div><p className="text-secondary-hz mb-2" style={{ fontSize: 'var(--hz-text-sm)' }}>Enrollment token</p><div className="input-group"><input className="form-control" value={enrollment.rawToken || ''} readOnly aria-label="Enrollment token" /><Button type="button" variant="secondary" icon={Copy} onClick={copyToken}>Copy token</Button></div><p className="text-secondary-hz mt-2 mb-0" style={{ fontSize: 12 }}>This one-time token is issued by the backend. Paste it into the installer and keep it private.</p></div>{connectedDevice && <div className="hz-card p-3"><div className="d-flex align-items-center gap-2 mb-3"><Check size={18} color="var(--hz-success-600)" /><strong>Device connected</strong></div><div className="row g-3" style={{ fontSize: 'var(--hz-text-sm)' }}><div className="col-6"><span className="text-secondary-hz d-block">Device name</span>{getDeviceName(connectedDevice)}</div><div className="col-6"><span className="text-secondary-hz d-block">Employee</span>{getDeviceEmployeeName(connectedDevice) || 'Unassigned'}</div><div className="col-6"><span className="text-secondary-hz d-block">Operating system</span>{getDeviceOS(connectedDevice)}</div><div className="col-6"><span className="text-secondary-hz d-block">Agent version</span>{getDeviceAgentVersion(connectedDevice)}</div><div className="col-12"><span className="text-secondary-hz d-block">Last heartbeat</span>{timeAgoIST(getDeviceLastSeen(connectedDevice))}</div></div></div>}{!connectedDevice && <p className="text-secondary-hz mb-0" style={{ fontSize: 'var(--hz-text-sm)' }}>The device will appear here after the agent's first heartbeat.</p>}</div>
        )}
      </Dialog>
    </div>
  );
}
