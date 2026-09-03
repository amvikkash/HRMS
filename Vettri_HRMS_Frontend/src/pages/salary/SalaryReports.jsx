import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { salaryDashboardApi } from '../../api/endpoints/salary';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatCurrency';
import { exportToCsv } from '../../utils/exportToCsv';
import PayrollTrendChart from './components/PayrollTrendChart';
import DepartmentDonutChart from './components/DepartmentDonutChart';
import DepartmentComparisonBars from './components/DepartmentComparisonBars';
import PageHeader from '../../components/ui/PageHeader';
import Table from '../../components/ui/Table';

const PAYROLL_COLUMNS = [
  { key: 'period', label: 'Period', render: (point) => point.periodLabel, style: { fontWeight: 500 } },
  { key: 'gross', label: 'Gross Salary', render: (point) => formatCurrency(point.totalGross) },
  { key: 'deductions', label: 'Deductions', render: (point) => formatCurrency(point.totalDeductions) },
  { key: 'net', label: 'Net Salary', render: (point) => formatCurrency(point.totalNet), style: { fontWeight: 600 } },
];

/**
 * Deeper reporting view over the same dataset the Salary Dashboard
 * summarizes - reuses /api/salary/dashboard/summary rather than a second
 * backend endpoint, since the underlying figures (trend, department
 * distribution) are identical; this page just presents them for analysis
 * and export instead of at-a-glance monitoring.
 */
export default function SalaryReports() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['salary-dashboard-summary'],
    queryFn: salaryDashboardApi.summary,
  });

  if (isLoading) {
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

  if (isError || !data) {
    return <ErrorState description="Couldn't load salary reports." onRetry={refetch} />;
  }

  const { overview, departmentDistribution, payrollTrend } = data;

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader eyebrow="Payroll" title="Salary Reports" description="Payroll cost, trend and department analysis" />

      <div className="row g-3">
        <div className="col-6 col-xl-3">
          <Stat label="Monthly Payroll Cost" value={formatCompactCurrency(overview.monthlyPayrollCost)} />
        </div>
        <div className="col-6 col-xl-3">
          <Stat label="Average Salary" value={formatCompactCurrency(overview.averageSalary)} />
        </div>
        <div className="col-6 col-xl-3">
          <Stat label="Highest Salary" value={formatCompactCurrency(overview.highestSalary)} />
        </div>
        <div className="col-6 col-xl-3">
          <Stat label="Lowest Salary" value={formatCompactCurrency(overview.lowestSalary)} />
        </div>
      </div>

      <Card
        title="Payroll Trend (Last 12 Months)"
        subtitle="Net payout for every processed cycle"
        actions={
          <Button
            size="sm"
            variant="secondary"
            icon={Download}
            onClick={() =>
              exportToCsv(
                'payroll-trend-report',
                payrollTrend.map((p) => ({ period: p.periodLabel, grossSalary: p.totalGross, deductions: p.totalDeductions, netSalary: p.totalNet }))
              )
            }
            disabled={payrollTrend.length === 0}
          >
            Export CSV
          </Button>
        }
      >
        <PayrollTrendChart points={payrollTrend.map((p) => ({ label: p.periodLabel.split(' ')[0].slice(0, 3), value: p.totalNet }))} />
      </Card>

      <div className="row g-3">
        <div className="col-12 col-xl-5">
          <Card title="Department Salary Distribution">
            <DepartmentDonutChart data={departmentDistribution} />
          </Card>
        </div>
        <div className="col-12 col-xl-7">
          <Card
            title="Salary Expense by Department"
            actions={
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={() =>
                  exportToCsv(
                    'department-salary-report',
                    departmentDistribution.map((d) => ({ department: d.departmentName, headcount: d.headcount, totalNetSalary: d.totalNetSalary }))
                  )
                }
                disabled={departmentDistribution.length === 0}
              >
                Export CSV
              </Button>
            }
          >
            <DepartmentComparisonBars data={departmentDistribution} />
          </Card>
        </div>
      </div>

      <Card title="Monthly Payroll Breakdown" subtitle="Gross, deductions and net for each processed cycle">
        <Table columns={PAYROLL_COLUMNS} rows={payrollTrend} getRowKey={(point) => `${point.periodYear}-${point.periodMonth}`} emptyTitle="No processed payroll runs yet" emptyDescription="Processed payroll cycles will appear here for review and export." />
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Card>
      <p className="text-secondary-hz mb-1" style={{ fontSize: 'var(--hz-text-sm)' }}>
        {label}
      </p>
      <p style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 0 }}>{value}</p>
    </Card>
  );
}
