import { useEffect, useState } from 'react';
import { useParams, Link, Navigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../../api/endpoints/employees';
import { leaveRequestsApi } from '../../api/endpoints/leave';
import { attendanceApi, workSessionApi } from '../../api/endpoints/attendance';
import { documentsApi, DOCUMENT_TYPE_LABEL, MANDATORY_DOCUMENTS } from '../../api/endpoints/documents';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, Users, ChevronDown, Fingerprint, Pencil, Check, X, CalendarDays, Clock, FileText, Plus, Trash2, AlertTriangle, Network, ClipboardList, Search, Send, UserX, CheckCircle2, PackageOpen } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusBadge from '../../components/ui/StatusBadge';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonText } from '../../components/ui/Skeleton';
import { statusMeta, STATUS_META, SELECTABLE_STATUSES, EMPLOYMENT_TYPE_LABEL } from './statusMeta';
import { leaveStatusMeta } from '../leave/leaveStatusMeta';
import { useBreadcrumbLabel } from '../../components/layout/BreadcrumbContext';
import Tabs from '../../components/ui/Tabs';
import { useAuth } from '../../hooks/useAuth';
import ApplyLeaveModal from '../leave/ApplyLeaveModal';
import { selfServiceApi } from '../../api/endpoints/selfService';
import ErrorBanner from '../../components/ui/ErrorBanner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const TABS = [
  { key: 'overview', label: 'Profile', icon: ClipboardList },
  { key: 'job', label: 'Job', icon: Briefcase },
  { key: 'hierarchy', label: 'Organization', icon: Network },
  { key: 'attendance', label: 'Attendance', icon: Clock },
  { key: 'leave', label: 'Leave', icon: CalendarDays },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'assets', label: 'Assets', icon: PackageOpen },
];
const VALID_TAB_KEYS = TABS.map((tab) => tab.key);
const EMPLOYEE_TAB_KEYS = ['overview', 'job', 'attendance', 'leave', 'documents', 'assets'];

