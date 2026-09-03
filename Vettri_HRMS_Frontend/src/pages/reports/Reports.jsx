import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, Users, Clock, CalendarDays, Briefcase, Bookmark, Plus, X } from 'lucide-react';
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

function Stat({ label, value }) {
  return (
    <Card>
      <p className="text-secondary-hz mb-1" style={{ fontSize: 'var(--hz-text-sm)' }}>
        {label}
      </p>
      <p style={{ fontSize: 'var(--hz-text-3xl)', fontWeight: 700, marginBottom: 0 }}>{value}</p>
    </Card>
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

  function restoreView(view) {
    setTab(view.tab);
    if (view.attendanceStart) setAttendanceStart(view.attendanceStart);
    if (view.attendanceEnd) setAttendanceEnd(view.attendanceEnd);
    if (view.leaveYear) setLeaveYear(view.leaveYear);
  }

  const currentView = { tab, attendanceStart, attendanceEnd, leaveYear };

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader eyebrow="Insights" title="Reports & Analytics" description="Live numbers pulled from your workforce data" />

      <Tabs items={TABS} value={tab} onChange={setTab} />

      <SavedReportsBar currentView={currentView} onRestore={restoreView} />

      {tab === 'employees' && <EmployeeReportPanel />}
      {tab === 'attendance' && (
        <AttendanceReportPanel startDate={attendanceStart} endDate={attendanceEnd} onChangeStart={setAttendanceStart} onChangeEnd={setAttendanceEnd} />
      )}
      {tab === 'leave' && <LeaveReportPanel year={leaveYear} onChangeYear={setLeaveYear} />}
      {tab === 'recruitment' && <RecruitmentReportPanel />}
    </div>
  );
}

