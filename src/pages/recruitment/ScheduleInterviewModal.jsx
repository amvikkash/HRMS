import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { interviewsApi } from '../../api/endpoints/recruitment';
import { employeesApi } from '../../api/endpoints/employees';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';

const ROUND_BY_STAGE = { ROUND1: { number: 1, label: 'Round 1 - HR Interview' }, ROUND2: { number: 2, label: 'Round 2 - Hiring Manager Interview' }, ROUND3: { number: 3, label: 'Round 3 - Final / Management Interview' } };

export default function ScheduleInterviewModal({ candidate, onClose }) {
  const queryClient = useQueryClient();
  const round = ROUND_BY_STAGE[candidate.stage];
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.list() });
  const [scheduledAt, setScheduledAt] = useState('');
  const [interviewerId, setInterviewerId] = useState('');
  const [mode, setMode] = useState('VIDEO');
  const [error, setError] = useState(null);

  const schedule = useMutation({
    mutationFn: () =>
      interviewsApi.schedule({
        candidateId: candidate.id,
        roundNumber: round.number,
        scheduledAt,
        interviewerId: interviewerId || null,
        mode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', candidate.id] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not schedule the interview.'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    schedule.mutate();
  }

  if (!round) return null;

  return (
    <Dialog open onClose={onClose} title="Schedule Interview" description={`${candidate.fullName} · ${round.label}`} size="md">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-3 px-3 py-2" style={{ background: 'var(--hz-danger-50)', color: 'var(--hz-danger-600)', borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        <FormField label="Date & Time" type="datetime-local" required value={scheduledAt} onChange={setScheduledAt} />

        <FormField as="select" label="Interviewer" value={interviewerId} onChange={setInterviewerId}>
          <option value="">Select interviewer</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.fullName}</option>
          ))}
        </FormField>

        <FormField as="select" label="Mode" value={mode} onChange={setMode}>
          <option value="VIDEO">Video Call</option>
          <option value="PHONE">Phone Call</option>
          <option value="IN_PERSON">In Person</option>
        </FormField>

        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={schedule.isPending}>Schedule</Button>
        </div>
      </form>
    </Dialog>
  );
}
