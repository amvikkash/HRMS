import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, Users, Clock, CalendarDays, Briefcase, Bookmark, Plus, X, Filter, RefreshCcw } from 'lucide-react';
import { BarChart, Bar as RechartsBar, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { reportsApi } from '../../api/endpoints/reports';
import { exportToCsv } from '../../utils/exportToCsv';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import FilterBar from '../../components/ui/FilterBar';
import StatCard from '../../components/ui/StatCard';
import ChartCard from '../../components/ui/ChartCard';
import ExportMenu from '../../components/ui/ExportMenu';

const TABS = [
  { key: 'employees', label: 'Employee', icon: Users },
  { key: 'attendance', label: 'Attendance', icon: Clock },
  { key: 'leave', label: 'Leave', icon: CalendarDays },
  { key: 'recruitment', label: 'Recruitment', icon: Briefcase },
];

const TAB_LABEL = Object.fromEntries(TABS.map((t) => [t.key, t.label]));
const SAVED_REPORTS_KEY = 'hz.reports.saved';

/**
 * Personal, per-browser saved filter presets - a named {tab + filters}
 * combination the person can jump back to in one click instead of
 * re-picking a date range or year each time. Kept in localStorage rather
 * than a new backend entity: this is pure UI convenience state, nobody
 * else needs to see what reports a given person has bookmarked, and it
 * follows the same reasoning (and the same pattern) as favorites/recents
 * in NavMemoryContext.
 */
function useSavedReports() {
  const [saved, setSaved] = useState(() => {
    try {
      const raw = window.localStorage.getItem(SAVED_REPORTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  function persist(next) {
    setSaved(next);
    try {
      window.localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(next));
    } catch {
      // Private-browsing/quota-exceeded: degrading to session-only is fine for a convenience feature.
    }
  }

  function save(name, view) {
    persist([...saved, { id: Date.now(), name, view }]);
  }

  function remove(id) {
    persist(saved.filter((r) => r.id !== id));
  }

  return { saved, save, remove };
}

function SavedReportsBar({ currentView, onRestore }) {
  const { saved, save, remove } = useSavedReports();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');

  function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    save(name.trim(), currentView);
    setName('');
    setNaming(false);
  }

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      {saved.length > 0 && (
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {saved.map((r) => (
            <div
              key={r.id}
              className="d-flex align-items-center gap-1 px-2 py-1 rounded-3"
              style={{ background: 'var(--hz-gray-50)', border: '1px solid var(--hz-border)' }}
            >
              <button
                type="button"
                onClick={() => onRestore(r.view)}
                className="btn btn-link p-0 d-flex align-items-center gap-1 text-decoration-none"
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--hz-text-primary)' }}
                title={`${TAB_LABEL[r.view.tab]} report`}
              >
                <Bookmark size={12} /> {r.name}
              </button>
              <button
                type="button"
                onClick={() => remove(r.id)}
                className="btn btn-link p-0 d-flex align-items-center"
                style={{ color: 'var(--hz-text-muted)' }}
                aria-label={`Remove saved report "${r.name}"`}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setNaming(true)}
        className="btn btn-link p-0 d-flex align-items-center gap-1 text-decoration-none"
        style={{ fontSize: 12, fontWeight: 600, color: 'var(--hz-primary-600)' }}
      >
        <Plus size={13} /> Save this view
      </button>

      <Dialog open={naming} onClose={() => setNaming(false)} title="Save Report View" size="sm">
        <form onSubmit={handleSave}>
          <FormField
            label="Name"
            placeholder={`e.g. "${TAB_LABEL[currentView.tab]} - Q1"`}
            value={name}
            onChange={setName}
            required
          />
          <div className="d-flex justify-content-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setNaming(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function Bar({ label, value, max, to }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const content = (
    <>
      <div className="d-flex justify-content-between mb-1">
        <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500, color: to ? 'var(--hz-primary-600)' : undefined }}>{label}</span>
        <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>{value}</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'var(--hz-gray-100)' }}>
        <div style={{ height: 8, borderRadius: 999, width: `${pct}%`, background: 'var(--hz-primary-500)' }} />
      </div>
    </>
  );

  // Optional drill-down: e.g. a department bar in the Employee report
  // links straight into the Employee Directory pre-filtered to that
  // department, rather than making every bar in every report tab
  // clickable when most (leave type, status) have no natural target.
  return to ? (
    <Link to={to} className="d-block mb-2 text-decoration-none">
      {content}
    </Link>
  ) : (
    <div className="mb-2">{content}</div>
  );
}

function ReportBarChart({ data, color = 'var(--hz-primary-500)' }) {
  if (!data?.length) return <p className="hz-report-empty">No data available for this view.</p>;
  return (
    <div className="hz-report-chart" aria-label="Report chart">
      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--hz-border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: 'var(--hz-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} interval={0} angle={data.length > 5 ? -25 : 0} textAnchor={data.length > 5 ? 'end' : 'middle'} height={data.length > 5 ? 48 : 24} />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--hz-text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: 'var(--hz-primary-50)' }} contentStyle={{ border: '1px solid var(--hz-border)', borderRadius: 8, boxShadow: 'var(--hz-shadow-md)', fontSize: 12 }} />
          <RechartsBar dataKey="value" radius={[5, 5, 0, 0]} name="Count">
            {data.map((entry) => <Cell key={entry.label} fill={entry.color || color} />)}
          </RechartsBar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = useState('employees');

  // Lifted up from the panels below so a saved report can restore the
  // exact filtered view (date range / year), not just which tab was open.
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const [attendanceStart, setAttendanceStart] = useState(weekAgo);
  const [attendanceEnd, setAttendanceEnd] = useState(today);
  const [leaveYear, setLeaveYear] = useState(new Date().getFullYear());
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  function restoreView(view) {
    setTab(view.tab);
    if (view.attendanceStart) setAttendanceStart(view.attendanceStart);
    if (view.attendanceEnd) setAttendanceEnd(view.attendanceEnd);
    if (view.leaveYear) setLeaveYear(view.leaveYear);
    if (view.departmentFilter) setDepartmentFilter(view.departmentFilter);
    if (view.statusFilter) setStatusFilter(view.statusFilter);
  }

  const currentView = { tab, attendanceStart, attendanceEnd, leaveYear, departmentFilter, statusFilter };

  function resetFilters() {
    setAttendanceStart(weekAgo);
    setAttendanceEnd(today);
    setLeaveYear(new Date().getFullYear());
    setDepartmentFilter('all');
    setStatusFilter('all');
  }

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader
        eyebrow="Insights"
        title="Reports & Analytics"
        description="Live numbers pulled from your workforce data"
        actions={<ExportMenu options={[{ label: 'Export current view', value: 'current', icon: Download }]} onExport={() => window.print()} />}
      />

      <div className="hz-reports__toolbar">
        <Tabs items={TABS} value={tab} onChange={setTab} ariaLabel="Report categories" />
        <span className="hz-reports__updated">Updated just now</span>
      </div>

      <FilterBar className="hz-reports__filters" aria-label="Report filters">
        <span className="hz-reports__filter-label"><Filter size={14} /> Filters</span>
        {tab === 'attendance' && <>
          <label className="hz-reports__filter-control">From <input type="date" className="form-control form-control-sm" value={attendanceStart} onChange={(e) => setAttendanceStart(e.target.value)} /></label>
          <label className="hz-reports__filter-control">To <input type="date" className="form-control form-control-sm" value={attendanceEnd} onChange={(e) => setAttendanceEnd(e.target.value)} /></label>
        </>}
        {tab === 'leave' && <label className="hz-reports__filter-control">Year <input type="number" className="form-control form-control-sm" value={leaveYear} onChange={(e) => setLeaveYear(Number(e.target.value))} /></label>}
        {(tab === 'employees' || tab === 'attendance' || tab === 'leave') && <label className="hz-reports__filter-control">Department <select className="form-select form-select-sm" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}><option value="all">All departments</option><option value="assigned">Assigned departments</option></select></label>}
        {tab === 'employees' && <label className="hz-reports__filter-control">Status <select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>}
        <button type="button" className="hz-reports__reset" onClick={resetFilters}><RefreshCcw size={14} /> Reset</button>
      </FilterBar>

      <SavedReportsBar currentView={currentView} onRestore={restoreView} />

      {tab === 'employees' && <EmployeeReportPanel departmentFilter={departmentFilter} statusFilter={statusFilter} />}
      {tab === 'attendance' && (
        <AttendanceReportPanel startDate={attendanceStart} endDate={attendanceEnd} onChangeStart={setAttendanceStart} onChangeEnd={setAttendanceEnd} />
      )}
      {tab === 'leave' && <LeaveReportPanel year={leaveYear} onChangeYear={setLeaveYear} />}
      {tab === 'recruitment' && <RecruitmentReportPanel />}
    </div>
  );
}

