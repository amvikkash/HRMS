import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../../api/endpoints/employees';
import { leaveRequestsApi } from '../../api/endpoints/leave';
import { attendanceApi } from '../../api/endpoints/attendance';
import { documentsApi, DOCUMENT_TYPE_LABEL, MANDATORY_DOCUMENTS } from '../../api/endpoints/documents';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, Users, ChevronDown, Fingerprint, Pencil, Check, X, CalendarDays, Clock, FileText, Plus, Trash2, AlertTriangle, Network, ClipboardList, PackageOpen, Search, Send, UserX, CheckCircle2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
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
    <div className="hz-profile d-flex flex-column gap-4">
      <Link to="/employees" className="d-inline-flex align-items-center gap-1 text-decoration-none" style={{ color: 'var(--hz-text-secondary)', fontSize: 'var(--hz-text-sm)', width: 'fit-content' }}>
        <ArrowLeft size={15} /> Back to Employees
      </Link>

      <Card className="hz-profile__identity-card">
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <Avatar name={employee.fullName} size="xl" />
            <div className="hz-profile__identity-copy">
              <div className="d-flex align-items-center gap-2">
                <h1 style={{ fontSize: 'var(--hz-text-xl)', fontWeight: 700, margin: 0 }}>{employee.fullName}</h1>
                <Badge variant={meta.variant} dot>
                  {meta.label}
                </Badge>
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
                      <Badge variant={val.variant} dot>
                        {val.label}
                      </Badge>
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
          <ProfileSummary label="Joined" value={employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : 'Not set'} />
          <ProfileSummary label="Reports" value={`${employee.directReports?.length || 0} direct reports`} />
          <ProfileSummary label="Employment" value={EMPLOYMENT_TYPE_LABEL[employee.employmentType] || employee.employmentType || 'Not set'} />
        </div>
        <div className="hz-profile-contact-strip">
          <ProfileContact icon={Mail} label="Email" value={employee.email} />
          <ProfileContact icon={Phone} label="Phone" value={employee.phone} />
          <ProfileContact icon={MapPin} label="Location" value={employee.address} />
          <ProfileContact icon={Users} label="Department" value={employee.departmentName} />
        </div>
      </Card>

      <Tabs items={availableTabs} value={tab} onChange={changeTab} />

      {tab === 'overview' && <OverviewTab employee={employee} />}
      {tab === 'job' && <JobTab employee={employee} />}
      {tab === 'hierarchy' && <HierarchyTab employee={employee} />}
      {tab === 'attendance' && <AttendanceTab employee={employee} />}
      {tab === 'leave' && <LeaveTab employee={employee} />}
      {tab === 'documents' && <DocumentsTab employee={employee} />}
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

function OverviewTab({ employee }) {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [editingBiometric, setEditingBiometric] = useState(false);
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
    <div className="row g-3">
      <div className="col-12">
        <Card title="Account" subtitle="Login access for this employee">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div><InfoRow icon={Mail} label="Email" value={employee.email} /><InfoRow label="Employee ID" value={employee.employeeCode} /></div>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Badge variant={accountStatus === 'ACTIVE' ? 'success' : accountStatus === 'DISABLED' ? 'danger' : 'warning'} dot>{accountStatus}</Badge>
              {accountStatus !== 'ACTIVE' && accountStatus !== 'DISABLED' && <Button size="sm" icon={Send} loading={sendInvitation.isPending} onClick={() => sendInvitation.mutate()}>{sendInvitation.isPending ? 'Sending' : 'Resend Invitation'}</Button>}
              {accountStatus === 'ACTIVE' && <Button size="sm" variant="danger" icon={UserX} loading={disableAccount.isPending} onClick={() => disableAccount.mutate()}>Disable Account</Button>}
            </div>
          </div>
          {(sendInvitation.isError || disableAccount.isError) && <div className="mt-3 text-danger small">{sendInvitation.error?.response?.data?.message || disableAccount.error?.response?.data?.message || 'Account action failed.'}</div>}
        </Card>
      </div>
      <div className="col-12 col-lg-6">
        <Card title="Contact">
          <InfoRow icon={Mail} label="Email" value={employee.email} />
          <InfoRow icon={Phone} label="Phone" value={employee.phone} />
          <InfoRow icon={MapPin} label="Address" value={employee.address} />
        </Card>
      </div>
      <div className="col-12 col-lg-6">
        <Card title="Employment">
          <InfoRow icon={Calendar} label="Date of Joining" value={employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString() : null} />
          <InfoRow icon={Briefcase} label="Employment Type" value={EMPLOYMENT_TYPE_LABEL[employee.employmentType] || employee.employmentType} />
          <InfoRow icon={Users} label="Team" value={employee.teamName} />
        </Card>
      </div>
      <div className="col-12 col-lg-6">
        <Card title="Personal">
          <InfoRow icon={Calendar} label="Date of Birth" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : null} />
          <InfoRow label="Gender" value={employee.gender} />
        </Card>
      </div>
      <div className="col-12 col-lg-6">
        <Card title="Emergency Contact">
          <InfoRow label="Name" value={employee.emergencyContactName} />
          <InfoRow icon={Phone} label="Phone" value={employee.emergencyContactPhone} />
        </Card>
      </div>
      <div className="col-12 col-lg-6">
        <Card title="Biometric Enrollment" subtitle="The PIN this employee is enrolled under on the fingerprint device">
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
        </Card>
      </div>
    </div>
  );
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

