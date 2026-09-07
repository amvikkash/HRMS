import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { candidatesApi } from '../../api/endpoints/recruitment';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';
import ErrorBanner from '../../components/ui/ErrorBanner';

const DECISIONS = [
  { value: 'SHORTLISTED', label: 'Shortlist', variant: 'success' },
  { value: 'HOLD', label: 'Hold', variant: 'warning' },
  { value: 'REJECTED', label: 'Reject', variant: 'danger' },
];

export default function ReviewCandidateModal({ candidate, onClose }) {
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState(null);
  const [rating, setRating] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState(null);

  const review = useMutation({
    mutationFn: () => candidatesApi.review(candidate.id, { decision, rating: rating || null, remarks: remarks || null, rejectionReason: rejectionReason || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not save the review.'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!decision) {
      setError('Please choose Shortlist, Hold, or Reject.');
      return;
    }
    review.mutate();
  }

  return (
    <Dialog open onClose={onClose} title="Review Application" description={candidate.fullName} size="md">
      <form onSubmit={handleSubmit}>
        {error && (
          <ErrorBanner>{error}</ErrorBanner>
        )}

        <div className="mb-3">
          <label className="hz-form-label">Decision</label>
          <div className="d-flex gap-2">
            {DECISIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                className={`btn ${decision === d.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setDecision(d.value)}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="hz-form-label">Rating (optional)</label>
          <div className="d-flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="btn btn-light border-0 p-1"
                onClick={() => setRating(n === rating ? 0 : n)}
                aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
                aria-pressed={n <= rating}
              >
                <Star size={22} fill={n <= rating ? 'var(--hz-warning-500)' : 'none'} color={n <= rating ? 'var(--hz-warning-500)' : 'var(--hz-border)'} />
              </button>
            ))}
          </div>
        </div>

        <FormField as="textarea" label="Remarks (optional)" rows={3} value={remarks} onChange={setRemarks} placeholder="Screening notes for the pipeline history…" />

        {decision === 'REJECTED' && (
          <FormField as="textarea" label="Rejection Reason (optional)" rows={2} value={rejectionReason} onChange={setRejectionReason} />
        )}

        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={review.isPending}>Save Review</Button>
        </div>
      </form>
    </Dialog>
  );
}