function EmployeeReportPanel({ departmentFilter, statusFilter }) {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['report-employees'], queryFn: reportsApi.employees });

  if (isLoading) return <SkeletonGrid />;
  if (isError) return <ErrorState description="Couldn't load the employee report." onRetry={refetch} />;

  const maxDept = Math.max(1, ...data.byDepartment.map((d) => d.count));
  const statusEntries = Object.entries(data.byStatus).filter(([status]) => statusFilter === 'all' || status === statusFilter);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="row g-3">
        <div className="col-6 col-xl-3"><StatCard label="Total employees" value={data.totalEmployees} detail="Current workforce" icon={Users} /></div>
        <div className="col-6 col-xl-3"><StatCard label="New joiners" value={data.newJoinersLast30Days} detail="Last 30 days" icon={Users} accent="success" /></div>
        <div className="col-6 col-xl-3"><StatCard label="New joiners" value={data.newJoinersLast90Days} detail="Last 90 days" icon={Users} accent="info" /></div>
        <div className="col-6 col-xl-3"><StatCard label="Separations" value={data.separationsLast90Days} detail="Last 90 days" icon={Users} accent="warning" /></div>
      </div>
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <ChartCard
            title="Headcount by Status"
            actions={
              <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('employee-status-report', Object.entries(data.byStatus).map(([status, count]) => ({ status, count })))}>
                Export CSV
              </Button>
            }
          >
            <ReportBarChart data={statusEntries.map(([status, count]) => ({ label: status.replace('_', ' '), value: count }))} color="var(--hz-primary-500)" />
            {statusEntries.map(([status, count]) => (
              <Bar key={status} label={status.replace('_', ' ')} value={count} max={data.totalEmployees} />
            ))}
          </ChartCard>
        </div>
        <div className="col-12 col-lg-6">
          <ChartCard
            title="Headcount by Department"
            actions={
              <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('employee-department-report', data.byDepartment.map((d) => ({ department: d.departmentName, count: d.count })))}>
                Export CSV
              </Button>
            }
          >
            {departmentFilter === 'assigned' && data.byDepartment.length === 0 && <p style={{ fontSize: 13, color: 'var(--hz-text-muted)' }}>No department assignments yet.</p>}
            {departmentFilter !== 'assigned' && <ReportBarChart data={data.byDepartment.map((d) => ({ label: d.departmentName, value: d.count }))} color="var(--hz-accent-500)" />}
            {departmentFilter === 'assigned' && data.byDepartment.map((d) => (
              <Bar
                key={d.departmentName}
                label={d.departmentName}
                value={d.count}
                max={maxDept}
                to={`/employees?departmentId=${d.departmentId}&departmentName=${encodeURIComponent(d.departmentName)}`}
              />
            ))}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function AttendanceReportPanel({ startDate, endDate, onChangeStart, onChangeEnd }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-attendance', startDate, endDate],
    queryFn: () => reportsApi.attendance(startDate, endDate),
  });

  return (
    <div className="d-flex flex-column gap-3">
      {isLoading && <SkeletonGrid />}
      {isError && <ErrorState description="Couldn't load the attendance report." onRetry={refetch} />}

      {!isLoading && !isError && (
        <>
          <AttendanceHeatmapSection />

          <div className="row g-3">
            <div className="col-6 col-xl-4"><StatCard label="Total punches" value={data.totalPunches} icon={Clock} /></div>
            <div className="col-6 col-xl-4"><StatCard label="Employees punched" value={data.uniqueEmployeesPunched} icon={Users} accent="info" /></div>
            <div className="col-6 col-xl-4"><StatCard label="Active employees" value={data.totalActiveEmployees} icon={Users} accent="success" /></div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <ChartCard
                title="Daily Distinct Employees Punched"
                actions={
                  <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('attendance-daily-report', data.dailyDistinctEmployees.map((d) => ({ date: d.date, employeesPunched: d.count })))}>
                    Export CSV
                  </Button>
                }
              >
                <ReportBarChart data={data.dailyDistinctEmployees.map((d) => ({ label: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }), value: d.count }))} />
                {data.dailyDistinctEmployees.map((d) => (
                  <Bar key={d.date} label={new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} value={d.count} max={Math.max(1, data.totalActiveEmployees)} />
                ))}
              </ChartCard>
            </div>
            <div className="col-12 col-lg-5">
              <ChartCard
                title="Punches by Department"
                actions={
                  <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('attendance-department-report', data.byDepartment.map((d) => ({ department: d.departmentName, punches: d.punchCount })))}>
                    Export CSV
                  </Button>
                }
              >
                {data.byDepartment.length === 0 && <p style={{ fontSize: 13, color: 'var(--hz-text-muted)' }}>No punches mapped to a department in this range.</p>}
                <ReportBarChart data={data.byDepartment.map((d) => ({ label: d.departmentName, value: d.punchCount }))} color="var(--hz-accent-500)" />
                {data.byDepartment.map((d) => (
                  <Bar key={d.departmentName} label={d.departmentName} value={d.punchCount} max={Math.max(1, ...data.byDepartment.map((x) => x.punchCount))} />
                ))}
              </ChartCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * A calendar-style heatmap (GitHub-contribution-graph shape), separate
 * from the date-filtered daily bar chart above it in the same panel: that
 * chart wants a short range to stay readable as bars, this wants a long
 * range to actually look like a heatmap. Fetches its own fixed 12-week
 * window rather than sharing the panel's date filter, so changing one
 * doesn't fight the other. Same reportsApi.attendance() endpoint and
 * dailyDistinctEmployees data the bar chart uses - no new backend surface.
 */