function AssetsTab() {
  return (
    <Card className="hz-profile-empty-card">
      <EmptyState icon={PackageOpen} title="No assets are present yet" description="Asset assignments will appear here when an asset is assigned to this employee." />
    </Card>
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
  const { data: records, isLoading, isError, refetch } = useQuery({
    queryKey: ['attendance-employee', String(employee.id)],
    queryFn: () => attendanceApi.byEmployee(employee.id),
  });

  return (
    <Card title="Punch History" bodyClassName="p-0">
      {isLoading && (
        <div className="p-4">
          <SkeletonText lines={5} />
        </div>
      )}
      {isError && <ErrorState description="Couldn't load attendance records." onRetry={refetch} />}
      {!isLoading && !isError && records?.length === 0 && (
        <EmptyState icon={Clock} title="No punches recorded" description="Attendance records from biometric devices will show up here." />
      )}
      {!isLoading && !isError && records?.length > 0 && (
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
            {records.map((r) => (
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
  );
}

function DocumentsTab({ employee }) {
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
        <EmptyState icon={FileText} title="No optional documents on file" description="Use Add Document to add the mandatory records or track visas, certifications, and contracts." />
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
                    <button
                      className="btn btn-sm btn-light border-0"
                      style={{ color: 'var(--hz-danger-600)' }}
                      onClick={() => remove.mutate(d.id)}
                      disabled={remove.isPending}
                      aria-label={`Delete ${DOCUMENT_TYPE_LABEL[d.documentType] || d.documentType} record`}
                    >
                      <Trash2 size={14} />
                    </button>
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
          <div className="mb-3 px-3 py-2" style={{ background: 'var(--hz-danger-50)', color: 'var(--hz-danger-600)', borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
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
  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ['leave-balance', String(employee.id), year],
    queryFn: () => leaveRequestsApi.balance(employee.id, year),
  });
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['leave-requests-employee', String(employee.id)],
    queryFn: () => leaveRequestsApi.byEmployee(employee.id),
  });

  return (
    <div className="row g-3">
      <div className="col-12 col-lg-5">
        <Card title="Leave Balance" subtitle={`${year}`}>
          {balancesLoading && <SkeletonText lines={3} />}
          {!balancesLoading && balances?.length === 0 && <EmptyState title="No leave types configured" />}
          {!balancesLoading &&
            balances?.map((b) => (
              <div key={b.leaveTypeId} className="py-2" style={{ borderBottom: '1px solid var(--hz-border)' }}>
                <div className="d-flex justify-content-between mb-1">
                  <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>{b.leaveTypeName}</span>
                  <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                    {b.remainingDays} / {b.allocatedDays + b.carriedForwardDays}
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--hz-gray-100)' }}>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 999,
                      width: `${Math.min(100, Math.round((b.usedDays / (b.allocatedDays + b.carriedForwardDays || 1)) * 100))}%`,
                      background: 'var(--hz-primary-500)',
                    }}
                  />
                </div>
              </div>
            ))}
        </Card>
      </div>
      <div className="col-12 col-lg-7">
        <Card title="Request History">
          {requestsLoading && <SkeletonText lines={4} />}
          {!requestsLoading && requests?.length === 0 && (
            <EmptyState icon={CalendarDays} title="No leave requests yet" />
          )}
          {!requestsLoading && requests?.length > 0 && (
            <div className="d-flex flex-column gap-3">
              {requests.map((r) => {
                const meta = leaveStatusMeta(r.status);
                return (
                  <div key={r.id} className="d-flex align-items-center justify-content-between">
                    <div>
                      <div style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>{r.leaveTypeName}</div>
                      <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>
                        {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()} · {r.days} day(s)
                      </div>
                    </div>
                    <Badge variant={meta.variant} dot>
                      {meta.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
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
