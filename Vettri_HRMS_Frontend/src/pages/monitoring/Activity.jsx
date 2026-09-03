import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, Activity as ActivityIcon } from 'lucide-react';
import {
  monitoringApi,
  getSessionId,
  getSessionEmployeeName,
  getSessionDeviceName,
  getSessionApp,
  getSessionWindowTitle,
  getSessionStart,
  getSessionEnd,
  getSessionDurationSeconds,
} from '../../api/endpoints/monitoring';
import { employeesApi } from '../../api/endpoints/employees';
import { formatDateTimeIST, formatDurationShort, toISTDateInputValue, istDateInputToUtcRange } from '../../utils/formatDateTime';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import PageHeader from '../../components/ui/PageHeader';

const PAGE_SIZE = 25;

export default function Activity() {
  const today = toISTDateInputValue();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [employeeId, setEmployeeId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.list() });

  const { from } = istDateInputToUtcRange(dateFrom);
  const { to } = istDateInputToUtcRange(dateTo);

  // The by-employee endpoint doesn't accept a date range, so when an
  // employee is selected we fetch all of their sessions and apply the date
  // filter client-side; otherwise we ask the backend to filter by range
  // directly via /api/monitoring/sessions.
  const {
    data: sessionsPage,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['monitoring-sessions-search', from, to, employeeId, search, page],
    queryFn: () => monitoringApi.searchSessions({ from, to, employeeId: employeeId || undefined, windowTitle: search.trim() || undefined, page, size: PAGE_SIZE }),
    refetchInterval: 30_000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return (sessionsPage?.content || [])
      .filter((s) => !q || [getSessionEmployeeName(s), getSessionDeviceName(s), getSessionApp(s)].join(' ').toLowerCase().includes(q))
      .sort((a, b) => new Date(getSessionStart(b)) - new Date(getSessionStart(a)));
  }, [sessionsPage, search]);

  const totalElements = sessionsPage?.totalElements || 0;
  const totalPages = Math.max(sessionsPage?.totalPages || 0, 1);
  const pageRows = filtered;

  function updateFilter(setter) {
    return (value) => {
      setter(value);
      setPage(0);
    };
  }

  const columns = [
    { key: 'employee', label: 'Employee', headerClassName: 'ps-4', className: 'ps-4', render: (s) => getSessionEmployeeName(s), style: { fontWeight: 600 } },
    { key: 'device', label: 'Device', render: (s) => getSessionDeviceName(s) },
    { key: 'application', label: 'Application', render: (s) => getSessionApp(s) },
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
      <PageHeader eyebrow="Monitoring" title="Activity" description="Application and window activity sessions reported by the monitoring agents" />

      <div className="d-flex align-items-center gap-2 flex-wrap">
        <div className="position-relative" style={{ maxWidth: 320, width: '100%' }}>
          <Search size={16} className="position-absolute" style={{ left: 12, top: 10, color: 'var(--hz-text-muted)' }} />
          <input
            type="search"
            placeholder="Search employee, app, window, device…"
            className="form-control ps-5"
            value={search}
            onChange={(e) => updateFilter(setSearch)(e.target.value)}
          />
        </div>

        <select className="form-select" style={{ maxWidth: 220 }} value={employeeId} onChange={(e) => updateFilter(setEmployeeId)(e.target.value)}>
          <option value="">All Employees</option>
          {(employees || []).map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.fullName}
            </option>
          ))}
        </select>

        <div className="d-flex align-items-center gap-2">
          <input type="date" className="form-control" style={{ maxWidth: 160 }} value={dateFrom} max={dateTo} onChange={(e) => updateFilter(setDateFrom)(e.target.value)} />
          <span style={{ color: 'var(--hz-text-muted)', fontSize: 'var(--hz-text-sm)' }}>to</span>
          <input type="date" className="form-control" style={{ maxWidth: 160 }} value={dateTo} min={dateFrom} onChange={(e) => updateFilter(setDateTo)(e.target.value)} />
        </div>
      </div>

      <Card bodyClassName="p-0">
        <Table
          columns={columns}
          rows={pageRows}
          getRowKey={(s) => getSessionId(s)}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyIcon={ActivityIcon}
          emptyTitle={search || employeeId ? 'No matching activity' : 'No activity in this range'}
          emptyDescription="Try widening the date range, or clearing the search and employee filters."
        />

        {!isLoading && !isError && totalElements > 0 && (
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderTop: '1px solid var(--hz-border)' }}>
            <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)' }}>
              {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalElements)} of {totalElements}
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
                Page {page + 1} of {totalPages}
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
    </div>
  );
}
