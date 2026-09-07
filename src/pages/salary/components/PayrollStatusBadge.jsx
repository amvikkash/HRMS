import Badge from '../../../components/ui/Badge';

const STATUS_META = {
  NOT_CONFIGURED: { label: 'Not Configured', variant: 'neutral' },
  READY: { label: 'Ready', variant: 'info' },
  PENDING: { label: 'Pending', variant: 'warning' },
  ON_HOLD: { label: 'On Hold', variant: 'danger' },
  PROCESSED: { label: 'Processed', variant: 'info' },
  PAID: { label: 'Paid', variant: 'success' },
  DRAFT: { label: 'Draft', variant: 'neutral' },
  CANCELLED: { label: 'Cancelled', variant: 'danger' },
  NOT_STARTED: { label: 'Not Started', variant: 'neutral' },
};

export default function PayrollStatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || 'Unknown', variant: 'neutral' };
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
