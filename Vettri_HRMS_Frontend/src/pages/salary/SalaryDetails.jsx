import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, History, Receipt } from 'lucide-react';
import { employeeSalaryApi } from '../../api/endpoints/salary';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonText } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatCurrency';
import PayrollStatusBadge from './components/PayrollStatusBadge';
import AssignSalaryStructureModal from './components/AssignSalaryStructureModal';
import { useBreadcrumbLabel } from '../../components/layout/BreadcrumbContext';

/**
 * Serves two routes with one component:
 *  - /salary/employees/:employeeId - HR/Admin looking up any employee (SALARY_VIEW)
 *  - /my-payslip - an employee viewing their own (no employeeId in the URL,
 *    resolved from the logged-in user instead - see EmployeeSalaryController#
 *    getDetail's isSelf bypass on the backend for the matching permission check)
 * Management actions (Revise/Define Structure) and the HR-only back link
 * are hidden unless the viewer actually has SALARY_MANAGE/SALARY_VIEW -
 * without that, a self-viewing employee would see a button that 403s.
 */
export default function SalaryDetails() {
  const { employeeId: routeEmployeeId } = useParams();
  const { user, hasPermission } = useAuth();
  const employeeId = routeEmployeeId || user?.employeeId;
  const canManage = hasPermission('SALARY_MANAGE');
  const canViewList = hasPermission('SALARY_VIEW');
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['salary-employee-detail', employeeId],
    queryFn: () => employeeSalaryApi.getDetail(employeeId),
    enabled: !!employeeId,
  });

  useBreadcrumbLabel(data?.employeeName);

  if (!employeeId) {
    return (
      <Card>
        <EmptyState
          icon={Receipt}
          title="No linked employee record"
          description="This login isn't linked to an employee profile, so there's no payslip to show."
        />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <SkeletonText lines={8} />
      </Card>
    );
  }

  if (isError || !data) {
    return <ErrorState description="Couldn't load this employee's salary details." onRetry={refetch} />;
  }

  const structure = data.currentStructure;

  return (
    <div className="d-flex flex-column gap-4">
      {canViewList ? (
        <Link to="/salary/employees" className="d-inline-flex align-items-center gap-1 text-decoration-none" style={{ fontSize: 13, color: 'var(--hz-text-secondary)', width: 'fit-content' }}>
          <ArrowLeft size={14} /> Back to Employee Salary List
        </Link>
      ) : (
        <Link to="/dashboard" className="d-inline-flex align-items-center gap-1 text-decoration-none" style={{ fontSize: 13, color: 'var(--hz-text-secondary)', width: 'fit-content' }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      )}

      <div className="hz-greeting">
        <div className="position-relative d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <Avatar name={data.employeeName} src={data.profilePhotoUrl} size="xl" />
            <div>
              <h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 4, color: '#fff' }}>{data.employeeName}</h1>
              <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 0, fontSize: 'var(--hz-text-sm)' }}>
                {data.employeeCode} &middot; {data.designationTitle || '—'} &middot; {data.departmentName || '—'}
              </p>
            </div>
          </div>
          {canManage && (
            <button className="btn btn-light" onClick={() => setModalOpen(true)}>
              {structure ? 'Revise Structure' : 'Define Structure'}
            </button>
          )}
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <Card title="Current Compensation" subtitle={structure ? `Effective from ${new Date(structure.effectiveFrom).toLocaleDateString()}` : undefined}>
            {!structure && <EmptyState icon={FileSpreadsheet} title="No salary structure defined" description="Define a structure to include this employee in payroll." />}
            {structure && (
              <div className="d-flex flex-column gap-3">
                <div
                  className="d-flex flex-wrap gap-4 p-3"
                  style={{ background: 'var(--hz-gradient-surface)', border: '1px solid var(--hz-border)', borderRadius: 'var(--hz-radius-lg)' }}
                >
                  <SummaryTile label="Gross Salary" value={structure.grossSalary} />
                  <SummaryTile label="Total Deductions" value={structure.totalDeductions} tone="danger" />
                  <SummaryTile label="Net Salary" value={structure.netSalary} tone="primary" />
                </div>
                <div className="row g-3">
                  {Object.entries(structure.components).map(([key, value]) => (
                    <div className="col-6 col-md-4" key={key}>
                      <p style={{ fontSize: 11, color: 'var(--hz-text-muted)', marginBottom: 2 }}>{splitLabel(key)}</p>
                      <p style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, marginBottom: 0 }}>{formatCurrency(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="col-12 col-lg-5">
          <Card title="Structure History" subtitle="Every revision, most recent first">
            {(!data.structureHistory || data.structureHistory.length === 0) && <EmptyState icon={History} title="No history yet" />}
            {data.structureHistory?.length > 0 && (
              <div className="d-flex flex-column gap-2">
                {data.structureHistory.map((h) => (
                  <div key={h.id} className="d-flex align-items-center justify-content-between p-2" style={{ borderBottom: '1px solid var(--hz-border)' }}>
                    <div>
                      <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>{new Date(h.effectiveFrom).toLocaleDateString()}</span>
                      {h.active && (
                        <span className="ms-2 badge text-bg-light" style={{ fontSize: 10 }}>
                          Current
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>{formatCurrency(h.netSalary)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card title="Payroll History" subtitle="Every payroll run this employee has appeared in">
        {(!data.payrollHistory || data.payrollHistory.length === 0) && (
          <EmptyState icon={Receipt} title="No payroll history yet" description="This employee hasn't appeared in a processed payroll run yet." />
        )}
        {data.payrollHistory?.length > 0 && (
          <div className="table-responsive">
            <table className="table align-middle mb-0" style={{ fontSize: 'var(--hz-text-sm)' }}>
              <thead>
                <tr>
                  <th className="text-secondary-hz" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                    Net Salary
                  </th>
                  <th className="text-secondary-hz" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th className="text-secondary-hz" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                    Payment Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.payrollHistory.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.netSalary)}</td>
                    <td>
                      <PayrollStatusBadge status={p.status} />
                    </td>
                    <td>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modalOpen && (
        <AssignSalaryStructureModal
          employee={{ employeeId: data.employeeId, employeeName: data.employeeName, employeeCode: data.employeeCode }}
          onClose={(saved) => {
            setModalOpen(false);
            if (saved) refetch();
          }}
        />
      )}
    </div>
  );
}

function SummaryTile({ label, value, tone }) {
  const color = tone === 'primary' ? 'var(--hz-primary-700)' : tone === 'danger' ? 'var(--hz-danger-600)' : 'var(--hz-text-primary)';
  return (
    <div>
      <p style={{ fontSize: 11, color: 'var(--hz-text-muted)', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ fontSize: 'var(--hz-text-lg)', fontWeight: 700, margin: 0, color }}>{formatCurrency(value)}</p>
    </div>
  );
}

function splitLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}
