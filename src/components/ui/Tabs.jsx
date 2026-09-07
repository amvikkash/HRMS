export default function Tabs({ items, value, onChange, className = '', ariaLabel = 'Tabs' }) {
  return (
    <div className={`hz-tabs d-flex gap-1 overflow-auto ${className}`} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.key)}
            className={`hz-tab d-inline-flex align-items-center gap-2 ${active ? 'hz-tab--active' : ''}`}
          >
            {Icon && <Icon size={15} aria-hidden="true" />}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
