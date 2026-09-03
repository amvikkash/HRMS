import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Download, ArrowUpDown, PlusCircle, Users } from 'lucide-react';
import { employeeSalaryApi } from '../../api/endpoints/salary';
import { departmentsApi } from '../../api/endpoints/organization';
import { SELECTABLE_STATUSES, statusMeta } from '../employees/statusMeta';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import { exportToCsv } from '../../utils/exportToCsv';
import PayrollStatusBadge from './components/PayrollStatusBadge';
import AssignSalaryStructureModal from './components/AssignSalaryStructureModal';

const PAGE_SIZE = 10;

export default function EmployeeSalaryList() {
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('employeeName');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [assigningFor, setAssigningFor] = useState(null);

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['salary-employees', search, departmentId, status, sortBy, sortDir, page],
    queryFn: () => employeeSalaryApi.list({ search, departmentId: departmentId || undefined, status: status || undefined, sortBy, sortDir, page, size: PAGE_SIZE }),
  });

  const rows = data?.content || [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  function toggleSort(column) {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(0);
  }

  function handleExport() {
    exportToCsv(
      `employee-salary-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => ({
        'Employee ID': r.employeeCode,
        'Employee Name': r.employeeName,
        Department: r.departmentName || '',
        Designation: r.designationTitle || '',
        'Basic Salary': r.basicSalary,
        'Gross Salary': r.grossSalary,
        'Net Salary': r.netSalary,
        'Payroll Status': r.payrollStatus,
        'Last Payroll Date': r.lastPayrollDate || '',
      }))
    );
  }

  const columns = useMemo(
    () => [
      { key: 'employeeName', label: 'Employee' },
      { key: 'department', label: 'Department' },
      { key: 'basicSalary', label: 'Basic Salary' },
      { key: 'grossSalary', label: 'Gross Salary' },
      { key: 'netSalary', label: 'Net Salary' },
      { key: 'payrollStatus', label: 'Payroll Status' },
      { key: 'lastPayrollDate', label: 'Last Payroll Date' },
    ],
    []
  );

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div>
          <h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 4 }}>Employee Salary</h1>
          <p className="text-secondary-hz mb-0" style={{ fontSize: 'var(--hz-text-sm)' }}>
            {totalElements} employee{totalElements === 1 ? '' : 's'} in the payroll roster
          </p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={handleExport} disabled={rows.length === 0}>
            <Download size={16} /> Export
          </button>
          <Link to="/salary/structure" className="btn btn-primary d-inline-flex align-items-center gap-2">
            <PlusCircle size={16} /> Define Structure
          </Link>
        </div>
      </div>

      <Card bodyClassName="p-3">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text" style={{ background: 'var(--hz-gray-50)', border: '1px solid var(--hz-border)', borderRight: 'none' }}>
                <Search size={15} style={{ color: 'var(--hz-text-muted)' }} />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, code or email…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-6 col-md-4">
            <select
              className="form-select"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Any Employment Status</option>
              {SELECTABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusMeta(s).label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {isError && <ErrorState description="Couldn't load the salary list." onRetry={refetch} />}

      {!isError && (
        <Card bodyClassName="p-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ fontSize: 'var(--hz-text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hz-border)' }}>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className="px-3 py-3 text-secondary-hz"
                      style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onClick={() => toggleSort(c.key)}
                    >
                      <span className="d-inline-flex align-items-center gap-1">
                        {c.label}
                        <ArrowUpDown size={12} style={{ opacity: sortBy === c.key ? 1 : 0.35 }} />
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-3 py-3">
                          <Skeleton height={14} />
                        </td>
                      ))}
                    </tr>
                  ))}
                {!isLoading &&
                  rows.map((r) => (
                    <tr key={r.employeeId} style={{ borderBottom: '1px solid var(--hz-border)' }}>
                      <td className="px-3 py-3">
                        <Link to={`/salary/employees/${r.employeeId}`} className="d-flex align-items-center gap-2 text-decoration-none">
                          <Avatar name={r.employeeName} src={r.profilePhotoUrl} size="sm" />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--hz-text-primary)' }}>{r.employeeName}</div>
                            <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{r.employeeCode}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <div>{r.departmentName || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{r.designationTitle || ''}</div>
                      </td>
                      <td className="px-3 py-3">{formatCurrency(r.basicSalary)}</td>
                      <td className="px-3 py-3">{formatCurrency(r.grossSalary)}</td>
                      <td className="px-3 py-3" style={{ fontWeight: 600 }}>
                        {formatCurrency(r.netSalary)}
                      </td>
                      <td className="px-3 py-3">
                        <PayrollStatusBadge status={r.payrollStatus} />
                      </td>
                      <td className="px-3 py-3">{r.lastPayrollDate ? new Date(r.lastPayrollDate).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-3 text-end">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setAssigningFor(r)}>
                          {r.structureConfigured ? 'Revise' : 'Assign'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {!isLoading && rows.length === 0 && (
            <div className="p-4">
              <EmptyState icon={Users} title="No employees match these filters" description="Try clearing the search or filters above." />
            </div>
          )}

          {!isLoading && totalPages > 1 && (
            <div className="d-flex align-items-center justify-content-between p-3" style={{ borderTop: '1px solid var(--hz-border)' }}>
              <span style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>
                Page {page + 1} of {totalPages}
              </span>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Previous
                </button>
                <button className="btn btn-sm btn-outline-secondary" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {assigningFor && (
        <AssignSalaryStructureModal
          employee={assigningFor}
          onClose={(saved) => {
            setAssigningFor(null);
            if (saved) refetch();
          }}
        />
      )}
    </div>
  );
}
