import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { candidatesApi } from '../../api/endpoints/recruitment';
import { employeesApi } from '../../api/endpoints/employees';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';

/**
 * "Select for Manager Round" from the HR interview decision. Distinct
 * from AdvanceCandidateModal's generic stage changes because this one
 * needs the hiring manager + schedule + Meet link the backend requires
 * to create the Round 2 interview and send both assignment emails - see
 * CandidateService.assignManagerRound.
 */
export default function AssignManagerModal({ candidate, onClose }) {
  const queryClient = useQueryClient();
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.list() });

  const [managerEmployeeId, setManagerEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState(null);

  const assign = useMutation({
    mutationFn: () =>
      candidatesApi.assignManager(candidate.id, {
        managerEmployeeId: Number(managerEmployeeId),
        scheduledAt: `${date}T${time}`,
        meetingLink,
        instructions: instructions || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidate.id] });
      queryClient.invalidateQueries({ queryKey: ['interviews', candidate.id] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not assign the manager round.'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!managerEmployeeId || !date || !time || !meetingLink.trim()) {
      setError('Hiring manager, date, time, and Google Meet link are all required.');
      return;
    }
    assign.mutate();
  }

  return (
    <Dialog open onClose={onClose} title="Assign Manager Round" description={`${candidate.fullName} · ${candidate.jobOpeningTitle}`} size="md">
      <form onSubmit={handleSubmit}>
        {error && (
          <ErrorBanner>{error}</ErrorBanner>
        )}

        <FormField as="select" label="Hiring Manager" required value={managerEmployeeId} onChange={setManagerEmployeeId}>
          <option value="">Select hiring manager</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.fullName}</option>
          ))}
        </FormField>

        <div className="row g-2 mb-3">
          <FormField col={6} label="Interview Date" type="date" required value={date} onChange={setDate} />
          <FormField col={6} label="Interview Time" type="time" required value={time} onChange={setTime} />
        </div>

        <FormField
          label="Google Meet Link"
          type="url"
          required
          placeholder="https://meet.google.com/xxx-xxxx-xxx"
          value={meetingLink}
          onChange={setMeetingLink}
        />

        <FormField
          as="textarea"
          label="Interview Instructions (optional)"
          rows={2}
          placeholder="Shown to the hiring manager, not the candidate"
          value={instructions}
          onChange={setInstructions}
        />

        <div className="mb-3 px-3 py-2 d-flex align-items-start gap-2" style={{ background: 'var(--hz-gray-50)', borderRadius: 8, fontSize: 12, color: 'var(--hz-text-secondary)' }}>
          <Send size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <span>Assigning will email both the hiring manager and the candidate with these details automatically.</span>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={assign.isPending}>Assign</Button>
        </div>
      </form>
    </Dialog>
  );
}
