import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { candidatesApi } from '../../api/endpoints/recruitment';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';

export default function GenerateOfferModal({ candidate, onClose }) {
  const queryClient = useQueryClient();
  const [offerAmount, setOfferAmount] = useState('');
  const [expectedJoiningDate, setExpectedJoiningDate] = useState('');
  const [error, setError] = useState(null);

  const generate = useMutation({
    mutationFn: () => candidatesApi.generateOffer(candidate.id, { offerAmount: Number(offerAmount), expectedJoiningDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not generate the offer.'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    generate.mutate();
  }

  return (
    <Dialog open onClose={onClose} title="Generate Offer" description={candidate.fullName} size="sm">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-3 px-3 py-2" style={{ background: 'var(--hz-danger-50)', color: 'var(--hz-danger-600)', borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}

        <FormField label="Offer Amount (Annual CTC)" type="number" min="0" step="1000" required value={offerAmount} onChange={setOfferAmount} />
        <FormField label="Expected Joining Date" type="date" required value={expectedJoiningDate} onChange={setExpectedJoiningDate} />

        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={generate.isPending}>Generate Offer</Button>
        </div>
      </form>
    </Dialog>
  );
}
