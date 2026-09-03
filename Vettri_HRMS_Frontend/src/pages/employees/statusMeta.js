export const STATUS_META = {
  'Active': { label: 'Active', variant: 'success' },
  'On Leave': { label: 'On Leave', variant: 'warning' },
  'Notice Period': { label: 'Notice Period', variant: 'warning' },
  'Resigned': { label: 'Resigned', variant: 'neutral' },
  'Terminated': { label: 'Terminated', variant: 'danger' },
  // Legacy HaodaAsset sub-stages that can still appear in the shared column;
  // shown distinctly for display, but NOT offered in the Change Status
  // dropdown below since the backend's updateStatus endpoint only accepts
  // the 5 canonical statuses above.
  'Exit Clearance': { label: 'Notice Period (Exit Clearance)', variant: 'warning' },
  'Assets Returned': { label: 'Notice Period (Assets Returned)', variant: 'warning' },
};

/** The subset of STATUS_META the "Change Status" dropdown should offer - matches EmploymentStatus.VALID_STATUSES on the backend. */
export const SELECTABLE_STATUSES = ['Active', 'On Leave', 'Notice Period', 'Resigned', 'Terminated'];

export const EMPLOYMENT_TYPE_LABEL = {
  FULL_TIME: 'Full-Time',
  PART_TIME: 'Part-Time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
};

export function statusMeta(status) {
  return STATUS_META[status] || { label: status, variant: 'neutral' };
}
