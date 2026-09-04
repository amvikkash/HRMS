import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, UserPlus, FileSpreadsheet, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { employeesApi } from '../../api/endpoints/employees';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Table from '../../components/ui/Table';
import CreateEmployeeModal from './CreateEmployeeModal';
import { statusMeta, EMPLOYMENT_TYPE_LABEL } from './statusMeta';
import PageHeader from '../../components/ui/PageHeader';
import FilterBar from '../../components/ui/FilterBar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const COLUMNS = [
  {
    key: 'employee',
    label: 'Employee',
    headerClassName: 'ps-4',
    className: 'ps-4',
    render: (emp) => (
      <Link to={`/employees/${emp.id}`} className="d-flex align-items-center gap-2 text-decoration-none">
        <Avatar name={emp.fullName} size="sm" />
        <div>
          <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>
            {emp.fullName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{emp.employeeCode}</div>
        </div>
      </Link>
    ),
  },
  { key: 'department', label: 'Department', render: (emp) => emp.departmentName || '—' },
  { key: 'designation', label: 'Designation', render: (emp) => emp.designationTitle || '—' },
  { key: 'manager', label: 'Manager', render: (emp) => emp.reportingManagerName || '—' },
  {
    key: 'type',
    label: 'Type',
    render: (emp) => EMPLOYMENT_TYPE_LABEL[emp.employmentType] || emp.employmentType,
  },
  {
    key: 'status',
    label: 'Status',
    render: (emp) => {
      const meta = statusMeta(emp.status);
      return <StatusBadge status={emp.status} variant={meta.variant} dot>{meta.label}</StatusBadge>;
    },
  },
  {
    key: 'joined',
    label: 'Joined',
    headerClassName: 'pe-4',
    className: 'pe-4',
    render: (emp) => (emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : '—'),
    style: { color: 'var(--hz-text-secondary)' },
  },
];

export default function EmployeeList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const departmentId = searchParams.get('departmentId');
  const departmentName = searchParams.get('departmentName');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState(null);
  const queryClient = useQueryClient();
  const pageSize = 25;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['employees-paged', search, page, departmentId],
    queryFn: () => employeesApi.listPaged(search, page, pageSize, departmentId),
  });

  const employees = data?.content;
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const bulkUpdate = useMutation({
    mutationFn: async () => Promise.all(Array.from(selectedIds).map((id) => employeesApi.updateStatus(id, bulkStatus))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees-paged'] });
      setSelectedIds(new Set());
      setBulkStatus(null);
    },
  });

  function handleSearchChange(value) {
    setSearch(value);
    setPage(0); // any new search starts back at page 1 - stale offsets into a different result set make no sense
  }

  function clearDepartmentFilter() {
    setSearchParams({});
    setPage(0);
  }

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader
        eyebrow="Workforce"
        title="Employees"
        description="Your organization's people, all in one place"
        actions={<div className="d-flex gap-2"><Link to="/employees/import" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2"><FileSpreadsheet size={16} /> Import Employees</Link><Button icon={UserPlus} onClick={() => setShowCreate(true)}>Onboard Employee</Button></div>}
      />

      <FilterBar>
        <div className="position-relative" style={{ maxWidth: 360, width: '100%' }}>
          <Search size={16} className="position-absolute" style={{ left: 12, top: 10, color: 'var(--hz-text-muted)' }} />
          <input
            type="search"
            placeholder="Search by name, code, or email…"
            aria-label="Search employees by name, code, or email"
            className="form-control ps-5"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {departmentId && (
          <div
            className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded-3"
            style={{ background: 'var(--hz-primary-50)', border: '1px solid var(--hz-primary-100)' }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--hz-primary-700)' }}>
              Department: {departmentName || departmentId}
            </span>
            <button
              type="button"
              onClick={clearDepartmentFilter}
              className="btn btn-link p-0 d-flex align-items-center"
              style={{ color: 'var(--hz-primary-700)' }}
              aria-label="Clear department filter"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </FilterBar>

      {selectedIds.size > 0 && <div className="hz-bulk-toolbar" role="toolbar" aria-label="Bulk employee actions">
        <strong>{selectedIds.size} selected</strong>
        <Button size="sm" variant="secondary" onClick={() => setBulkStatus('Active')}>Mark active</Button>
        <Button size="sm" variant="secondary" onClick={() => setBulkStatus('On Leave')}>Mark on leave</Button>
        <button type="button" className="btn btn-link btn-sm" onClick={() => setSelectedIds(new Set())}>Clear selection</button>
      </div>}

      <Card bodyClassName="p-0">
        <Table
          columns={COLUMNS}
          rows={employees}
          getRowKey={(emp) => emp.id}
          selectable
          selectedKeys={selectedIds}
          onToggleRow={(emp) => setSelectedIds((current) => { const next = new Set(current); if (next.has(emp.id)) next.delete(emp.id); else next.add(emp.id); return next; })}
          onToggleAll={(checked) => setSelectedIds(checked ? new Set((employees || []).map((emp) => emp.id)) : new Set())}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyTitle={search ? 'No matches' : 'No employees yet'}
          emptyDescription={search ? `Nothing matches "${search}"` : 'Onboard your first employee to populate the directory.'}
        />

        {!isLoading && !isError && totalElements > 0 && (
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderTop: '1px solid var(--hz-border)' }}>
            <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)' }}>
              {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
            </span>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="hz-icon-btn d-flex align-items-center justify-content-center border-0"
                style={{ width: 32, height: 32 }}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page === 0}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                Page {page + 1} of {Math.max(totalPages, 1)}
              </span>
              <button
                type="button"
                className="hz-icon-btn d-flex align-items-center justify-content-center border-0"
                style={{ width: 32, height: 32 }}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
                disabled={page >= totalPages - 1}
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {showCreate && <CreateEmployeeModal onClose={() => setShowCreate(false)} />}
      <ConfirmDialog open={!!bulkStatus} onClose={() => setBulkStatus(null)} onConfirm={() => bulkUpdate.mutate()} loading={bulkUpdate.isPending} title={`Mark ${selectedIds.size} employees ${bulkStatus?.toLowerCase()}?`} description="This will update the employment status for every selected employee." confirmLabel="Update status" />
    </div>
  );
}