export default function EmployeeProfile() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const employeeId = id || user?.employeeId;
  const isEmployee = hasRole('EMPLOYEE');
  const availableTabs = isEmployee ? TABS.filter((item) => EMPLOYEE_TAB_KEYS.includes(item.key)) : TABS;
  const availableTabKeys = isEmployee ? EMPLOYEE_TAB_KEYS : VALID_TAB_KEYS;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = availableTabKeys.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview';
  const [tab, setTab] = useState(initialTab);
  const queryClient = useQueryClient();
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    setTab(availableTabKeys.includes(requestedTab) ? requestedTab : 'overview');
  }, [searchParams, availableTabKeys]);

  function changeTab(key) {
    setTab(key);
    setSearchParams(key === 'overview' ? {} : { tab: key }, { replace: true });
  }

  const { data: employee, isLoading, isError, refetch } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeesApi.getById(employeeId),
    enabled: !!employeeId,
  });

  useBreadcrumbLabel(employee?.fullName);

  const changeStatus = useMutation({
    mutationFn: (status) => employeesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setStatusMenuOpen(false);
    },
  });

  if (isEmployee && id && String(id) !== String(user?.employeeId)) return <Navigate to="/my-profile" replace />;

  if (isLoading) {
    return (
      <Card>
        <SkeletonText lines={8} />
      </Card>
    );
  }

  if (isError || !employee) {
    return <ErrorState description="Couldn't load this employee." onRetry={refetch} />;
  }

  const meta = statusMeta(employee.status);

  return (
    <div className="hz-profile hz-employee-workspace d-flex flex-column gap-4">
      <Link to={isEmployee ? '/dashboard' : '/employees'} className="d-inline-flex align-items-center gap-1 text-decoration-none" style={{ color: 'var(--hz-text-secondary)', fontSize: 'var(--hz-text-sm)', width: 'fit-content' }}>
        <ArrowLeft size={15} /> {isEmployee ? 'Back to Dashboard' : 'Back to Employees'}
      </Link>

      <section className="hz-profile-identity-panel">
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <Avatar name={employee.fullName} size="xl" />
            <div className="hz-profile__identity-copy">
              <div className="d-flex align-items-center gap-2">
                <h1 style={{ fontSize: 'var(--hz-text-xl)', fontWeight: 700, margin: 0 }}>{employee.fullName}</h1>
                <StatusBadge status={employee.status} variant={meta.variant} dot>
                  {meta.label}
                </StatusBadge>
              </div>
              <p className="text-secondary-hz mb-1" style={{ fontSize: 'var(--hz-text-sm)' }}>
                {employee.designationTitle || 'No designation set'} {employee.departmentName ? `· ${employee.departmentName}` : ''}
              </p>
              <p className="text-muted-hz mb-0" style={{ fontSize: 12 }}>
                {employee.employeeCode} · {EMPLOYMENT_TYPE_LABEL[employee.employmentType] || employee.employmentType}
              </p>
            </div>
          </div>

          {!isEmployee && (
          <div className="position-relative">
            <Button variant="secondary" size="sm" onClick={() => setStatusMenuOpen((o) => !o)}>
              Change Status <ChevronDown size={14} />
            </Button>
            {statusMenuOpen && (
              <>
                <div className="position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 15 }} onClick={() => setStatusMenuOpen(false)} />
                <div className="position-absolute end-0 mt-2 hz-surface" style={{ width: 200, zIndex: 20, padding: 6 }}>
                  {SELECTABLE_STATUSES.map((key) => {
                    const val = STATUS_META[key];
                    return (
                    <button
                      key={key}
                      disabled={key === employee.status || changeStatus.isPending}
                      onClick={() => changeStatus.mutate(key)}
                      className="btn btn-light border-0 w-100 text-start px-2 py-2 d-flex align-items-center gap-2"
                      style={{ opacity: key === employee.status ? 0.5 : 1 }}
                    >
                      <StatusBadge status={key} variant={val.variant} dot>
                        {val.label}
                      </StatusBadge>
                    </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          )}
        </div>
        <div className="hz-profile-summary">
          <ProfileSummary label="Department" value={employee.departmentName || 'Not set'} />
          <ProfileSummary label="Manager" value={employee.reportingManagerName || 'Not set'} />
          <ProfileSummary label="Joined" value={employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : 'Not set'} />
          <ProfileSummary label="Employment" value={EMPLOYMENT_TYPE_LABEL[employee.employmentType] || employee.employmentType || 'Not set'} />
        </div>
      </section>

      <Tabs items={availableTabs} value={tab} onChange={changeTab} />

      {tab === 'overview' && <OverviewTab employee={employee} isEmployee={isEmployee} />}
      {tab === 'job' && <JobTab employee={employee} />}
      {tab === 'hierarchy' && <HierarchyTab employee={employee} />}
      {tab === 'attendance' && <AttendanceTab employee={employee} />}
      {tab === 'leave' && <LeaveTab employee={employee} />}
      {tab === 'documents' && <DocumentsTab employee={employee} isEmployee={isEmployee} />}
      {tab === 'assets' && <AssetsTab />}
    </div>
  );
}

function ProfileSummary({ label, value }) {
  return (
    <div className="hz-profile-summary__item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProfileContact({ icon: Icon, label, value }) {
  return (
    <div className="hz-profile-contact-strip__item">
      <Icon size={15} aria-hidden="true" />
      <span><small>{label}</small><strong>{value || 'Not set'}</strong></span>
    </div>
  );
}

function OverviewTab({ employee, isEmployee }) {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [editingBiometric, setEditingBiometric] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [pinValue, setPinValue] = useState(employee.biometricDeviceUserId || '');
  const accountStatus = employee.accountStatus || (employee.linkedUserId ? 'ACTIVE' : 'INVITED');
  const sendInvitation = useMutation({
    mutationFn: () => employeesApi.sendInvitation(employee.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee', id] }),
  });
  const disableAccount = useMutation({
    mutationFn: () => employeesApi.setAccountStatus(employee.id, 'DISABLED'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee', id] }),
  });

  const saveBiometric = useMutation({
    mutationFn: () => employeesApi.setBiometricMapping(employee.id, pinValue),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      setEditingBiometric(false);
    },
  });

  return (
    <div className="hz-profile-overview">
      <section className="hz-profile-section hz-profile-account-section">
        <div className="hz-profile-section__heading">
          <div><span>Account</span><small>Login access for this employee</small></div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Badge variant={accountStatus === 'ACTIVE' ? 'success' : accountStatus === 'DISABLED' ? 'danger' : 'warning'} dot>{accountStatus}</Badge>
            {!isEmployee && accountStatus !== 'ACTIVE' && accountStatus !== 'DISABLED' && <Button size="sm" icon={Send} loading={sendInvitation.isPending} onClick={() => sendInvitation.mutate()}>{sendInvitation.isPending ? 'Sending' : 'Resend Invitation'}</Button>}
            {!isEmployee && accountStatus === 'ACTIVE' && <Button size="sm" variant="danger" icon={UserX} loading={disableAccount.isPending} onClick={() => setConfirmDisable(true)}>Disable Account</Button>}
          </div>
        </div>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="hz-profile-info-grid hz-profile-info-grid--two">
              <InfoRow icon={Mail} label="Email" value={employee.email} />
              <InfoRow label="Employee ID" value={employee.employeeCode} />
            </div>
          </div>
          {(sendInvitation.isError || disableAccount.isError) && <div className="mt-3 text-danger small">{sendInvitation.error?.response?.data?.message || disableAccount.error?.response?.data?.message || 'Account action failed.'}</div>}
          <ConfirmDialog
            open={confirmDisable}
            onClose={() => setConfirmDisable(false)}
            title="Disable this account?"
            description={`Sign-in access for ${employee.fullName} will be disabled.`}
            confirmLabel="Disable account"
            loading={disableAccount.isPending}
            onConfirm={() => disableAccount.mutate(undefined, { onSuccess: () => setConfirmDisable(false) })}
          />
      </section>
      <ProfileInfoSection title="Personal information">
        <InfoRow icon={Mail} label="Email" value={employee.email} />
        <InfoRow icon={Phone} label="Phone" value={employee.phone} />
        <InfoRow icon={MapPin} label="Location" value={employee.address} />
        <InfoRow icon={Calendar} label="Date of birth" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : null} />
        <InfoRow label="Gender" value={employee.gender} />
      </ProfileInfoSection>
      <ProfileInfoSection title="Employment">
        <InfoRow icon={Calendar} label="Joined" value={employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : null} />
        <InfoRow icon={Briefcase} label="Employment type" value={EMPLOYMENT_TYPE_LABEL[employee.employmentType] || employee.employmentType} />
        <InfoRow icon={Users} label="Department" value={employee.departmentName} />
        <InfoRow icon={Users} label="Team" value={employee.teamName} />
        <InfoRow icon={Users} label="Reports to" value={employee.reportingManagerName} />
      </ProfileInfoSection>
      <ProfileInfoSection title="Emergency contact">
        <InfoRow label="Name" value={employee.emergencyContactName} />
        <InfoRow icon={Phone} label="Phone" value={employee.emergencyContactPhone} />
      </ProfileInfoSection>
      {!isEmployee && <section className="hz-profile-section hz-profile-biometric-section">
        <div className="hz-profile-section__heading"><div><span>Biometric enrollment</span><small>The PIN used on the fingerprint device</small></div></div>
          <div className="d-flex align-items-center gap-2 py-2">
            <Fingerprint size={15} style={{ color: 'var(--hz-text-muted)', flexShrink: 0 }} />
            {editingBiometric ? (
              <>
                <input
                  className="form-control form-control-sm"
                  style={{ width: 140 }}
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value)}
                  placeholder="Device PIN"
                  autoFocus
                />
                <button className="btn btn-sm btn-light border-0" onClick={() => saveBiometric.mutate()} aria-label="Save biometric mapping">
                  <Check size={14} />
                </button>
                <button className="btn btn-sm btn-light border-0" onClick={() => setEditingBiometric(false)} aria-label="Cancel editing biometric mapping">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>
                  {employee.biometricDeviceUserId || 'Not mapped'}
                </span>
                <button className="btn btn-sm btn-light border-0 p-1" onClick={() => setEditingBiometric(true)} aria-label="Edit biometric mapping">
                  <Pencil size={12} />
                </button>
              </>
            )}
          </div>
      </section>}
    </div>
  );
}

function ProfileInfoSection({ title, children }) {
  return <section className="hz-profile-section"><div className="hz-profile-section__heading"><div><span>{title}</span></div></div><div className="hz-profile-info-grid">{children}</div></section>;
}

function JobTab({ employee }) {
  return (
    <div className="row g-3">
      <div className="col-12 col-lg-6">
        <Card title="Job Details">
          <InfoRow label="Employee Number" value={employee.employeeCode} />
          <InfoRow icon={Briefcase} label="Job Title" value={employee.designationTitle} />
          <InfoRow label="Worker Type" value={EMPLOYMENT_TYPE_LABEL[employee.employmentType] || employee.employmentType} />
          <InfoRow icon={Calendar} label="Date of Joining" value={employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : null} />
        </Card>
      </div>
      <div className="col-12 col-lg-6">
        <Card title="Organization">
          <InfoRow label="Department" value={employee.departmentName} />
          <InfoRow label="Team" value={employee.teamName} />
          <InfoRow icon={MapPin} label="Location" value={employee.address} />
          <InfoRow icon={Users} label="Reports To" value={employee.reportingManagerName} />
        </Card>
      </div>
      <div className="col-12 col-lg-6">
        <Card title="Employee Time">
          <InfoRow icon={Clock} label="Attendance Number" value={employee.biometricDeviceUserId} />
          <InfoRow label="Attendance Policy" value={null} />
          <InfoRow label="Holiday Calendar" value={null} />
        </Card>
      </div>
      <div className="col-12 col-lg-6">
        <Card title="Other">
          <div className="hz-profile-empty-note">Additional job settings are not configured for this employee.</div>
        </Card>
      </div>
    </div>
  );
}

function HierarchyTab({ employee }) {
  return (
    <div className="row g-3">
      <div className="col-12 col-lg-6">
        <Card title="Reports To">
          {employee.reportingManagerId ? (
            <Link to={`/employees/${employee.reportingManagerId}`} className="d-flex align-items-center gap-2 text-decoration-none">
              <Avatar name={employee.reportingManagerName} size="md" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>
                  {employee.reportingManagerName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{employee.reportingManagerDesignation}</div>
              </div>
            </Link>
          ) : (
            <EmptyState icon={Users} title="No manager set" description="This employee doesn't have a reporting manager assigned." />
          )}
        </Card>
      </div>
      <div className="col-12 col-lg-6">
        <Card title="Direct Reports" subtitle={`${employee.directReports?.length || 0} people`}>
          {employee.directReports?.length ? (
            <div className="d-flex flex-column gap-3">
              {employee.directReports.map((report) => (
                <Link key={report.id} to={`/employees/${report.id}`} className="d-flex align-items-center gap-2 text-decoration-none">
                  <Avatar name={report.fullName} size="sm" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>{report.fullName}</div>
                    <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{report.designationTitle || '—'}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} title="No direct reports" />
          )}
        </Card>
      </div>
    </div>
  );
}

function AttendanceTab({ employee }) {
  const queryClient = useQueryClient();
  const [sessionError, setSessionError] = useState('');
  const { data: records, isLoading, isError, refetch } = useQuery({
    queryKey: ['attendance-employee', String(employee.id)],
    queryFn: () => attendanceApi.byEmployee(employee.id),
  });

  const recordsList = Array.isArray(records) ? records : [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRecords = recordsList.filter((record) => record.punchTime?.slice(0, 10) === todayKey);
  const checkIn = todayRecords.find((record) => record.punchType === 'IN');
  const checkOut = todayRecords.find((record) => record.punchType === 'OUT');
  const sessionMutation = useMutation({
    mutationFn: () => (checkIn && !checkOut ? workSessionApi.stop() : workSessionApi.start('OFFICE')),
    onSuccess: () => {
      setSessionError('');
      queryClient.invalidateQueries({ queryKey: ['attendance-employee', String(employee.id)] });
    },
    onError: (error) => setSessionError(error.response?.data?.message || 'Attendance action could not be completed.'),
  });

  return (
    <div className="d-flex flex-column gap-3">
      <div className="hz-self-service-summary" aria-label="Today's attendance summary">
        <div><span>Today&apos;s status</span><strong>{checkOut ? 'Complete' : checkIn ? 'Checked in' : 'Not recorded'}</strong></div>
        <div><span>Check-in</span><strong>{checkIn ? new Date(checkIn.punchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</strong></div>
        <div><span>Check-out</span><strong>{checkOut ? new Date(checkOut.punchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</strong></div>
      </div>
      <div className="hz-self-service-action">
        <div><strong>{checkOut ? 'Your attendance is complete' : checkIn ? 'You are currently checked in' : 'Start your workday'}</strong><span>{checkOut ? 'Your work session has been recorded for today.' : 'Use the button to record your office work session.'}</span></div>
        {!checkOut && <Button size="sm" onClick={() => sessionMutation.mutate()} loading={sessionMutation.isPending}>{checkIn ? 'Check out' : 'Check in'}</Button>}
      </div>
      {sessionError && <div className="hz-inline-error" role="alert">{sessionError}</div>}
      <Card title="Attendance history" subtitle="Your recorded biometric punches" bodyClassName="p-0">
      {isLoading && (
        <div className="p-4">
          <SkeletonText lines={5} />
        </div>
      )}
      {isError && <ErrorState description="Couldn't load attendance records." onRetry={refetch} />}
      {!isLoading && !isError && recordsList.length === 0 && (
        <EmptyState icon={Clock} title="No punches recorded" description="Attendance records from biometric devices will show up here." />
      )}
      {!isLoading && !isError && recordsList.length > 0 && (
        <table className="table mb-0 align-middle hz-table" aria-label="Employee attendance history">
          <thead>
            <tr style={{ fontSize: 'var(--hz-text-xs)', color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>
              <th className="ps-4">Date</th>
              <th>Time</th>
              <th>Type</th>
              <th>Verify Mode</th>
              <th className="pe-4">Device</th>
            </tr>
          </thead>
          <tbody>
            {recordsList.map((r) => (
              <tr key={r.id}>
                <td className="ps-4" style={{ fontSize: 'var(--hz-text-sm)' }}>{new Date(r.punchTime).toLocaleDateString()}</td>
                <td style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>{new Date(r.punchTime).toLocaleTimeString()}</td>
                <td>
                  <Badge variant={r.punchType === 'IN' ? 'success' : r.punchType === 'OUT' ? 'danger' : 'neutral'}>{r.punchType}</Badge>
                </td>
                <td style={{ fontSize: 'var(--hz-text-sm)' }}>{r.verifyMode || '—'}</td>
                <td className="pe-4" style={{ fontSize: 'var(--hz-text-sm)' }}>{r.deviceName || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </Card>
    </div>
  );
}

function AssetsTab() {
  const { data: assets, isLoading, isError, refetch } = useQuery({
    queryKey: ['employee-assets'],
    queryFn: selfServiceApi.assets,
  });
  const records = Array.isArray(assets) ? assets : [];

  return (
    <Card title="My assets" subtitle="Company equipment assigned to you">
      {isLoading && <SkeletonText lines={4} />}
      {isError && <ErrorState description="Couldn’t load your assigned assets." onRetry={refetch} />}
      {!isLoading && !isError && records.length === 0 && <EmptyState icon={PackageOpen} title="No assets assigned" description="Company equipment will appear here when it is assigned to you." />}
      {!isLoading && !isError && records.length > 0 && <div className="hz-self-service-list">
        {records.map((asset) => <div className="hz-self-service-list__row" key={asset.id}>
          <span className="hz-self-service-list__icon"><PackageOpen size={18} /></span>
          <span><strong>{asset.assetType}</strong><small>{asset.assetTag || asset.description || 'Assigned company asset'}</small></span>
          <Badge variant={asset.status === 'RETURNED' ? 'neutral' : 'success'}>{asset.status || 'ASSIGNED'}</Badge>
        </div>)}
      </div>}
    </Card>
  );
}

function DocumentsTab({ employee, isEmployee }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [documentSearch, setDocumentSearch] = useState('');

  const { data: documents, isLoading, isError, refetch } = useQuery({
    queryKey: ['employee-documents', String(employee.id)],
    queryFn: () => documentsApi.byEmployee(employee.id),
  });

  const remove = useMutation({
    mutationFn: documentsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee-documents', String(employee.id)] }),
  });

  const today = new Date();
  const visibleDocuments = (documents || []).filter((document) => {
    const searchValue = documentSearch.trim().toLowerCase();
    if (!searchValue) return true;
    return [DOCUMENT_TYPE_LABEL[document.documentType], document.documentNumber, document.notes]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(searchValue));
  });
  function daysUntil(dateStr) {
    return Math.ceil((new Date(dateStr) - today) / 86400000);
  }
  function expiryTone(days) {
    if (days < 0) return { color: 'var(--hz-danger-600)', label: 'Expired' };
    if (days <= 30) return { color: 'var(--hz-warning-600)', label: `${days}d left` };
    return { color: 'var(--hz-text-secondary)', label: null };
  }

  return (
    <Card
      title="Documents"
      subtitle="ID proof, visas, certifications, and contracts on file"
      actions={
        !isEmployee && <Button size="sm" variant="secondary" icon={Plus} onClick={() => setShowAdd(true)}>Add Document</Button>
      }
      bodyClassName="p-0"
    >
      {!isLoading && !isError && (
        <div className="hz-mandatory-documents" aria-label="Mandatory employee documents">
          <div className="hz-mandatory-documents__heading">
            <div>
              <strong>Mandatory documents</strong>
              <span>Required employee records</span>
            </div>
            <span className="hz-mandatory-documents__count">
              {MANDATORY_DOCUMENTS.filter((required) => documents?.some((document) => document.documentType === required.type)).length}/{MANDATORY_DOCUMENTS.length} complete
            </span>
          </div>
          <div className="hz-mandatory-documents__grid">
            {MANDATORY_DOCUMENTS.map((required) => {
              const document = documents?.find((item) => item.documentType === required.type);
              const isPending = document?.status?.toUpperCase() === 'PENDING' || document?.status?.toUpperCase() === 'UNDER_REVIEW';
              const status = isPending ? 'Pending review' : document ? 'Uploaded' : 'Missing';
              return (
                <div key={required.type} className={`hz-mandatory-document hz-mandatory-document--${isPending ? 'pending' : document ? 'uploaded' : 'missing'}`}>
                  {document ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
                  <span>
                    <strong>{required.label}</strong>
                    <small>{status}</small>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!isLoading && !isError && documents?.length > 0 && (
        <div className="hz-profile-document-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={documentSearch} onChange={(event) => setDocumentSearch(event.target.value)} placeholder="Search documents" aria-label="Search employee documents" />
        </div>
      )}
      {isLoading && (
        <div className="p-4">
          <SkeletonText lines={4} />
        </div>
      )}
      {isError && <ErrorState description="Couldn't load documents." onRetry={refetch} />}
      {!isLoading && !isError && documents?.length === 0 && (
        <EmptyState icon={FileText} title="No documents on file yet" description={isEmployee ? 'Your documents will appear here once they are added to your employee record.' : 'Add mandatory records or track visas, certifications, and contracts.'} />
      )}
      {!isLoading && !isError && documents?.length > 0 && visibleDocuments.length === 0 && (
        <EmptyState icon={Search} title="No documents found" description={`Nothing matches "${documentSearch}".`} />
      )}
      {!isLoading && !isError && visibleDocuments.length > 0 && (
        <table className="table mb-0 align-middle hz-table" aria-label="Employee documents">
          <thead>
            <tr style={{ fontSize: 'var(--hz-text-xs)', color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>
              <th className="ps-4">Type</th>
              <th>Number</th>
              <th>Issued</th>
              <th>Expires</th>
              <th className="pe-4 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleDocuments.map((d) => {
              const days = daysUntil(d.expiryDate);
              const tone = expiryTone(days);
              return (
                <tr key={d.id}>
                  <td className="ps-4" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>
                    {DOCUMENT_TYPE_LABEL[d.documentType] || d.documentType}
                  </td>
                  <td style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>{d.documentNumber || '—'}</td>
                  <td style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                    {d.issueDate ? new Date(d.issueDate).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ fontSize: 'var(--hz-text-sm)' }}>
                    <span style={{ color: tone.color, fontWeight: tone.label ? 600 : 400 }}>
                      {new Date(d.expiryDate).toLocaleDateString()}
                      {tone.label && (
                        <>
                          {' '}
                          <AlertTriangle size={12} style={{ marginBottom: 2 }} /> {tone.label}
                        </>
                      )}
                    </span>
                  </td>
                  <td className="pe-4 text-end">
                    {!isEmployee && <button
                      className="btn btn-sm btn-light border-0"
                      style={{ color: 'var(--hz-danger-600)' }}
                      onClick={() => remove.mutate(d.id)}
                      disabled={remove.isPending}
                      aria-label={`Delete ${DOCUMENT_TYPE_LABEL[d.documentType] || d.documentType} record`}
                    >
                      <Trash2 size={14} />
                    </button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showAdd && !isEmployee && <AddDocumentModal employeeId={employee.id} onClose={() => setShowAdd(false)} />}
    </Card>
  );
}

function AddDocumentModal({ employeeId, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ documentType: 'ID_PROOF', documentNumber: '', issueDate: '', expiryDate: '', notes: '' });
  const [error, setError] = useState(null);

  const create = useMutation({
    mutationFn: documentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', String(employeeId)] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not add this document.'),
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    create.mutate({ ...form, employeeId, issueDate: form.issueDate || null, notes: form.notes || null });
  }

  return (
    <Dialog open onClose={onClose} title="Add Document" size="sm">
      <form onSubmit={handleSubmit}>
        {error && (
          <ErrorBanner>{error}</ErrorBanner>
        )}

        <FormField as="select" label="Document Type" required value={form.documentType} onChange={(v) => set('documentType', v)}>
          {Object.entries(DOCUMENT_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FormField>

        <FormField label="Document Number (optional)" value={form.documentNumber} onChange={(v) => set('documentNumber', v)} />

        <div className="row g-3 mb-3">
          <FormField col={6} label="Issue Date (optional)" type="date" value={form.issueDate} onChange={(v) => set('issueDate', v)} />
          <FormField col={6} label="Expiry Date" type="date" required value={form.expiryDate} onChange={(v) => set('expiryDate', v)} />
        </div>

        <FormField as="textarea" label="Notes (optional)" rows={2} value={form.notes} onChange={(v) => set('notes', v)} />

        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Add Document
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function LeaveTab({ employee }) {
  const year = new Date().getFullYear();
  const [showApply, setShowApply] = useState(false);
  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ['leave-balance', String(employee.id), year],
    queryFn: () => leaveRequestsApi.balance(employee.id, year),
  });
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['leave-requests-employee', String(employee.id)],
    queryFn: () => leaveRequestsApi.byEmployee(employee.id),
  });
  const leaveBalances = Array.isArray(balances) ? balances : [];
  const leaveRequests = Array.isArray(requests) ? requests : [];
  const pendingRequests = leaveRequests.filter((request) => request.status === 'PENDING').length;
  const totalRemaining = leaveBalances.reduce((total, balance) => total + (balance.remainingDays || 0), 0);
  const nextRequest = leaveRequests
    .filter((request) => request.startDate >= new Date().toISOString().slice(0, 10))
    .sort((first, second) => first.startDate.localeCompare(second.startDate))[0];
  const leaveChartData = leaveBalances.map((balance) => ({
    name: balance.leaveTypeName,
    available: balance.remainingDays || 0,
    consumed: balance.usedDays || 0,
  }));

  return (
    <div className="hz-employee-leave">
      <section className="hz-employee-leave__overview" aria-labelledby="leave-overview-title">
        <div>
          <span className="hz-dashboard__section-kicker">Time away</span>
          <h2 id="leave-overview-title">Leave overview</h2>
          <p>{year} balance and request history</p>
        </div>
        <div className="hz-employee-leave__overview-stats">
          <div><span>Available</span><strong>{balancesLoading ? '—' : `${totalRemaining} days`}</strong></div>
          <div><span>Pending</span><strong>{requestsLoading ? '—' : pendingRequests}</strong></div>
          <div><span>Next request</span><strong>{nextRequest ? new Date(nextRequest.startDate).toLocaleDateString() : 'None'}</strong></div>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setShowApply(true)}>Apply leave</Button>
      </section>

      <section className="hz-employee-leave__balances" aria-labelledby="leave-balances-title">
        <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Entitlement</span><h2 id="leave-balances-title">Leave balances</h2></div><span className="hz-employee-leave__year">{year}</span></div>
        {balancesLoading && <SkeletonText lines={3} />}
        {!balancesLoading && leaveBalances.length === 0 && <EmptyState title="No leave types configured" />}
        {!balancesLoading && leaveBalances.length > 0 && (
          <div className="hz-employee-leave__balance-grid">
            {leaveBalances.map((balance) => {
              const quota = balance.allocatedDays + balance.carriedForwardDays;
              const usedPercent = Math.min(100, Math.round((balance.usedDays / (quota || 1)) * 100));
              return <article className="hz-employee-leave__balance" key={balance.leaveTypeId}>
                <header><strong>{balance.leaveTypeName}</strong><span>View details</span></header>
                <div className="hz-employee-leave__balance-visual">
                  <div className="hz-employee-leave__balance-ring" style={{ '--hz-leave-used': `${usedPercent}%` }}>
                    <div><strong>{balance.remainingDays}</strong><small>days<br />available</small></div>
                  </div>
                  <div className="hz-employee-leave__balance-summary"><span>Usage</span><strong>{usedPercent}%</strong><small>{balance.usedDays || 0} of {quota} days</small></div>
                </div>
                <div className="hz-employee-leave__progress"><span style={{ width: `${usedPercent}%` }} /></div>
                <div className="hz-employee-leave__balance-stats"><span>Available<strong>{balance.remainingDays} days</strong></span><span>Consumed<strong>{balance.usedDays || 0} days</strong></span><span>Annual quota<strong>{quota || 0} days</strong></span><span>Carried forward<strong>{balance.carriedForwardDays || 0} days</strong></span></div>
              </article>;
            })}
          </div>
        )}
      </section>

      <section className="hz-employee-leave__analytics" aria-labelledby="leave-analytics-title">
        <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Plan your time</span><h2 id="leave-analytics-title">Leave usage</h2></div><span className="hz-employee-leave__chart-note">Available vs consumed</span></div>
        {leaveChartData.length > 0 ? <div className="hz-employee-leave__chart">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={leaveChartData} margin={{ top: 12, right: 12, left: -18, bottom: 8 }} barGap={8}>
              <CartesianGrid vertical={false} stroke="var(--hz-border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: 'var(--hz-text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--hz-text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'var(--hz-primary-50)' }} contentStyle={{ border: '1px solid var(--hz-border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="available" name="Available" fill="var(--hz-primary-500)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="consumed" name="Consumed" fill="var(--hz-accent-500)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div> : <div className="hz-employee-leave__chart-empty"><CalendarDays size={20} /><span>Leave usage will appear here when leave types are configured.</span></div>}
      </section>

      <section className="hz-employee-leave__history" aria-labelledby="leave-history-title">
        <div className="hz-dashboard__section-heading"><div><span className="hz-dashboard__section-kicker">Requests</span><h2 id="leave-history-title">Leave history</h2></div></div>
        {requestsLoading && <SkeletonText lines={4} />}
        {!requestsLoading && leaveRequests.length === 0 && <EmptyState icon={CalendarDays} title="No leave requests yet" description="Apply for leave to start your request history." />}
        {!requestsLoading && leaveRequests.length > 0 && <div className="hz-employee-leave__request-list">
          {leaveRequests.map((request) => {
            const meta = leaveStatusMeta(request.status);
            return <div key={request.id} className="hz-employee-leave__request">
              <div className="hz-employee-leave__request-date"><strong>{new Date(request.startDate).toLocaleDateString(undefined, { day: '2-digit' })}</strong><span>{new Date(request.startDate).toLocaleDateString(undefined, { month: 'short' })}</span></div>
              <div className="hz-employee-leave__request-copy"><strong>{request.leaveTypeName}</strong><span>{new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()} · {request.days} day(s)</span></div>
              <Badge variant={meta.variant} dot>{meta.label}</Badge>
            </div>;
          })}
        </div>}
      </section>
      {showApply && <ApplyLeaveModal defaultEmployeeId={employee.id} onClose={() => setShowApply(false)} />}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="d-flex align-items-center gap-2 py-2" style={{ borderBottom: '1px solid var(--hz-border)' }}>
      {Icon && <Icon size={15} style={{ color: 'var(--hz-text-muted)', flexShrink: 0 }} />}
      <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', minWidth: 110 }}>{label}</span>
      <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );
}
