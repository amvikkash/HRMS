export default function FilterBar({ children, className = '', ...rest }) {
  return <div className={`hz-filter-bar d-flex align-items-center gap-2 flex-wrap ${className}`} role="toolbar" {...rest}>{children}</div>;
}
