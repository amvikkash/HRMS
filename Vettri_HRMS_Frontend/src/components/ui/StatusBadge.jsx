import Badge from './Badge';

const STATUS_VARIANTS = {
  ACTIVE: 'success',
  APPROVED: 'success',
  COMPLETED: 'success',
  PRESENT: 'success',
  PENDING: 'warning',
  PROCESSING: 'warning',
  DRAFT: 'neutral',
  INACTIVE: 'neutral',
  ARCHIVED: 'neutral',
  REJECTED: 'danger',
  FAILED: 'danger',
  ABSENT: 'danger',
  INTERVIEW: 'info',
};

function formatStatus(status) {
  return String(status || 'UNKNOWN').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function StatusBadge({ status, variant, dot = true, children, ...rest }) {
  return <Badge variant={variant || STATUS_VARIANTS[String(status || '').toUpperCase()] || 'neutral'} dot={dot} {...rest}>{children || formatStatus(status)}</Badge>;
}
