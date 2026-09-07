import { formatCompactCurrency } from '../../../utils/formatCurrency';

const PALETTE = [
  'var(--hz-primary-600)',
  'var(--hz-accent-500)',
  'var(--hz-info-500)',
  'var(--hz-warning-500)',
  'var(--hz-primary-300)',
  'var(--hz-success-500)',
  'var(--hz-primary-800)',
  'var(--hz-danger-500)',
];

/** Donut chart of department -> total net salary, with a centered grand total and a legend. */
export default function DepartmentDonutChart({ data = [], size = 200, strokeWidth = 26 }) {
  const total = data.reduce((sum, d) => sum + Number(d.totalNetSalary || 0), 0);

  if (data.length === 0 || total === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: size, color: 'var(--hz-text-muted)', fontSize: 'var(--hz-text-sm)' }}>
        No department salary data yet.
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offsetAccumulator = 0;

  const segments = data.map((d, i) => {
    const value = Number(d.totalNetSalary || 0);
    const fraction = value / total;
    const dash = fraction * circumference;
    const segment = {
      ...d,
      color: PALETTE[i % PALETTE.length],
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -offsetAccumulator,
      percent: Math.round(fraction * 100),
    };
    offsetAccumulator += dash;
    return segment;
  });

  return (
    <div className="d-flex align-items-center gap-4 flex-wrap">
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--hz-gray-100)" strokeWidth={strokeWidth} />
            {segments.map((s) => (
              <circle
                key={s.departmentName}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeDasharray={s.dashArray}
                strokeDashoffset={s.dashOffset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray 600ms ease' }}
              />
            ))}
          </g>
        </svg>
        <div
          className="d-flex flex-column align-items-center justify-content-center"
          style={{ position: 'absolute', inset: 0, textAlign: 'center' }}
        >
          <span style={{ fontSize: 11, color: 'var(--hz-text-muted)', fontWeight: 600 }}>Total / mo</span>
          <span style={{ fontSize: 'var(--hz-text-lg)', fontWeight: 700, color: 'var(--hz-text-primary)' }}>{formatCompactCurrency(total)}</span>
        </div>
      </div>

      <div className="d-flex flex-column gap-2" style={{ flex: 1, minWidth: 160 }}>
        {segments.map((s) => (
          <div key={s.departmentName} className="d-flex align-items-center justify-content-between gap-2">
            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {s.departmentName}
              </span>
            </div>
            <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)', fontWeight: 600, flexShrink: 0 }}>{s.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
