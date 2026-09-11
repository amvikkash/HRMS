import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, Copy, Download, Eye, Monitor, Plus, ShieldCheck, Search } from 'lucide-react';
import { employeesApi } from '../../api/endpoints/employees';
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
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import StatusBadge from '../../components/ui/StatusBadge';
import ErrorBanner from '../../components/ui/ErrorBanner';

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
  const [employeeId, setEmployeeId] = useState('');
  const [enrollment, setEnrollment] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['monitoring-devices'], queryFn: monitoringApi.devices, refetchInterval: 30_000 });
  const employees = useQuery({ queryKey: ['employees'], queryFn: employeesApi.list });
  const enrollmentDevices = useQuery({ queryKey: ['monitoring-device-enrollment'], queryFn: monitoringApi.devices, enabled: connectOpen && Boolean(enrollment), refetchInterval: 5_000 });
  const enroll = useMutation({
    mutationFn: () => monitoringApi.enrollDevice({ deviceName: deviceName.trim(), employeeId: employeeId ? Number(employeeId) : null }),
    onSuccess: (result) => { setEnrollment(result); setDeviceName(''); setEmployeeId(''); queryClient.invalidateQueries({ queryKey: ['monitoring-devices'] }); },
  });
  const connectedDevice = useMemo(() => {
    const enrolledId = enrollment?.device?.id ?? enrollment?.device?.deviceId;
    return (enrollmentDevices.data || []).find((device) => String(getDeviceId(device)) === String(enrolledId));
  }, [enrollment, enrollmentDevices.data]);

  useEffect(() => {
    if (connectedDevice) queryClient.invalidateQueries({ queryKey: ['monitoring-devices'] });
  }, [connectedDevice, queryClient]);

  function openConnect() { setEnrollment(null); enroll.reset(); setEmployeeId(''); setConnectOpen(true); }
  function closeConnect() { setConnectOpen(false); setEnrollment(null); enroll.reset(); setEmployeeId(''); }
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
        <StatusBadge status={isDeviceOnline(d) ? 'ACTIVE' : 'INACTIVE'} variant={isDeviceOnline(d) ? 'success' : 'neutral'} dot>
          {isDeviceOnline(d) ? 'Online' : 'Offline'}
        </StatusBadge>
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
      <PageHeader eyebrow="Monitoring" title="Monitored Devices" description="Every device enrolled with the Windows Agent" actions={<Button icon={Plus} onClick={openConnect}>Connect Device</Button>} />

      <FilterBar>
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
      </FilterBar>

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

      <Dialog open={connectOpen} onClose={closeConnect} title="Provision a Windows device" description="Create a secure enrollment and connect a device to your workspace." size="md" footer={!enrollment ? <><Button variant="secondary" onClick={closeConnect}>Cancel</Button><Button form="device-provisioning-form" type="submit" icon={ShieldCheck} loading={enroll.isPending} disabled={!deviceName.trim()}>Create secure token</Button></> : <Button variant="secondary" onClick={closeConnect}>{connectedDevice ? 'Done' : 'Close'}</Button>}>
        <div className="hz-enrollment">
          <div className="hz-enrollment__progress" aria-label="Device enrollment progress">
            <span className="hz-enrollment__step is-complete"><i>1</i>Prepare</span>
            <span className={`hz-enrollment__step ${enrollment ? 'is-complete' : 'is-active'}`}><i>2</i>Secure</span>
            <span className={`hz-enrollment__step ${connectedDevice ? 'is-complete' : enrollment ? 'is-active' : ''}`}><i>3</i>Connect</span>
          </div>
          {!enrollment ? (
            <form id="device-provisioning-form" onSubmit={(event) => { event.preventDefault(); enroll.mutate(); }} className="hz-enrollment">
              <div className="hz-enrollment__intro"><h3>Set up a trusted endpoint</h3><p>Name the device and optionally link it to an employee before issuing its one-time enrollment token.</p></div>
              <div className="hz-enrollment__download"><div><strong>Vettri Windows Agent</strong><span>Install this lightweight agent on the computer first.</span></div>{AGENT_DOWNLOAD_URL ? <a className="btn btn-outline-primary d-inline-flex align-items-center gap-2" href={AGENT_DOWNLOAD_URL} target="_blank" rel="noreferrer"><Download size={16} /> Download agent</a> : <Button type="button" variant="secondary" icon={Download} disabled>Installer unavailable</Button>}</div>
              <div className="hz-enrollment__fields"><label className="hz-form-label">Device name<input className="form-control" value={deviceName} onChange={(event) => setDeviceName(event.target.value)} placeholder="e.g. Priya's Windows PC" required maxLength={150} /></label><label className="hz-form-label">Assigned employee<select className="form-select" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}><option value="">Leave unassigned</option>{(employees.data || []).map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()}</option>)}</select></label></div>
              {enroll.isError && <ErrorBanner>{enroll.error?.response?.data?.message || 'Could not create the enrollment token.'}</ErrorBanner>}
            </form>
          ) : (
            <>
              <div className="hz-enrollment__intro"><h3>Enrollment is ready</h3><p>Paste this one-time token into the Vettri Agent installer. It remains private to your company workspace.</p></div>
              <div className="hz-enrollment__token"><div className="hz-enrollment__token-label"><span>One-time enrollment token</span><Button type="button" variant="ghost" size="sm" icon={Copy} onClick={copyToken}>Copy</Button></div><div className="hz-enrollment__token-value">{enrollment.rawToken || 'Token unavailable'}</div></div>
              <div className={`hz-enrollment__signal ${connectedDevice ? 'is-connected' : ''}`}><span>{connectedDevice ? <Check size={17} /> : <span className="spinner-border spinner-border-sm" aria-hidden="true" />}</span><span>{connectedDevice ? 'Device connected and reporting to Vettri.' : 'Waiting for the first secure heartbeat from this device…'}</span></div>
              {connectedDevice && <div className="hz-card"><div className="hz-card__body"><div className="row g-3" style={{ fontSize: 'var(--hz-text-sm)' }}><div className="col-6"><span className="text-secondary-hz d-block">Device</span>{getDeviceName(connectedDevice)}</div><div className="col-6"><span className="text-secondary-hz d-block">Employee</span>{getDeviceEmployeeName(connectedDevice) || 'Unassigned'}</div><div className="col-6"><span className="text-secondary-hz d-block">Platform</span>{getDeviceOS(connectedDevice)}</div><div className="col-6"><span className="text-secondary-hz d-block">Agent</span>{getDeviceAgentVersion(connectedDevice)}</div></div></div></div>}
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
