export default function Badge({ variant = 'neutral', dot = false, children }) {
  return <span className={`hz-badge hz-badge--${variant} ${dot ? 'hz-badge--dot' : ''}`}>{children}</span>;
}
