import { useState } from 'react';
import { formatCompactCurrency, formatCurrency } from '../../../utils/formatCurrency';

/**
 * Smooth gradient area chart, hand-built with SVG (no charting dependency
 * is installed in this project - see the design_review note in this
 * module's other chart components). Renders {@code points} as
 * [{ label, value }], oldest first.
 */
export default function PayrollTrendChart({ points = [], height = 260 }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (points.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height, color: 'var(--hz-text-muted)', fontSize: 'var(--hz-text-sm)' }}>
        No processed payroll runs yet - trend appears once payroll has been run at least once.
      </div>
    );
  }

  const width = 720;
  const padX = 28;
  const padTop = 24;
  const padBottom = 32;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;

  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(0, ...values);
  const range = max - min || 1;

  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: padX + stepX * i,
    y: padTop + plotH - ((p.value - min) / range) * plotH,
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${padTop + plotH} L ${coords[0].x.toFixed(1)} ${padTop + plotH} Z`;

  const gridLines = 4;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="hz-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--hz-primary-500)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--hz-primary-500)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hz-trend-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--hz-primary-400)" />
            <stop offset="100%" stopColor="var(--hz-primary-700)" />
          </linearGradient>
        </defs>

        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = padTop + (plotH / gridLines) * i;
          return <line key={i} x1={padX} y1={y} x2={width - padX} y2={y} stroke="var(--hz-border)" strokeDasharray="3 5" />;
        })}

        <path d={areaPath} fill="url(#hz-trend-fill)" />
        <path d={linePath} fill="none" stroke="url(#hz-trend-line)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {coords.map((c, i) => (
          <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
            <rect x={c.x - stepX / 2} y={padTop} width={stepX || plotW} height={plotH} fill="transparent" />
            <circle
              cx={c.x}
              cy={c.y}
              r={hoverIndex === i ? 5.5 : 3.5}
              fill="var(--hz-bg-surface)"
              stroke="var(--hz-primary-600)"
              strokeWidth={2}
              style={{ transition: 'r 120ms ease' }}
            />
            <text x={c.x} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--hz-text-muted)">
              {c.label}
            </text>
          </g>
        ))}
      </svg>

      {hoverIndex !== null && (
        <div
          className="hz-card"
          style={{
            position: 'absolute',
            left: `min(${(coords[hoverIndex].x / width) * 100}%, calc(100% - 150px))`,
            top: Math.max(0, coords[hoverIndex].y - 66),
            padding: '8px 12px',
            pointerEvents: 'none',
            boxShadow: 'var(--hz-shadow-lg)',
            zIndex: 5,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--hz-text-muted)', fontWeight: 600 }}>{coords[hoverIndex].label}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--hz-text-primary)' }}>{formatCurrency(coords[hoverIndex].value)}</div>
        </div>
      )}

      <div className="d-flex justify-content-between mt-1" style={{ fontSize: 11, color: 'var(--hz-text-muted)' }}>
        <span>{formatCompactCurrency(min)}</span>
        <span>{formatCompactCurrency(max)}</span>
      </div>
    </div>
  );
}
