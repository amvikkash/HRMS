import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { payrollApi } from '../../../api/endpoints/salary';
import Button from '../../../components/ui/Button';
import Dialog from '../../../components/ui/Dialog';
import FormField from '../../../components/ui/FormField';
import ErrorBanner from '../../../components/ui/ErrorBanner';
import { useToast } from '../../../components/ui/Toast';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function NewPayrollRunModal({ onClose }) {
  const now = new Date();
  const toast = useToast();
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [payDate, setPayDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState(null);

  const createRun = useMutation({
    mutationFn: payrollApi.createRun,
    onSuccess: (data) => {
      toast.success(`Payroll run opened for ${MONTHS[periodMonth - 1]} ${periodYear}`);
      onClose(data.run.id);
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not create this payroll run'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    createRun.mutate({ periodMonth, periodYear, payDate: payDate || null, remarks });
  }

  return (
    <Dialog
      open
      onClose={() => onClose(null)}
      title="New Payroll Run"
      description="Every actively-paid employee is included automatically"
      size="sm"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <ErrorBanner>{error}</ErrorBanner>
        )}

        <div className="row g-3 mb-3">
          <FormField as="select" col={7} label="Period Month" value={periodMonth} onChange={(v) => setPeriodMonth(Number(v))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </FormField>
          <FormField col={5} label="Year" type="number" value={periodYear} onChange={(v) => setPeriodYear(Number(v))} />
          <FormField col={12} label="Planned Pay Date (optional)" type="date" value={payDate} onChange={setPayDate} />
          <FormField col={12} label="Remarks (optional)" value={remarks} onChange={setRemarks} />
        </div>

        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button variant="secondary" type="button" onClick={() => onClose(null)}>
            Cancel
          </Button>
          <Button type="submit" loading={createRun.isPending}>
            Open Run
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
