import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, PlayCircle, Wallet, PauseCircle, Play, XCircle, Receipt, Download } from 'lucide-react';
import { payrollApi } from '../../api/endpoints/salary';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonText } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/formatCurrency';
import { exportToCsv } from '../../utils/exportToCsv';
import PayrollStatusBadge from './components/PayrollStatusBadge';
import NewPayrollRunModal from './components/NewPayrollRunModal';
import PageHeader from '../../components/ui/PageHeader';

export default function PayrollProcessing() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [showNewRun, setShowNewRun] = useState(false);

  const { data: runs = [], isLoading: loadingRuns } = useQuery({ queryKey: ['payroll-runs'], queryFn: payrollApi.listRuns });

  const activeRunId = selectedRunId ?? runs[0]?.id ?? null;

  const { data: runDetail, isLoading: loadingDetail, isError, refetch } = useQuery({
    queryKey: ['payroll-run', activeRunId],
    queryFn: () => payrollApi.getRun(activeRunId),
    enabled: !!activeRunId,
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
    queryClient.invalidateQueries({ queryKey: ['payroll-run', activeRunId] });
    queryClient.invalidateQueries({ queryKey: ['salary-dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['salary-employees'] });
  }

  const holdMutation = useMutation({
    mutationFn: ({ itemId, onHold }) => payrollApi.setItemHold(activeRunId, itemId, { onHold }),
    onSuccess: invalidateAll,
    onError: (err) => toast.error(err.response?.data?.message || 'Could not update that employee'),
  });

  const processMutation = useMutation({
    mutationFn: () => payrollApi.process(activeRunId),
    onSuccess: () => {
      invalidateAll();
      toast.success('Payroll processed successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not process this run'),
  });

  const markPaidMutation = useMutation({
    mutationFn: () => payrollApi.markPaid(activeRunId, {}),
    onSuccess: () => {
      invalidateAll();
      toast.success('Payroll marked as paid');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not mark this run as paid'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => payrollApi.cancel(activeRunId),
    onSuccess: () => {
      setSelectedRunId(null);
      invalidateAll();
      toast.success('Draft payroll run cancelled');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not cancel this run'),
  });

  const items = runDetail?.items || [];
  const run = runDetail?.run;

  const counts = useMemo(() => {
    const byStatus = { PENDING: 0, ON_HOLD: 0, PROCESSED: 0, PAID: 0 };
    items.forEach((i) => {
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    });
    return byStatus;
  }, [items]);

  function handleExport() {
    exportToCsv(
      `payroll-${run?.periodLabel?.replace(' ', '-') || 'run'}.csv`,
      items.map((i) => ({
        'Employee ID': i.employeeCode,
        'Employee Name': i.employeeName,
        Department: i.departmentName || '',
        'Gross Salary': i.grossSalary,
        'Total Deductions': i.totalDeductions,
        'Net Salary': i.netSalary,
        Status: i.status,
        'Payment Date': i.paymentDate || '',
      }))
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader eyebrow="Payroll" title="Payroll Processing" description="Open, review and run payroll for a pay period" actions={<Button icon={PlusCircle} onClick={() => setShowNewRun(true)}>New Payroll Run</Button>} />

      <div className="row g-3">
        <div className="col-12 col-lg-3">
          <Card bodyClassName="p-0" title="Payroll Runs">
            {loadingRuns && (
              <div className="p-3">
                <SkeletonText lines={4} />
              </div>
            )}
            {!loadingRuns && runs.length === 0 && (
              <div className="p-3">
                <EmptyState icon={Receipt} title="No payroll runs yet" description="Start your first run for the current period." />
              </div>
            )}
            {!loadingRuns &&
              runs.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRunId(r.id)}
                  className="w-100 d-flex align-items-center justify-content-between p-3 border-0 text-start"
                  style={{
                    background: activeRunId === r.id ? 'var(--hz-primary-50)' : 'transparent',
                    borderBottom: '1px solid var(--hz-border)',
                    borderLeft: activeRunId === r.id ? '3px solid var(--hz-primary-600)' : '3px solid transparent',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>{r.periodLabel}</div>
                    <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{r.totalEmployees} employees</div>
                  </div>
                  <PayrollStatusBadge status={r.status} />
                </button>
              ))}
          </Card>
        </div>

        <div className="col-12 col-lg-9">
          {!activeRunId && (
            <Card>
              <EmptyState icon={PlayCircle} title="No run selected" description="Create a payroll run or select one from the list to get started." />
            </Card>
          )}

          {activeRunId && isError && <ErrorState description="Couldn't load this payroll run." onRetry={refetch} />}

          {activeRunId && !isError && (
            <div className="d-flex flex-column gap-3">
              <Card>
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <h3 style={{ fontSize: 'var(--hz-text-lg)', fontWeight: 700, margin: 0 }}>{run?.periodLabel}</h3>
                      {run && <PayrollStatusBadge status={run.status} />}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--hz-text-muted)', marginBottom: 0 }}>
                      {counts.PENDING} pending &middot; {counts.ON_HOLD} on hold &middot; {counts.PROCESSED} processed &middot; {counts.PAID} paid
                    </p>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary d-inline-flex align-items-center gap-2" onClick={handleExport} disabled={items.length === 0}>
                      <Download size={16} /> Export
                    </button>
                    {run?.status === 'DRAFT' && (
                      <>
                        <Button variant="secondary" icon={XCircle} onClick={() => cancelMutation.mutate()} loading={cancelMutation.isPending}>
                          Cancel Run
                        </Button>
                        <Button icon={PlayCircle} onClick={() => processMutation.mutate()} loading={processMutation.isPending}>
                          Process Payroll
                        </Button>
                      </>
                    )}
                    {run?.status === 'PROCESSED' && (
                      <Button icon={Wallet} onClick={() => markPaidMutation.mutate()} loading={markPaidMutation.isPending}>
                        Mark as Paid
                      </Button>
                    )}
                  </div>
                </div>

                {run && (
                  <div className="row g-3 mt-1">
                    <TotalStat label="Total Gross" value={run.totalGross} />
                    <TotalStat label="Total Deductions" value={run.totalDeductions} />
                    <TotalStat label="Total Net Payout" value={run.totalNet} emphasize />
                  </div>
                )}
              </Card>

              <Card bodyClassName="p-0" title="Employees in this Run">
                {loadingDetail && (
                  <div className="p-3">
                    <SkeletonText lines={6} />
                  </div>
                )}
                {!loadingDetail && (
                  <div className="table-responsive">
                    <table className="table align-middle mb-0" style={{ fontSize: 'var(--hz-text-sm)' }}>
                      <thead>
                        <tr>
                          <th className="px-3 py-3 text-secondary-hz" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                            Employee
                          </th>
                          <th className="px-3 py-3 text-secondary-hz" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                            Gross
                          </th>
                          <th className="px-3 py-3 text-secondary-hz" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                            Deductions
                          </th>
                          <th className="px-3 py-3 text-secondary-hz" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                            Net
                          </th>
                          <th className="px-3 py-3 text-secondary-hz" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                            Status
                          </th>
                          <th className="px-3 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((i) => (
                          <tr key={i.id} style={{ borderBottom: '1px solid var(--hz-border)' }}>
                            <td className="px-3 py-3">
                              <div style={{ fontWeight: 600 }}>{i.employeeName}</div>
                              <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{i.employeeCode}</div>
                            </td>
                            <td className="px-3 py-3">{formatCurrency(i.grossSalary)}</td>
                            <td className="px-3 py-3">{formatCurrency(i.totalDeductions)}</td>
                            <td className="px-3 py-3" style={{ fontWeight: 600 }}>
                              {formatCurrency(i.netSalary)}
                            </td>
                            <td className="px-3 py-3">
                              <PayrollStatusBadge status={i.status} />
                            </td>
                            <td className="px-3 py-3 text-end">
                              {run?.status === 'DRAFT' && (i.status === 'PENDING' || i.status === 'ON_HOLD') && (
                                <button
                                  className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                                  onClick={() => holdMutation.mutate({ itemId: i.id, onHold: i.status !== 'ON_HOLD' })}
                                  disabled={holdMutation.isPending}
                                >
                                  {i.status === 'ON_HOLD' ? (
                                    <>
                                      <Play size={13} /> Release
                                    </>
                                  ) : (
                                    <>
                                      <PauseCircle size={13} /> Hold
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {items.length === 0 && (
                      <div className="p-4">
                        <EmptyState title="No employees in this run" description="Every actively-paid employee is included automatically when a run is created." />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {showNewRun && (
        <NewPayrollRunModal
          onClose={(createdRunId) => {
            setShowNewRun(false);
            if (createdRunId) {
              setSelectedRunId(createdRunId);
              invalidateAll();
            }
          }}
        />
      )}
    </div>
  );
}

function TotalStat({ label, value, emphasize }) {
  return (
    <div className="col-6 col-md-4">
      <p style={{ fontSize: 11, color: 'var(--hz-text-muted)', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ fontSize: emphasize ? 'var(--hz-text-xl)' : 'var(--hz-text-base)', fontWeight: 700, margin: 0, color: emphasize ? 'var(--hz-primary-700)' : 'var(--hz-text-primary)' }}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
