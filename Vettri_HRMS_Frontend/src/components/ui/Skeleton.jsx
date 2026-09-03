export function Skeleton({ width = '100%', height = 16, radius, className = '' }) {
  return (
    <div
      className={`hz-skeleton ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

/** A few stacked lines of decreasing width - stands in for a paragraph or card body while data loads. */
export function SkeletonText({ lines = 3 }) {
  return (
    <div className="d-flex flex-column gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

/** Stands in for a KPI/stat card while its data loads. */
export function SkeletonCard() {
  return (
    <div className="hz-card">
      <div className="hz-card__body d-flex flex-column gap-3">
        <Skeleton height={12} width="40%" />
        <Skeleton height={28} width="60%" />
        <Skeleton height={10} width="50%" />
      </div>
    </div>
  );
}

export default Skeleton;
