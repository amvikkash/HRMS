import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileSpreadsheet, History } from 'lucide-react';
import { employeesApi } from '../../api/endpoints/employees';
import { salaryStructuresApi } from '../../api/endpoints/salary';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import { formatCurrency } from '../../utils/formatCurrency';
import AssignSalaryStructureModal from './components/AssignSalaryStructureModal';

/** Pick-an-employee + define/revise-their-structure workspace. Also the entry point for browsing an employee's structure revision history. */
export default function SalaryStructurePage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: employees = [], isLoading } = useQuery({ queryKey: ['employees', search], queryFn: () => employeesApi.list(search || undefined) });

  const { data: currentStructure, refetch: refetchCurrent } = useQuery({
    queryKey: ['salary-structure-current', selected?.id],
    queryFn: () => salaryStructuresApi.getCurrent(selected.id),
    enabled: !!selected,
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['salary-structure-history', selected?.id],
    queryFn: () => salaryStructuresApi.getHistory(selected.id),
    enabled: !!selected,
  });

  const filteredEmployees = useMemo(() => employees, [employees]);

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 4 }}>Salary Structure</h1>
        <p className="text-secondary-hz mb-0" style={{ fontSize: 'var(--hz-text-sm)' }}>
          Select an employee to define or revise their compensation
        </p>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <Card bodyClassName="p-0">
            <div className="p-3" style={{ borderBottom: '1px solid var(--hz-border)' }}>
              <div className="input-group">
                <span className="input-group-text" style={{ background: 'var(--hz-gray-50)', border: '1px solid var(--hz-border)', borderRight: 'none' }}>
                  <Search size={15} style={{ color: 'var(--hz-text-muted)' }} />
                </span>
                <input type="text" className="form-control" placeholder="Search employees…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {!isLoading && filteredEmployees.length === 0 && (
                <div className="p-3">
                  <EmptyState title="No employees found" description="Try a different search term." />
                </div>
              )}
              {filteredEmployees.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className="w-100 d-flex align-items-center gap-2 p-3 border-0 text-start"
                  style={{
                    background: selected?.id === e.id ? 'var(--hz-primary-50)' : 'transparent',
                    borderBottom: '1px solid var(--hz-border)',
                    borderLeft: selected?.id === e.id ? '3px solid var(--hz-primary-600)' : '3px solid transparent',
                  }}
                >
                  <Avatar name={e.fullName} size="sm" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.fullName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{e.employeeCode}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="col-12 col-lg-8">
          {!selected && (
            <Card>
              <EmptyState icon={FileSpreadsheet} title="Pick an employee" description="Select someone from the list to view or set their salary structure." />
            </Card>
          )}

          {selected && (
            <div className="d-flex flex-column gap-3">
              <Card
                title={selected.fullName}
                subtitle={`${selected.employeeCode || ''}${selected.departmentName ? ' \u00b7 ' + selected.departmentName : ''}`}
                actions={
                  <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                    {currentStructure ? 'Revise Structure' : 'Define Structure'}
                  </button>
                }
              >
                {!currentStructure && (
                  <EmptyState icon={FileSpreadsheet} title="No salary structure yet" description="Define one to include this employee in payroll processing." />
                )}
                {currentStructure && (
                  <div className="d-flex flex-column gap-3">
                    <div
                      className="d-flex flex-wrap gap-4 p-3"
                      style={{ background: 'var(--hz-gradient-surface)', border: '1px solid var(--hz-border)', borderRadius: 'var(--hz-radius-lg)' }}
                    >
                      <SummaryTile label="Gross Salary" value={currentStructure.grossSalary} />
                      <SummaryTile label="Total Deductions" value={currentStructure.totalDeductions} tone="danger" />
                      <SummaryTile label="Net Salary" value={currentStructure.netSalary} tone="primary" />
                      <SummaryTile label="Effective From" value={new Date(currentStructure.effectiveFrom).toLocaleDateString()} isText />
                    </div>
                    <div className="row g-3">
                      {Object.entries(currentStructure.components).map(([key, value]) => (
                        <div className="col-6 col-md-4" key={key}>
                          <p style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'capitalize', marginBottom: 2 }}>{splitLabel(key)}</p>
                          <p style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, marginBottom: 0 }}>{formatCurrency(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card title="Revision History" subtitle="Every structure this employee has had">
                {history.length === 0 && <EmptyState icon={History} title="No history yet" />}
                {history.length > 0 && (
                  <div className="d-flex flex-column gap-2">
                    {history.map((h) => (
                      <div key={h.id} className="d-flex align-items-center justify-content-between p-2" style={{ borderBottom: '1px solid var(--hz-border)' }}>
                        <div>
                          <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>{new Date(h.effectiveFrom).toLocaleDateString()}</span>
                          {h.active && <span className="ms-2 badge text-bg-light" style={{ fontSize: 10 }}>Current</span>}
                          {h.notes && <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>{h.notes}</div>}
                        </div>
                        <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>{formatCurrency(h.netSalary)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {modalOpen && selected && (
        <AssignSalaryStructureModal
          employee={selected}
          onClose={(saved) => {
            setModalOpen(false);
            if (saved) {
              refetchCurrent();
              refetchHistory();
            }
          }}
        />
      )}
    </div>
  );
}

function SummaryTile({ label, value, tone, isText }) {
  const color = tone === 'primary' ? 'var(--hz-primary-700)' : tone === 'danger' ? 'var(--hz-danger-600)' : 'var(--hz-text-primary)';
  return (
    <div>
      <p style={{ fontSize: 11, color: 'var(--hz-text-muted)', fontWeight: 600, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ fontSize: 'var(--hz-text-lg)', fontWeight: 700, margin: 0, color }}>{isText ? value : formatCurrency(value)}</p>
    </div>
  );
}

function splitLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}
