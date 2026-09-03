export default function Card({ title, subtitle, actions, hoverable = false, children, className = '', bodyClassName = '' }) {
  return (
    <div className={`hz-card ${hoverable ? 'hz-card--hoverable' : ''} ${className}`}>
      {(title || actions) && (
        <div className="hz-card__header">
          <div>
            {title && <h3 className="hz-card__title">{title}</h3>}
            {subtitle && <p className="hz-card__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="d-flex align-items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`hz-card__body ${bodyClassName}`}>{children}</div>
    </div>
  );
}
