import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { leaveRequestsApi, leaveTypesApi } from '../../api/endpoints/leave';
import { employeesApi } from '../../api/endpoints/employees';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';

export default function ApplyLeaveModal({ onClose, defaultEmployeeId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    employeeId: defaultEmployeeId || '',
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [error, setError] = useState(null);

  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.list(), enabled: !defaultEmployeeId });
  const { data: leaveTypes = [] } = useQuery({ queryKey: ['leave-types'], queryFn: leaveTypesApi.list });

  const year = form.startDate ? new Date(form.startDate).getFullYear() : new Date().getFullYear();
  const { data: balances } = useQuery({
    queryKey: ['leave-balance', form.employeeId, year],
    queryFn: () => leaveRequestsApi.balance(form.employeeId, year),
    enabled: !!form.employeeId,
  });

  const selectedBalance = useMemo(
    () => balances?.find((b) => String(b.leaveTypeId) === String(form.leaveTypeId)),
    [balances, form.leaveTypeId]
  );

  const apply = useMutation({
    mutationFn: leaveRequestsApi.apply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not submit leave request'),
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    apply.mutate(form);
  }

  return (
    <Dialog open onClose={onClose} title="Apply Leave" size="md" hasUnsavedChanges={Object.values(form).some(Boolean) && !apply.isSuccess}>
      <form onSubmit={handleSubmit}>
        {error && (
          <ErrorBanner>{error}</ErrorBanner>
        )}

        {!defaultEmployeeId && <FormField as="select" label="Employee" required value={form.employeeId} onChange={(v) => set('employeeId', v)}>
          <option value="">Select employee</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeCode})</option>)}
        </FormField>}

        <FormField as="select" label="Leave Type" required value={form.leaveTypeId} onChange={(v) => set('leaveTypeId', v)} hint={selectedBalance ? `${selectedBalance.remainingDays} of ${selectedBalance.allocatedDays + selectedBalance.carriedForwardDays} day(s) remaining in ${year}` : undefined}>
          <option value="">Select leave type</option>
          {leaveTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </FormField>

        <div className="row g-3 mb-3">
          <FormField col={6} label="Start Date" type="date" required value={form.startDate} onChange={(v) => set('startDate', v)} />
          <FormField col={6} label="End Date" type="date" required value={form.endDate} onChange={(v) => set('endDate', v)} />
        </div>

        <FormField as="textarea" label="Reason (optional)" rows={2} value={form.reason} onChange={(v) => set('reason', v)} />

        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={apply.isPending}>
            Submit Request
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
