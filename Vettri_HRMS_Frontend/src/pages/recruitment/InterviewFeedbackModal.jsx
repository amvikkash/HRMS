import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { interviewsApi } from '../../api/endpoints/recruitment';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';

export default function InterviewFeedbackModal({ interview, candidateId, onClose }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(interview.rating || 0);
  const [feedback, setFeedback] = useState(interview.feedback || '');
  const [error, setError] = useState(null);

  const submit = useMutation({
    mutationFn: () => interviewsApi.submitFeedback(interview.id, { rating, feedback }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', candidateId] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not save feedback.'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!rating) {
      setError('Please give a rating.');
      return;
    }
    submit.mutate();
  }

  return (
    <Dialog open onClose={onClose} title="Interview Feedback" size="md">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-3 px-3 py-2" style={{ background: 'var(--hz-danger-50)', color: 'var(--hz-danger-600)', borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="mb-3">
          <label className="hz-form-label">Rating *</label>
          <div className="d-flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="btn btn-light border-0 p-1"
                onClick={() => setRating(n)}
                aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
                aria-pressed={n <= rating}
              >
                <Star size={22} fill={n <= rating ? 'var(--hz-warning-500)' : 'none'} color={n <= rating ? 'var(--hz-warning-500)' : 'var(--hz-border)'} />
              </button>
            ))}
          </div>
        </div>

        <FormField as="textarea" label="Feedback" rows={4} value={feedback} onChange={setFeedback} />

        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={submit.isPending}>Save Feedback</Button>
        </div>
      </form>
    </Dialog>
  );
}
