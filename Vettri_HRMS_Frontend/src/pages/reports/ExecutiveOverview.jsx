import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, UserPlus, UserMinus, Briefcase, TrendingUp, Clock, CalendarDays, ArrowRight } from 'lucide-react';
import { reportsApi } from '../../api/endpoints/reports';
import Card from '../../components/ui/Card';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonCard } from '../../components/ui/Skeleton';

/**
 * Distinct from Reports.jsx: that page is a drill-down tool (pick a tab,
 * inspect one module's numbers in depth). This is the opposite shape - a
 * single glance at org health across headcount, attendance, leave, and
 * hiring, meant for someone who wants the state of the business, not to
 * operate any of these modules. Same REPORTS_VIEW-gated endpoints, no
 * backend changes - the permission was already scoped for exactly this
 * ("View executive, attendance, leave, and recruitment reports" - see
 * DataSeeder) and just needed a screen that actually reads that way.
 */
export default function ExecutiveOverview() {
  const employees = useQuery({ queryKey: ['report-employees'], queryFn: reportsApi.employees });
  const attendance = useQuery({
    queryKey: ['report-attendance', 'exec'],
    queryFn: () => reportsApi.attendance(),
  });
  const leave = useQuery({ queryKey: ['report-leave', 'exec'], queryFn: () => reportsApi.leave() });
  const recruitment = useQuery({ queryKey: ['report-recruitment', 'exec'], queryFn: reportsApi.recruitment });

  const anyLoading = employees.isLoading || attendance.isLoading || leave.isLoading || recruitment.isLoading;
  const anyError = employees.isError || attendance.isError || leave.isError || recruitment.isError;

  if (anyLoading) {
    return (
      <div className="d-flex flex-column gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (anyError) {
    return (
      <ErrorState
        description="Couldn't load one or more report sources."
        onRetry={() => {
          employees.refetch();
          attendance.refetch();
          leave.refetch();
          recruitment.refetch();
        }}
      />
    );
  }

  const emp = employees.data;
  const att = attendance.data;
  const lv = leave.data;
  const rec = recruitment.data;

  const attendanceRate = att.totalActiveEmployees > 0 ? Math.round((att.uniqueEmployeesPunched / att.totalActiveEmployees) * 100) : null;

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>Executive Overview</h1>
          <p className="text-secondary-hz" style={{ fontSize: 'var(--hz-text-sm)' }}>
            Org health at a glance - same live data as Reports, synthesized into one view
          </p>
        </div>
        <Link to="/reports" className="d-inline-flex align-items-center gap-1 text-decoration-none" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, color: 'var(--hz-primary-600)' }}>
          Drill into full reports <ArrowRight size={14} />
        </Link>
      </div>

      <div className="row g-3">
        <KpiCard icon={Users} label="Headcount" value={emp.totalEmployees} accent="var(--hz-primary-600)" tint="var(--hz-primary-50)" />
        <KpiCard icon={UserPlus} label="New Hires (30d)" value={emp.newJoinersLast30Days} accent="var(--hz-success-500)" tint="var(--hz-success-50)" />
        <KpiCard icon={UserMinus} label="Separations (90d)" value={emp.separationsLast90Days} accent="var(--hz-danger-500)" tint="var(--hz-danger-50)" />
        <KpiCard icon={Briefcase} label="Open Positions" value={rec.openRequisitions} accent="var(--hz-warning-500)" tint="var(--hz-warning-50)" />
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <Card title="Headcount by Department">
            {emp.byDepartment.length === 0 && <p className="text-secondary-hz mb-0" style={{ fontSize: 'var(--hz-text-sm)' }}>No department data yet.</p>}
            {emp.byDepartment.length > 0 && (
              <div className="d-flex flex-column gap-2">
                {emp.byDepartment.map((d) => (
                  <DistBar key={d.departmentName} label={d.departmentName} value={d.count} max={emp.totalEmployees} />
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="col-12 col-lg-6">
          <Card title="Hiring Funnel">
            <div className="d-flex align-items-center gap-4 mb-3">
              <div>
                <div style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>{rec.totalCandidates}</div>
                <div className="text-secondary-hz" style={{ fontSize: 12 }}>Active candidates</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>{rec.hiredThisYear}</div>
                <div className="text-secondary-hz" style={{ fontSize: 12 }}>Hired this year</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>{rec.averageDaysToHire ?? '—'}</div>
                <div className="text-secondary-hz" style={{ fontSize: 12 }}>Avg. days to hire</div>
              </div>
            </div>
            <div className="d-flex flex-column gap-2">
              {Object.entries(rec.byStage)
                .filter(([, count]) => count > 0)
                .map(([stage, count]) => (
                  <DistBar key={stage} label={stageLabel(stage)} value={count} max={rec.totalCandidates} />
                ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <Card title="Attendance" subtitle="Last 7 days">
            <div className="d-flex align-items-center gap-2 mb-1">
              <Clock size={18} color="var(--hz-primary-600)" />
              <span style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>
                {attendanceRate != null ? `${attendanceRate}%` : '—'}
              </span>
            </div>
            <p className="text-secondary-hz mb-0" style={{ fontSize: 12 }}>
              {att.uniqueEmployeesPunched} of {att.totalActiveEmployees} active employees checked in at least once
            </p>
          </Card>
        </div>

        <div className="col-12 col-lg-4">
          <Card title="Leave" subtitle={`${lv.year}`}>
            <div className="d-flex align-items-center gap-2 mb-1">
              <CalendarDays size={18} color="var(--hz-warning-500)" />
              <span style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>{lv.pending}</span>
            </div>
            <p className="text-secondary-hz mb-0" style={{ fontSize: 12 }}>
              pending of {lv.totalRequests} requests this year ({lv.approved} approved)
            </p>
          </Card>
        </div>

        <div className="col-12 col-lg-4">
          <Card title="Retention" subtitle="Trailing 90 days">
            <div className="d-flex align-items-center gap-2 mb-1">
              <TrendingUp size={18} color="var(--hz-success-500)" />
              <span style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>
                {emp.totalEmployees > 0 ? `${(100 - (emp.separationsLast90Days / emp.totalEmployees) * 100).toFixed(1)}%` : '—'}
              </span>
            </div>
            <p className="text-secondary-hz mb-0" style={{ fontSize: 12 }}>
              {emp.separationsLast90Days} separation{emp.separationsLast90Days === 1 ? '' : 's'} against current headcount
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent, tint }) {
  return (
    <div className="col-6 col-lg-3">
      <Card>
        <div className="d-flex align-items-center gap-3">
          <div className="hz-stat__icon" style={{ background: tint, color: accent }}>
            <Icon size={20} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
            <div className="text-secondary-hz" style={{ fontSize: 12 }}>{label}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DistBar({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="d-flex justify-content-between mb-1">
        <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>{value}</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: 'var(--hz-gray-100)' }}>
        <div style={{ height: 6, borderRadius: 999, width: `${pct}%`, background: 'var(--hz-primary-500)' }} />
      </div>
    </div>
  );
}

const STAGE_LABEL = {
  APPLIED: 'Applied', SHORTLISTED: 'Shortlisted', HOLD: 'On Hold',
  ROUND1: 'Round 1', ROUND2: 'Round 2', ROUND3: 'Round 3',
  OFFERED: 'Offered', OFFER_LETTER_SENT: 'Offer Sent', HIRED: 'Hired', REJECTED: 'Rejected',
};
function stageLabel(stage) {
  return STAGE_LABEL[stage] || stage;
}