function EmployeeReportPanel() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['report-employees'], queryFn: reportsApi.employees });

  if (isLoading) return <SkeletonGrid />;
  if (isError) return <ErrorState description="Couldn't load the employee report." onRetry={refetch} />;

  const maxDept = Math.max(1, ...data.byDepartment.map((d) => d.count));

  return (
    <div className="d-flex flex-column gap-3">
      <div className="row g-3">
        <div className="col-6 col-xl-3"><Stat label="Total Employees" value={data.totalEmployees} /></div>
        <div className="col-6 col-xl-3"><Stat label="Joined Last 30 Days" value={data.newJoinersLast30Days} /></div>
        <div className="col-6 col-xl-3"><Stat label="Joined Last 90 Days" value={data.newJoinersLast90Days} /></div>
        <div className="col-6 col-xl-3"><Stat label="Separations (90d)" value={data.separationsLast90Days} /></div>
      </div>
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <Card
            title="Headcount by Status"
            actions={
              <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('employee-status-report', Object.entries(data.byStatus).map(([status, count]) => ({ status, count })))}>
                Export CSV
              </Button>
            }
          >
            {Object.entries(data.byStatus).map(([status, count]) => (
              <Bar key={status} label={status.replace('_', ' ')} value={count} max={data.totalEmployees} />
            ))}
          </Card>
        </div>
        <div className="col-12 col-lg-6">
          <Card
            title="Headcount by Department"
            actions={
              <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('employee-department-report', data.byDepartment.map((d) => ({ department: d.departmentName, count: d.count })))}>
                Export CSV
              </Button>
            }
          >
            {data.byDepartment.length === 0 && <p style={{ fontSize: 13, color: 'var(--hz-text-muted)' }}>No department assignments yet.</p>}
            {data.byDepartment.map((d) => (
              <Bar
                key={d.departmentName}
                label={d.departmentName}
                value={d.count}
                max={maxDept}
                to={`/employees?departmentId=${d.departmentId}&departmentName=${encodeURIComponent(d.departmentName)}`}
              />
            ))}
          </Card>
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
      <Card>
        <div className="d-flex align-items-end gap-3 flex-wrap">
          <div>
            <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>From</label>
            <input type="date" className="form-control" value={startDate} onChange={(e) => onChangeStart(e.target.value)} />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>To</label>
            <input type="date" className="form-control" value={endDate} onChange={(e) => onChangeEnd(e.target.value)} />
          </div>
        </div>
      </Card>

      {isLoading && <SkeletonGrid />}
      {isError && <ErrorState description="Couldn't load the attendance report." onRetry={refetch} />}

      {!isLoading && !isError && (
        <>
          <AttendanceHeatmapSection />

          <div className="row g-3">
            <div className="col-6 col-xl-4"><Stat label="Total Punches" value={data.totalPunches} /></div>
            <div className="col-6 col-xl-4"><Stat label="Unique Employees Punched" value={data.uniqueEmployeesPunched} /></div>
            <div className="col-6 col-xl-4"><Stat label="Active Employees" value={data.totalActiveEmployees} /></div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <Card
                title="Daily Distinct Employees Punched"
                actions={
                  <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('attendance-daily-report', data.dailyDistinctEmployees.map((d) => ({ date: d.date, employeesPunched: d.count })))}>
                    Export CSV
                  </Button>
                }
              >
                {data.dailyDistinctEmployees.map((d) => (
                  <Bar key={d.date} label={new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} value={d.count} max={Math.max(1, data.totalActiveEmployees)} />
                ))}
              </Card>
            </div>
            <div className="col-12 col-lg-5">
              <Card
                title="Punches by Department"
                actions={
                  <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('attendance-department-report', data.byDepartment.map((d) => ({ department: d.departmentName, punches: d.punchCount })))}>
                    Export CSV
                  </Button>
                }
              >
                {data.byDepartment.length === 0 && <p style={{ fontSize: 13, color: 'var(--hz-text-muted)' }}>No punches mapped to a department in this range.</p>}
                {data.byDepartment.map((d) => (
                  <Bar key={d.departmentName} label={d.departmentName} value={d.punchCount} max={Math.max(1, ...data.byDepartment.map((x) => x.punchCount))} />
                ))}
              </Card>
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
      <Card>
        <div style={{ maxWidth: 160 }}>
          <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>Year</label>
          <input type="number" className="form-control" value={year} onChange={(e) => onChangeYear(Number(e.target.value))} />
        </div>
      </Card>

      {isLoading && <SkeletonGrid />}
      {isError && <ErrorState description="Couldn't load the leave report." onRetry={refetch} />}

      {!isLoading && !isError && (
        <>
          <div className="row g-3">
            <div className="col-6 col-xl-3"><Stat label="Total Requests" value={data.totalRequests} /></div>
            <div className="col-6 col-xl-3"><Stat label="Approved" value={data.approved} /></div>
            <div className="col-6 col-xl-3"><Stat label="Rejected" value={data.rejected} /></div>
            <div className="col-6 col-xl-3"><Stat label="Approval Rate" value={`${data.approvalRatePercent}%`} /></div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <Card
                title="Approved Days by Leave Type"
                actions={
                  <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('leave-type-report', data.byLeaveType.map((l) => ({ leaveType: l.leaveTypeName, approvedDays: l.approvedDays })))}>
                    Export CSV
                  </Button>
                }
              >
                {data.byLeaveType.length === 0 && <p style={{ fontSize: 13, color: 'var(--hz-text-muted)' }}>No approved leave in {year} yet.</p>}
                {data.byLeaveType.map((l) => (
                  <Bar key={l.leaveTypeName} label={l.leaveTypeName} value={l.approvedDays} max={Math.max(1, ...data.byLeaveType.map((x) => x.approvedDays))} />
                ))}
              </Card>
            </div>
            <div className="col-12 col-lg-6">
              <Card
                title="Approved Days by Department"
                actions={
                  <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('leave-department-report', data.byDepartment.map((d) => ({ department: d.departmentName, approvedDays: d.approvedDays })))}>
                    Export CSV
                  </Button>
                }
              >
                {data.byDepartment.length === 0 && <p style={{ fontSize: 13, color: 'var(--hz-text-muted)' }}>No approved leave in {year} yet.</p>}
                {data.byDepartment.map((d) => (
                  <Bar key={d.departmentName} label={d.departmentName} value={d.approvedDays} max={Math.max(1, ...data.byDepartment.map((x) => x.approvedDays))} />
                ))}
              </Card>
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
        <div className="col-6 col-xl-3"><Stat label="Open Requisitions" value={data.openRequisitions} /></div>
        <div className="col-6 col-xl-3"><Stat label="Total Candidates" value={data.totalCandidates} /></div>
        <div className="col-6 col-xl-3"><Stat label="Hired This Year" value={data.hiredThisYear} /></div>
        <div className="col-6 col-xl-3"><Stat label="Avg. Days to Hire" value={data.averageDaysToHire ?? '—'} /></div>
      </div>
      <Card
        title="Pipeline Funnel"
        actions={
          <Button size="sm" variant="secondary" icon={Download} onClick={() => exportToCsv('recruitment-pipeline-report', Object.entries(data.byStage).map(([stage, count]) => ({ stage, count })))}>
            Export CSV
          </Button>
        }
      >
        {Object.entries(data.byStage).map(([stage, count]) => (
          <Bar key={stage} label={stage} value={count} max={maxStage} />
        ))}
      </Card>
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
