import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, Eye, RefreshCw, Send } from 'lucide-react';
import { candidatesApi } from '../../api/endpoints/recruitment';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx';

/**
 * HR must upload a signed offer letter (PDF/DOC/DOCX) before it can be
 * emailed to the candidate - "Generate Offer" (see GenerateOfferModal) no
 * longer sends anything by itself, it only records the offer terms.
 * Shown on the Candidate Details page whenever an offer has been
 * generated (stage OFFERED or, after sending, OFFER_LETTER_SENT), so the
 * same panel covers upload, preview/download, replace, send, and resend.
 */
export default function OfferLetterPanel({ candidate }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['candidates'] });
    queryClient.invalidateQueries({ queryKey: ['candidate', candidate.id] });
  }

  const upload = useMutation({
    mutationFn: (file) => candidatesApi.uploadOfferLetter(candidate.id, file),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not upload the offer letter.'),
  });

  const send = useMutation({
    mutationFn: () => candidatesApi.sendOfferLetter(candidate.id),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not send the offer letter.'),
  });

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file name
    if (!file) return;
    setError(null);
    upload.mutate(file);
  }

  async function handlePreview() {
    setError(null);
    setBusy(true);
    try {
      const response = await candidatesApi.previewOfferLetter(candidate.id);
      const url = window.URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch {
      setError('Could not open the offer letter preview.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    setError(null);
    setBusy(true);
    try {
      const response = await candidatesApi.downloadOfferLetter(candidate.id);
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = candidate.offerLetterOriginalName || 'offer-letter';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Could not download the offer letter.');
    } finally {
      setBusy(false);
    }
  }

  const alreadySent = candidate.stage === 'OFFER_LETTER_SENT';

  return (
    <div className="p-3" style={{ background: 'var(--hz-gray-50)', borderRadius: 8 }}>
      <div className="d-flex align-items-center justify-content-between" style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>Offer Letter</div>
        {alreadySent && (
          <Badge variant={candidate.offerLetterEmailStatus === 'FAILED' ? 'danger' : 'success'}>
            {candidate.offerLetterEmailStatus === 'FAILED' ? 'Send Failed' : 'Sent'}
          </Badge>
        )}
      </div>

      {error && (
        <div className="mb-2 px-3 py-2" style={{ background: 'var(--hz-danger-50)', color: 'var(--hz-danger-600)', borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {candidate.hasOfferLetter ? (
        <>
          <div style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>{candidate.offerLetterOriginalName}</div>
          <div style={{ fontSize: 12, color: 'var(--hz-text-secondary)', marginTop: 2 }}>
            Uploaded {new Date(candidate.offerLetterUploadedAt).toLocaleString()}
            {candidate.offerLetterUploadedBy ? ` by ${candidate.offerLetterUploadedBy}` : ''}
          </div>
          {alreadySent && candidate.offerLetterSentAt && (
            <div style={{ fontSize: 12, color: 'var(--hz-text-secondary)', marginTop: 2 }}>
              Sent {new Date(candidate.offerLetterSentAt).toLocaleString()}
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="secondary" icon={Eye} onClick={handlePreview} disabled={busy}>Preview</Button>
            <Button size="sm" variant="secondary" icon={Download} onClick={handleDownload} disabled={busy}>Download</Button>
            <Button size="sm" variant="secondary" icon={Upload} onClick={() => fileInputRef.current?.click()} loading={upload.isPending}>Replace</Button>
            <Button size="sm" icon={alreadySent ? RefreshCw : Send} onClick={() => send.mutate()} loading={send.isPending}>
              {alreadySent ? 'Resend Offer Letter' : 'Send Offer Letter'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', marginBottom: 8 }}>
            No offer letter uploaded yet. Upload the signed offer letter (PDF, DOC, or DOCX) before it can be sent to the candidate.
          </div>
          <Button size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()} loading={upload.isPending}>
            Upload Offer Letter
          </Button>
        </>
      )}

      <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={handleFileChange} style={{ display: 'none' }} />
    </div>
  );
}
