export default function Badge({ variant = 'neutral', dot = false, children, className = '', ...rest }) {
  return <span className={`hz-badge hz-badge--${variant} ${dot ? 'hz-badge--dot' : ''} ${className}`.trim()} {...rest}>{children}</span>;
}
