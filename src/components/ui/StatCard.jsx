import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Card from './Card';
import { Skeleton } from './Skeleton';

export default function StatCard({ label, value, detail, trend, trendLabel, trendDirection = 'up', icon: Icon, accent = 'primary', loading = false, className = '' }) {
  return (
    <Card className={`hz-stat-card hz-stat-card--${accent} ${className}`.trim()}>
      <div className="hz-stat-card__topline">
        <span className="hz-stat-card__label">{label}</span>
        {Icon && <span className="hz-stat-card__icon" aria-hidden="true"><Icon size={18} /></span>}
      </div>
      {loading ? (
        <div className="d-flex flex-column gap-2 mt-2"><Skeleton height={30} width="52%" /><Skeleton height={12} width="68%" /></div>
      ) : (
        <>
          <strong className="hz-stat-card__value">{value}</strong>
          {(detail || trend !== undefined) && (
            <div className="hz-stat-card__detail">
              {trend !== undefined && <span className={`hz-stat-card__trend hz-stat-card__trend--${trendDirection}`}><span className="visually-hidden">{trendDirection === 'down' ? 'Down' : 'Up'} </span>{trendDirection === 'down' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}{trend}{trendLabel && ` ${trendLabel}`}</span>}
              {detail && <span>{detail}</span>}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
