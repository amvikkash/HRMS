import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { CalendarPlus, Check, X as XIcon, Calendar, Search } from 'lucide-react';
import { leaveRequestsApi } from '../../api/endpoints/leave';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonText } from '../../components/ui/Skeleton';
import ApplyLeaveModal from './ApplyLeaveModal';
import { leaveStatusMeta } from './leaveStatusMeta';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';
import Tabs from '../../components/ui/Tabs';

const TABS = [
  { key: 'PENDING', label: 'Pending Approval' },
  { key: '', label: 'All Requests' },
];

export default function LeaveRequests() {
  const [tab, setTab] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [showApply, setShowApply] = useState(false);
  const [decision, setDecision] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const toast = useToast();

  if (!hasPermission('LEAVE_APPROVE') && !hasPermission('LEAVE_MANAGE')) return <Navigate to="/my-profile?tab=leave" replace />;

  // A Manager (LEAVE_APPROVE without the broader LEAVE_MANAGE HR/Admin
  // hold) should only see their own team's requests here - the plain
  // listAll endpoint is org-wide and gated on LEAVE_VIEW, which MANAGER
  // also has, so calling it directly would show every employee's leave
  // company-wide. Same distinction already used for the Dashboard's My
  // Team widget, applied here since this page is the one people actually
  // use day-to-day.
  const isTeamScoped = hasPermission('LEAVE_APPROVE') && !hasPermission('LEAVE_MANAGE');

  const { data: requests, isLoading, isError, refetch } = useQuery({
    queryKey: ['leave-requests', tab, isTeamScoped],
    queryFn: () => (isTeamScoped ? leaveRequestsApi.teamList(tab || undefined) : leaveRequestsApi.list(tab || undefined)),
  });

  // Client-side, not a new backend query param: the endpoint already
  // returns the full list for the selected status tab (no pagination
  // exists here), so there's no extra request to make - just narrowing
  // what's already in memory. "All Requests" with no way to find one
  // employee's history was the real gap; this fixes that without
  // needing a backend change.
  const filteredRequests = useMemo(() => {
    if (!requests || !search.trim()) return requests;
    const q = search.trim().toLowerCase();
    return requests.filter(
      (r) =>
        r.employeeName?.toLowerCase().includes(q) ||
        r.leaveTypeName?.toLowerCase().includes(q) ||
        r.departmentName?.toLowerCase().includes(q)
    );
  }, [requests, search]);

  const decide = useMutation({
    mutationFn: ({ id, approve, note }) => (approve ? leaveRequestsApi.approve(id, note) : leaveRequestsApi.reject(id, note)),
    onSuccess: () => {
      setDecision(null);
      setDecisionNote('');
      toast.success('Leave request updated.');
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-my-team'] });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Could not update the leave request.'),
  });

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader
        eyebrow="Workforce"
        title="Leave"
        description={isTeamScoped ? "Your team's requests, approvals, and balances" : 'Requests, approvals, and balances'}
        actions={<Button icon={CalendarPlus} onClick={() => setShowApply(true)}>Apply Leave</Button>}
      />

      {!isLoading && !isError && requests && (
        <div className="hz-inline-summary" aria-label="Leave request summary">
          <InlineSummary label="Total requests" value={requests.length} />
          <InlineSummary label="Pending" value={requests.filter((request) => request.status === 'PENDING').length} tone="warning" />
          <InlineSummary label="Approved" value={requests.filter((request) => request.status === 'APPROVED').length} tone="success" />
          <InlineSummary label="Rejected" value={requests.filter((request) => request.status === 'REJECTED').length} tone="danger" />
        </div>
      )}

      <FilterBar className="hz-leave-toolbar justify-content-between">
        <Tabs items={TABS} value={tab} onChange={setTab} ariaLabel="Leave request status" />
        <div className="position-relative mb-2" style={{ width: 240 }}>
          <Search size={14} className="position-absolute" style={{ left: 10, top: 9, color: 'var(--hz-text-muted)' }} />
          <input
            type="search"
            placeholder="Filter by name, type, dept…"
            aria-label="Filter leave requests by employee, type, or department"
            className="form-control form-control-sm ps-4"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </FilterBar>

      <Card bodyClassName="p-0">
        {isLoading && (
          <div className="p-4">
            <SkeletonText lines={6} />
          </div>
        )}

        {isError && <ErrorState description="Couldn't load leave requests." onRetry={refetch} />}

        {!isLoading && !isError && filteredRequests?.length === 0 && (
          <EmptyState
            icon={Calendar}
            title={search ? 'No matches' : tab === 'PENDING' ? 'Nothing pending' : 'No leave requests yet'}
            description={
              search
                ? `Nothing matches "${search}"`
                : tab === 'PENDING'
                ? isTeamScoped
                  ? 'None of your direct reports have pending requests.'
                  : 'New requests will show up here for approval.'
                : 'Apply for leave to get started.'
            }
          />
        )}

        {!isLoading && !isError && filteredRequests?.length > 0 && (
          <div className="table-responsive">
            <table className="table mb-0 align-middle hz-table" aria-label="Leave requests">
            <thead>
              <tr style={{ fontSize: 'var(--hz-text-xs)', color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>
                <th className="ps-4">Employee</th>
                <th>Leave Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                <th className="pe-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r) => {
                const meta = leaveStatusMeta(r.status);
                return (
                  <tr key={r.id}>
                    <td className="ps-4">
                      <Link to={`/employees/${r.employeeId}`} className="d-flex align-items-center gap-2 text-decoration-none">
                        <Avatar name={r.employeeName} size="sm" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>{r.employeeName}</div>
                          <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{r.departmentName || '—'}</div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ fontSize: 'var(--hz-text-sm)' }}>{r.leaveTypeName}</td>
                    <td style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                      {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: 'var(--hz-text-sm)' }}>{r.days}</td>
                    <td>
                      <StatusBadge status={r.status} variant={meta.variant} dot>{meta.label}</StatusBadge>
                    </td>
                    <td className="pe-4 text-end">
                      {r.status === 'PENDING' && (
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            className="btn btn-sm btn-light border-0"
                            style={{ color: 'var(--hz-success-600)' }}
                            onClick={() => setDecision({ id: r.id, approve: true, employeeName: r.employeeName })}
                            disabled={decide.isPending}
                            aria-label={`Approve ${r.employeeName}'s leave request`}
                          >
                            <Check size={15} />
                          </button>
                          <button
                            className="btn btn-sm btn-light border-0"
                            style={{ color: 'var(--hz-danger-600)' }}
                            onClick={() => setDecision({ id: r.id, approve: false, employeeName: r.employeeName })}
                            disabled={decide.isPending}
                            aria-label={`Reject ${r.employeeName}'s leave request`}
                          >
                            <XIcon size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </Card>

      {showApply && <ApplyLeaveModal onClose={() => setShowApply(false)} />}
      <Dialog open={!!decision} onClose={() => setDecision(null)} title={decision?.approve ? 'Approve leave request' : 'Reject leave request'} description={`${decision?.employeeName || 'This employee'} · add context for the request record.`}>
        <form onSubmit={(event) => { event.preventDefault(); decide.mutate({ ...decision, note: decisionNote.trim() || undefined }); }}>
          <FormField as="textarea" label={decision?.approve ? 'Approval note (optional)' : 'Rejection reason'} required={!decision?.approve} rows={4} value={decisionNote} onChange={setDecisionNote} placeholder={decision?.approve ? 'Add a note for the employee...' : 'Explain why this request cannot be approved...'} />
          <div className="d-flex justify-content-end gap-2 mt-3"><Button type="button" variant="secondary" onClick={() => setDecision(null)}>Cancel</Button><Button type="submit" variant={decision?.approve ? 'primary' : 'danger'} loading={decide.isPending}>{decision?.approve ? 'Approve request' : 'Reject request'}</Button></div>
        </form>
      </Dialog>
    </div>
  );
}

function InlineSummary({ label, value, tone = 'neutral' }) {
  return <div className={`hz-inline-summary__item hz-inline-summary__item--${tone}`}><strong>{value}</strong><span>{label}</span></div>;
}
