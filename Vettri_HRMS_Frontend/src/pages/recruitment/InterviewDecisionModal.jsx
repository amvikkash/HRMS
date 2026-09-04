import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { interviewsApi } from '../../api/endpoints/recruitment';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';

// Mirrors InterviewService.submitDecision's per-round decision vocabulary on the backend.
const DECISIONS_BY_ROUND = {
  2: [
    { value: 'SELECT_FOR_FINAL', label: 'Select for Final Round', variant: 'btn-primary' },
    { value: 'REJECTED', label: 'Reject', variant: 'btn-danger' },
  ],
  3: [
    { value: 'APPROVED_FOR_OFFER', label: 'Approve for Offer', variant: 'btn-primary' },
    { value: 'REJECTED', label: 'Reject', variant: 'btn-danger' },
  ],
};

function RatingInput({ label, value, onChange, required }) {
  return (
    <div className="mb-3">
      <label className="hz-form-label">
        {label} {required && '*'}
      </label>
      <div className="d-flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="btn btn-light border-0 p-1"
            onClick={() => onChange(n)}
            aria-label={`Rate ${n} star${n === 1 ? '' : 's'} for ${label}`}
            aria-pressed={n <= value}
          >
            <Star size={20} fill={n <= value ? 'var(--hz-warning-500)' : 'none'} color={n <= value ? 'var(--hz-warning-500)' : 'var(--hz-border)'} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function InterviewDecisionModal({ interview, onClose }) {
  const queryClient = useQueryClient();
  const options = DECISIONS_BY_ROUND[interview.roundNumber] || [];

  const [technicalRating, setTechnicalRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState(null);

  const submit = useMutation({
    mutationFn: () =>
      interviewsApi.submitDecision(interview.id, {
        technicalRating: technicalRating || null,
        communicationRating: communicationRating || null,
        overallRating,
        remarks: remarks || null,
        decision,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['interviews', interview.candidateId] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not submit the decision.'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!overallRating) {
      setError('Please give an overall rating.');
      return;
    }
    if (!decision) {
      setError('Please choose a decision.');
      return;
    }
    submit.mutate();
  }

  return (
    <Dialog open onClose={onClose} title="Interview Decision" description={interview.candidateName} size="md">
      <form onSubmit={handleSubmit}>
        {error && (
          <ErrorBanner>{error}</ErrorBanner>
        )}

        <RatingInput label="Technical Rating" value={technicalRating} onChange={setTechnicalRating} />
        <RatingInput label="Communication Rating" value={communicationRating} onChange={setCommunicationRating} />
        <RatingInput label="Overall Rating" value={overallRating} onChange={setOverallRating} required />

        <FormField as="textarea" label="Remarks" rows={3} value={remarks} onChange={setRemarks} />

        <div className="mb-3">
          <label className="hz-form-label">Decision *</label>
          <div className="d-flex flex-column gap-2">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`btn text-start ${decision === o.value ? o.variant : 'btn-outline-secondary'}`}
                onClick={() => setDecision(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submit.isPending}>Submit Decision</Button>
        </div>
      </form>
    </Dialog>
  );
}
