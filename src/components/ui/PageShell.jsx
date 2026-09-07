export default function PageShell({ children, className = '', ...props }) {
  return <div className={`hz-page-shell ${className}`.trim()} {...props}>{children}</div>;
}