function AttendanceHeatmapSection() {
  const WEEKS = 12;
  const today = new Date();
  const rangeEnd = today.toISOString().slice(0, 10);
  const rangeStart = new Date(today.getTime() - (WEEKS * 7 - 1) * 86400000).toISOString().slice(0, 10);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-attendance-heatmap', rangeStart, rangeEnd],
    queryFn: () => reportsApi.attendance(rangeStart, rangeEnd),
  });

  if (isLoading || isError || !data) {
    return null; // this is a supplementary view - the panel's main loading/error state above already covers the failure case for the primary data
  }

  const countByDate = Object.fromEntries(data.dailyDistinctEmployees.map((d) => [d.date, d.count]));
  const maxCount = Math.max(1, data.totalActiveEmployees);

  // Build a Sun-Sat grid of weeks, oldest to newest, left to right - the
  // first column is padded with nulls up to the starting day-of-week so
  // every column lines up as a real calendar week, not just 7-day chunks.
  const days = [];
  const start = new Date(rangeStart + 'T00:00:00');
  const startPad = start.getDay();
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = new Date(start); d <= new Date(rangeEnd + 'T00:00:00'); d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  function intensity(dateStr) {
    if (!dateStr) return -1;
    const count = countByDate[dateStr] || 0;
    return count / maxCount;
  }

  function cellColor(level) {
    if (level < 0) return 'transparent';
    if (level === 0) return 'var(--hz-gray-100)';
    if (level < 0.25) return 'var(--hz-primary-100)';
    if (level < 0.5) return 'var(--hz-primary-300)';
    if (level < 0.75) return 'var(--hz-primary-500)';
    return 'var(--hz-primary-700)';
  }

  return (
    <Card title="Attendance Heatmap" subtitle={`Last ${WEEKS} weeks · color = % of active employees who punched that day`}>
      <div className="d-flex gap-1" style={{ overflowX: 'auto', paddingBottom: 4 }}>
        {weeks.map((week, wi) => (
          <div key={wi} className="d-flex flex-column gap-1">
            {week.map((dateStr, di) => (
              <div
                key={di}
                title={dateStr ? `${dateStr}: ${countByDate[dateStr] || 0} of ${data.totalActiveEmployees} employees punched` : ''}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  background: cellColor(intensity(dateStr)),
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="d-flex align-items-center gap-1 mt-2" style={{ fontSize: 11, color: 'var(--hz-text-muted)' }}>
        <span>Less</span>
        {[0, 0.2, 0.4, 0.6, 0.8].map((level) => (
          <div key={level} style={{ width: 12, height: 12, borderRadius: 3, background: cellColor(level) }} />
        ))}
        <span>More</span>
      </div>
    </Card>
  );
}

function LeaveReportPanel({ year, onChangeYear }) {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['report-leave', year], queryFn: () => reportsApi.leave(year) });

  return (
    <div className="d-flex flex-column gap-3">
      {isLoading && <SkeletonGrid />}
      {isError && <ErrorState description="Couldn't load the leave report." onRetry={refetch} />}

      {!isLoading && !isError && (
        <>
          <div className="row g-3">
            <div className="col-6 col-xl-3"><StatCard label="Total requests" value={data.totalRequests} icon={CalendarDays} /></div>
            <div className="col-6 col-xl-3"><StatCard label="Approved" value={data.approved} icon={CalendarDays} accent="success" /></div>
            <div className="col-6 col-xl-3"><StatCard label="Rejected" value={data.rejected} icon={CalendarDays} accent="danger" /></div>
            <div className="col-6 col-xl-3"><StatCard label="Approval rate" value={`${data.approvalRatePercent}%`} icon={CalendarDays} accent="info" /></div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <ChartCard
                title="Approved Days by Leave Type"
                actions={
                  <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('leave-type-report', data.byLeaveType.map((l) => ({ leaveType: l.leaveTypeName, approvedDays: l.approvedDays })))}>
                    Export CSV
                  </Button>
                }
              >
                {data.byLeaveType.length === 0 && <p style={{ fontSize: 13, color: 'var(--hz-text-muted)' }}>No approved leave in {year} yet.</p>}
                <ReportBarChart data={data.byLeaveType.map((l) => ({ label: l.leaveTypeName, value: l.approvedDays }))} color="var(--hz-primary-500)" />
                {data.byLeaveType.map((l) => (
                  <Bar key={l.leaveTypeName} label={l.leaveTypeName} value={l.approvedDays} max={Math.max(1, ...data.byLeaveType.map((x) => x.approvedDays))} />
                ))}
              </ChartCard>
            </div>
            <div className="col-12 col-lg-6">
              <ChartCard
                title="Approved Days by Department"
                actions={
                  <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('leave-department-report', data.byDepartment.map((d) => ({ department: d.departmentName, approvedDays: d.approvedDays })))}>
                    Export CSV
                  </Button>
                }
              >
                {data.byDepartment.length === 0 && <p style={{ fontSize: 13, color: 'var(--hz-text-muted)' }}>No approved leave in {year} yet.</p>}
                <ReportBarChart data={data.byDepartment.map((d) => ({ label: d.departmentName, value: d.approvedDays }))} color="var(--hz-accent-500)" />
                {data.byDepartment.map((d) => (
                  <Bar key={d.departmentName} label={d.departmentName} value={d.approvedDays} max={Math.max(1, ...data.byDepartment.map((x) => x.approvedDays))} />
                ))}
              </ChartCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RecruitmentReportPanel() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['report-recruitment'], queryFn: reportsApi.recruitment });

  if (isLoading) return <SkeletonGrid />;
  if (isError) return <ErrorState description="Couldn't load the recruitment report." onRetry={refetch} />;

  const maxStage = Math.max(1, ...Object.values(data.byStage));

  return (
    <div className="d-flex flex-column gap-3">
      <div className="row g-3">
        <div className="col-6 col-xl-3"><StatCard label="Open requisitions" value={data.openRequisitions} icon={Briefcase} /></div>
        <div className="col-6 col-xl-3"><StatCard label="Total candidates" value={data.totalCandidates} icon={Users} accent="info" /></div>
        <div className="col-6 col-xl-3"><StatCard label="Hired this year" value={data.hiredThisYear} icon={Users} accent="success" /></div>
        <div className="col-6 col-xl-3"><StatCard label="Average days to hire" value={data.averageDaysToHire ?? '—'} icon={Clock} accent="warning" /></div>
      </div>
      <ChartCard
        title="Pipeline Funnel"
        actions={
          <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('recruitment-pipeline-report', Object.entries(data.byStage).map(([stage, count]) => ({ stage, count })))}>
            Export CSV
          </Button>
        }
      >
        <ReportBarChart data={Object.entries(data.byStage).map(([stage, count]) => ({ label: stage, value: count }))} color="var(--hz-accent-500)" />
        {Object.entries(data.byStage).map(([stage, count]) => (
          <Bar key={stage} label={stage} value={count} max={maxStage} />
        ))}
      </ChartCard>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="row g-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="col-6 col-xl-3" key={i}>
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}
