export const LEAVE_STATUS_META = {
  PENDING: { label: 'Pending', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
};

export function leaveStatusMeta(status) {
  return LEAVE_STATUS_META[status] || { label: status, variant: 'neutral' };
}
