const VARIANT_CLASS = {
  primary: 'btn-primary',
  secondary: 'btn-outline-secondary',
  danger: 'btn-danger',
  ghost: 'btn-light',
  link: 'btn-link',
};

export default function Button({
  variant = 'primary',
  size,
  loading = false,
  disabled = false,
  icon: Icon,
  children,
  className = '',
  ...rest
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  return (
    <button
      className={`btn ${VARIANT_CLASS[variant] || VARIANT_CLASS.primary} ${sizeClass} d-inline-flex align-items-center gap-2 ${className}`}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className="hz-button__spinner spinner-border spinner-border-sm" role="status" aria-hidden="true" />}
      {!loading && Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}
