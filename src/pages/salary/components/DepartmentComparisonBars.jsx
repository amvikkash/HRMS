import { formatCompactCurrency } from '../../../utils/formatCurrency';

/** Horizontal "Salary Expense by Department" comparison - headcount + total net salary per bar. */
export default function DepartmentComparisonBars({ data = [] }) {
  if (data.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--hz-text-muted)' }}>No department salary data yet.</p>;
  }

  const max = Math.max(...data.map((d) => Number(d.totalNetSalary || 0)), 1);

  return (
    <div className="d-flex flex-column gap-3">
      {data.map((d) => {
        const pct = Math.max(4, Math.round((Number(d.totalNetSalary || 0) / max) * 100));
        return (
          <div key={d.departmentName}>
            <div className="d-flex justify-content-between align-items-baseline mb-1">
              <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, color: 'var(--hz-text-primary)' }}>{d.departmentName}</span>
              <span style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>
                {d.headcount} employee{d.headcount === 1 ? '' : 's'} &middot; <strong style={{ color: 'var(--hz-text-secondary)' }}>{formatCompactCurrency(d.totalNetSalary)}</strong>
              </span>
            </div>
            <div style={{ height: 12, borderRadius: 999, background: 'var(--hz-gray-100)', overflow: 'hidden' }}>
              <div
                style={{
                  height: 12,
                  borderRadius: 999,
                  width: `${pct}%`,
                  background: 'var(--hz-gradient-primary)',
                  transition: 'width 600ms ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
