import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Wallet, Users, Clock3, TrendingUp, ArrowUpRight, ArrowDownRight,
  CalendarClock, PlayCircle, FileSpreadsheet, ListChecks, History,
} from 'lucide-react';
import { salaryDashboardApi } from '../../api/endpoints/salary';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { formatCompactCurrency } from '../../utils/formatCurrency';
import PayrollTrendChart from './components/PayrollTrendChart';
import DepartmentDonutChart from './components/DepartmentDonutChart';
import DepartmentComparisonBars from './components/DepartmentComparisonBars';

export default function SalaryDashboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['salary-dashboard-summary'],
    queryFn: salaryDashboardApi.summary,
  });

  const overview = data?.overview;

  const kpis = overview
    ? [
        {
          label: 'Monthly Payroll Cost',
          value: formatCompactCurrency(overview.monthlyPayrollCost),
          sub: `${overview.activeEmployeesWithSalary} employee${overview.activeEmployeesWithSalary === 1 ? '' : 's'} on active pay`,
          icon: Wallet,
          accent: 'var(--hz-primary-600)',
        },
        {
          label: 'Average Salary',
          value: formatCompactCurrency(overview.averageSalary),
          sub: `Range ${formatCompactCurrency(overview.lowestSalary)} – ${formatCompactCurrency(overview.highestSalary)}`,
          icon: TrendingUp,
          accent: 'var(--hz-accent-500)',
        },
        {
          label: 'Employees Processed',
          value: overview.employeesProcessed,
          sub: `${overview.employeesPending} pending this period`,
          icon: Users,
          accent: 'var(--hz-success-500)',
        },
        {
          label: 'Upcoming Payroll Date',
          value: overview.upcomingPayrollDate ? new Date(overview.upcomingPayrollDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—',
          sub: overview.upcomingPayrollDate ? 'Scheduled pay-out' : 'No run scheduled yet',
          icon: CalendarClock,
          accent: 'var(--hz-warning-500)',
        },
      ]
    : [];

  return (
    <div className="hz-payroll d-flex flex-column gap-4">
      <div className="hz-greeting">
        <div className="position-relative d-flex flex-wrap align-items-end justify-content-between gap-3">
          <div>
            <p style={{ fontSize: 'var(--hz-text-sm)', color: 'rgba(255,255,255,0.75)', fontWeight: 500, marginBottom: 6 }}>Salary &amp; Payroll</p>
            <h1 style={{ fontSize: 'var(--hz-text-3xl)', fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>Payroll Overview</h1>
            <p style={{ fontSize: 'var(--hz-text-base)', color: 'rgba(255,255,255,0.85)', maxWidth: 480, marginBottom: 0 }}>
              {overview ? (
                <>
                  {overview.currentPeriodLabel} is <strong>{overview.currentPeriodStatus?.replaceAll('_', ' ').toLowerCase()}</strong> —{' '}
                  {overview.payrollCompletionPercent}% complete.
                </>
              ) : (
                'Loading this period\u2019s payroll status…'
              )}
            </p>
          </div>
          {overview && (
            <div style={{ minWidth: 220 }}>
              <div className="d-flex justify-content-between mb-1" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 600 }}>
                <span>Payroll Completion</span>
                <span>{overview.payrollCompletionPercent}%</span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    width: `${overview.payrollCompletionPercent}%`,
                    background: 'linear-gradient(90deg, #ffffff, #d4e9ff)',
                    transition: 'width 600ms ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {isError && <ErrorState description="Couldn't load payroll dashboard data." onRetry={refetch} />}

      {!isError && (
        <div className="row g-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div className="col-12 col-sm-6 col-xl-3" key={i}>
                <SkeletonCard />
              </div>
            ))}
          {!isLoading &&
            kpis.map((kpi) => (
              <div className="col-12 col-sm-6 col-xl-3" key={kpi.label}>
                <Card hoverable className="hz-stat">
                  <div className="d-flex align-items-start justify-content-between">
                    <div>
                      <p className="text-secondary-hz mb-1" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>
                        {kpi.label}
                      </p>
                      <p className="hz-stat__value" style={{ marginBottom: 4 }}>
                        {kpi.value}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--hz-text-muted)', marginBottom: 0 }}>{kpi.sub}</p>
                    </div>
                    <div className="hz-stat__icon" style={{ background: `${kpi.accent}1a`, color: kpi.accent }}>
                      <kpi.icon size={20} />
                    </div>
                  </div>
                </Card>
              </div>
            ))}
        </div>
      )}

      {!isError && (
        <div className="row g-3">
          <div className="col-12 col-xl-8">
            <Card hoverable title="Payroll Trend" subtitle="Net payout over the last 12 processed cycles">
              {isLoading ? <div style={{ height: 260 }} /> : <PayrollTrendChart points={(data?.payrollTrend || []).map((p) => ({ label: p.periodLabel.split(' ')[0].slice(0, 3), value: p.totalNet }))} />}
            </Card>
          </div>
          <div className="col-12 col-xl-4">
            <Card hoverable title="Quick Payroll Actions" subtitle="Jump straight into a task">
              <div className="d-flex flex-column gap-2">
                <Link to="/salary/payroll-processing" className="btn btn-primary d-inline-flex align-items-center gap-2 justify-content-start">
                  <PlayCircle size={16} /> Run / Review Payroll
                </Link>
                <Link to="/salary/employees" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 justify-content-start">
                  <ListChecks size={16} /> Employee Salary List
                </Link>
                <Link to="/salary/structure" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 justify-content-start">
                  <FileSpreadsheet size={16} /> Define Salary Structure
                </Link>
                <Link to="/salary/reports" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 justify-content-start">
                  <TrendingUp size={16} /> Salary Reports
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {!isError && (
        <div className="row g-3">
          <div className="col-12 col-xl-5">
            <Card hoverable title="Department Salary Distribution" subtitle="Share of monthly payroll by department">
              {isLoading ? <div style={{ height: 200 }} /> : <DepartmentDonutChart data={data?.departmentDistribution || []} />}
            </Card>
          </div>
          <div className="col-12 col-xl-7">
            <Card hoverable title="Salary Expense by Department" subtitle="Total monthly net salary per department">
              {isLoading ? <div style={{ height: 200 }} /> : <DepartmentComparisonBars data={data?.departmentDistribution || []} />}
            </Card>
          </div>
        </div>
      )}

      {!isError && (
        <Card hoverable title="Recent Payroll Activity" subtitle="Latest changes across salary structures and payroll runs">
          {isLoading && <div className="p-2" />}
          {!isLoading && (!data?.recentActivity || data.recentActivity.length === 0) && (
            <EmptyState icon={History} title="No payroll activity yet" description="Define a salary structure or run payroll to see activity here." />
          )}
          {!isLoading && data?.recentActivity?.length > 0 && (
            <div className="d-flex flex-column gap-3">
              {data.recentActivity.map((a, i) => (
                <div key={i} className="d-flex align-items-start justify-content-between gap-3 pb-3" style={{ borderBottom: i < data.recentActivity.length - 1 ? '1px solid var(--hz-border)' : 'none' }}>
                  <div className="d-flex align-items-start gap-3">
                    <div className="hz-stat__icon" style={{ width: 34, height: 34, background: 'var(--hz-primary-50)', color: 'var(--hz-primary-600)' }}>
                      <ActivityIcon action={a.action} />
                    </div>
                    <div>
                      <p style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500, color: 'var(--hz-text-primary)', marginBottom: 2 }}>{a.details}</p>
                      <p style={{ fontSize: 12, color: 'var(--hz-text-muted)', marginBottom: 0 }}>
                        {a.performedBy || 'System'} &middot; {new Date(a.performedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function ActivityIcon({ action }) {
  if (action === 'MARK_PAID') return <Wallet size={16} />;
  if (action === 'PROCESS') return <TrendingUp size={16} />;
  if (action === 'HOLD') return <ArrowDownRight size={16} />;
  if (action === 'RELEASE') return <ArrowUpRight size={16} />;
  return <Clock3 size={16} />;
}
