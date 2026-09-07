import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Briefcase } from 'lucide-react';
import { candidatesApi, jobOpeningsApi } from '../../api/endpoints/recruitment';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Dialog from '../../components/ui/Dialog';
import FormField from '../../components/ui/FormField';
import { SkeletonText } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import CandidateDetailModal from './CandidateDetailModal';
import { useBreadcrumbLabel } from '../../components/layout/BreadcrumbContext';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';

// Main flow left to right, then the two exception/terminal columns
// (On Hold, Rejected) pinned at the end - a candidate can land in either
// from several different stages, so they don't fit linearly in the flow.
const STAGE_COLUMNS = [
  'APPLIED', 'SHORTLISTED', 'ROUND1', 'ROUND2', 'ROUND3',
  'OFFERED', 'OFFER_LETTER_SENT', 'HIRED', 'HOLD', 'REJECTED',
];
const STAGE_LABEL = {
  APPLIED: 'Applied', SHORTLISTED: 'Shortlisted', HOLD: 'On Hold',
  ROUND1: 'Round 1', ROUND2: 'Round 2', ROUND3: 'Round 3',
  OFFERED: 'Offered', OFFER_LETTER_SENT: 'Offer Sent', HIRED: 'Hired', REJECTED: 'Rejected',
};
const STAGE_ACCENT = {
  APPLIED: 'var(--hz-gray-400)', SHORTLISTED: 'var(--hz-info-500)', HOLD: 'var(--hz-warning-500)',
  ROUND1: 'var(--hz-primary-500)', ROUND2: 'var(--hz-primary-500)', ROUND3: 'var(--hz-primary-500)',
  OFFERED: 'var(--hz-warning-500)', OFFER_LETTER_SENT: 'var(--hz-primary-500)',
  HIRED: 'var(--hz-success-500)', REJECTED: 'var(--hz-danger-500)',
};

/**
 * Dragging a card onto a column is only safe to complete directly when
 * the backend transition needs nothing beyond the target stage/decision -
 * everything here mirrors what AdvanceCandidateModal/ReviewCandidateModal
 * already send with their optional fields omitted (see those files).
 * Manager-round assignment (needs a hiring manager + schedule + Meet
 * link) and offer generation (needs an amount + joining date) are
 * genuinely not droppable this way - those return null here, and the
 * drop just opens the existing detail modal instead of doing nothing or
 * guessing at required fields, so the transition is still reachable via
 * the same form as a click.
 *
 * Kept as a pure function (stage in, action out) so the actual drop
 * handler stays a thin dispatcher - easier to audit than embedding this
 * matrix inline in JSX.
 */
function resolveDragAction(fromStage, toStage) {
  if (fromStage === toStage) return null;

  if (fromStage === 'APPLIED' && ['SHORTLISTED', 'HOLD', 'REJECTED'].includes(toStage)) {
    return { type: 'review', decision: toStage };
  }
  if (fromStage === 'SHORTLISTED' && ['ROUND1', 'HOLD', 'REJECTED'].includes(toStage)) {
    return { type: 'advance', targetStage: toStage };
  }
  if (fromStage === 'HOLD' && ['SHORTLISTED', 'ROUND1', 'ROUND2', 'ROUND3', 'REJECTED'].includes(toStage)) {
    return { type: 'advance', targetStage: toStage };
  }
  if (fromStage === 'ROUND1' && ['HOLD', 'REJECTED'].includes(toStage)) {
    return { type: 'advance', targetStage: toStage };
  }
  if (fromStage === 'ROUND2' && ['ROUND3', 'HOLD', 'REJECTED'].includes(toStage)) {
    return { type: 'advance', targetStage: toStage };
  }
  if (fromStage === 'ROUND3' && ['HOLD', 'REJECTED'].includes(toStage)) {
    return { type: 'advance', targetStage: toStage };
  }
  if (fromStage === 'OFFER_LETTER_SENT' && toStage === 'HIRED') {
    return { type: 'acceptOffer' };
  }

  // ROUND1->ROUND2 (needs AssignManagerModal), ROUND3->OFFERED (needs
  // GenerateOfferModal), anything into OFFERED/OFFER_LETTER_SENT besides
  // the above, and any other combination not listed - all fall through
  // to opening the detail modal rather than being silently ignored.
  return null;
}

export default function CandidatePipeline() {
  const { jobOpeningId } = useParams();
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [dragCandidate, setDragCandidate] = useState(null); // { id, stage } of the card currently being dragged
  const [dragOverStage, setDragOverStage] = useState(null); // column currently highlighted as a drop target
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: openings } = useQuery({ queryKey: ['job-openings'], queryFn: jobOpeningsApi.list });
  const opening = openings?.find((o) => String(o.id) === jobOpeningId);

  useBreadcrumbLabel(opening?.title);

  const { data: candidates, isLoading, isError, refetch } = useQuery({
    queryKey: ['candidates', jobOpeningId],
    queryFn: () => candidatesApi.list(jobOpeningId),
  });

  const columns = useMemo(() => {
    const byStage = Object.fromEntries(STAGE_COLUMNS.map((s) => [s, []]));
    (candidates || []).forEach((c) => {
      (byStage[c.stage] || (byStage[c.stage] = [])).push(c);
    });
    return byStage;
  }, [candidates]);

  const applyDrag = useMutation({
    mutationFn: ({ candidateId, action }) => {
      if (action.type === 'review') return candidatesApi.review(candidateId, { decision: action.decision });
      if (action.type === 'advance') return candidatesApi.advance(candidateId, { targetStage: action.targetStage });
      if (action.type === 'acceptOffer') return candidatesApi.acceptOffer(candidateId);
      return Promise.reject(new Error('Unknown drag action'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', jobOpeningId] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Couldn't move this candidate.");
    },
  });

  function handleDrop(toStage) {
    setDragOverStage(null);
    if (!dragCandidate) return;
    const { id: candidateId, stage: fromStage } = dragCandidate;
    setDragCandidate(null);

    const action = resolveDragAction(fromStage, toStage);
    if (!action) {
      // Not a safe bare transition (needs a form, e.g. assigning a
      // manager round or generating an offer) - open the same detail
      // modal a click would, rather than silently doing nothing or
      // guessing at required fields.
      if (fromStage !== toStage) setSelectedCandidateId(candidateId);
      return;
    }
    applyDrag.mutate({ candidateId, action });
  }

  return (
    <div className="hz-pipeline d-flex flex-column gap-4">
      <Link to="/recruitment" className="d-inline-flex align-items-center gap-1 text-decoration-none" style={{ color: 'var(--hz-text-secondary)', fontSize: 'var(--hz-text-sm)', width: 'fit-content' }}>
        <ArrowLeft size={15} /> Back to Job Openings
      </Link>

      <PageHeader
        eyebrow="Talent pipeline"
        title={opening?.title || 'Candidate Pipeline'}
        description={`${opening?.departmentName || 'Any department'}${opening?.designationTitle ? ` · ${opening.designationTitle}` : ''}${candidates ? ` · ${candidates.length} candidate${candidates.length === 1 ? '' : 's'}` : ''}`}
        actions={<Button icon={UserPlus} onClick={() => setShowAddCandidate(true)}>
          Add Candidate
        </Button>}
      />

      {isLoading && (
        <Card>
          <SkeletonText lines={5} />
        </Card>
      )}
      {isError && (
        <Card>
          <ErrorState description="Couldn't load candidates." onRetry={refetch} />
        </Card>
      )}
      {!isLoading && !isError && candidates?.length > 0 && (
        <div className="hz-pipeline-summary" aria-label="Candidate pipeline summary">
          <div className="col-6 col-xl-3"><StatCard label="Total candidates" value={candidates.length} icon={UserPlus} /></div>
          <div className="col-6 col-xl-3"><StatCard label="Active stages" value={STAGE_COLUMNS.filter((stage) => columns[stage]?.length > 0 && !['HIRED', 'REJECTED'].includes(stage)).length} icon={Briefcase} accent="info" /></div>
          <div className="col-6 col-xl-3"><StatCard label="Offers" value={(columns.OFFERED?.length || 0) + (columns.OFFER_LETTER_SENT?.length || 0)} icon={Briefcase} accent="warning" /></div>
          <div className="col-6 col-xl-3"><StatCard label="Hired" value={columns.HIRED?.length || 0} icon={UserPlus} accent="success" /></div>
        </div>
      )}
      {!isLoading && !isError && candidates?.length === 0 && (
        <Card>
          <EmptyState
            icon={Briefcase}
            title="No candidates yet"
            description="Candidates who apply via the Careers page will appear here automatically, or add one manually."
          />
        </Card>
      )}

      {!isLoading && !isError && candidates?.length > 0 && (
        <div className="hz-kanban-board">
          {STAGE_COLUMNS.map((stage) => (
            <div
              key={stage}
              className={`hz-kanban-col ${dragOverStage === stage ? 'hz-kanban-col--drag-over' : ''}`}
              onDragOver={(e) => {
                if (!dragCandidate) return;
                e.preventDefault(); // required for onDrop to fire at all
                if (dragOverStage !== stage) setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(stage);
              }}
            >
              <div className="hz-kanban-col-header">
                <span className="hz-kanban-col-dot" style={{ background: STAGE_ACCENT[stage] }} />
                <span className="hz-kanban-col-title">{STAGE_LABEL[stage]}</span>
                <span className="hz-kanban-col-count">{columns[stage]?.length || 0}</span>
              </div>
              <div className="hz-kanban-col-body">
                {(columns[stage] || []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      setDragCandidate({ id: c.id, stage: c.stage });
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => {
                      setDragCandidate(null);
                      setDragOverStage(null);
                    }}
                    onClick={() => setSelectedCandidateId(c.id)}
                    className="hz-kanban-card"
                  >
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Avatar name={c.fullName} size="sm" />
                      <div style={{ minWidth: 0 }}>
                        <div className="text-truncate" style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>
                          {c.fullName}
                        </div>
                        <div className="text-truncate" style={{ fontSize: 11, color: 'var(--hz-text-muted)' }}>
                          {c.source || 'Direct'}
                        </div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between" style={{ fontSize: 11, color: 'var(--hz-text-muted)' }}>
                      <span>{c.experienceYears != null ? `${c.experienceYears} yrs exp` : 'Exp. n/a'}</span>
                      <span>{new Date(c.appliedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </button>
                ))}
                {(columns[stage] || []).length === 0 && <div className="hz-kanban-col-empty">No candidates</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddCandidate && <AddCandidateModal jobOpeningId={jobOpeningId} onClose={() => setShowAddCandidate(false)} />}
      {selectedCandidateId && <CandidateDetailModal candidateId={selectedCandidateId} onClose={() => setSelectedCandidateId(null)} />}
    </div>
  );
}

function PipelineMetric({ label, value }) {
  return (
    <div className="hz-pipeline-summary__item">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function AddCandidateModal({ jobOpeningId, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', source: '', resumeUrl: '', experienceYears: '', skills: '' });
  const [error, setError] = useState(null);

  const create = useMutation({
    mutationFn: candidatesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', jobOpeningId] });
      queryClient.invalidateQueries({ queryKey: ['job-openings'] });
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not add candidate'),
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <Dialog open onClose={onClose} title="Add Candidate" size="md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          create.mutate({
            ...form,
            jobOpeningId: Number(jobOpeningId),
            experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears),
          });
        }}
      >
        {error && (
          <div className="mb-3 px-3 py-2" style={{ background: 'var(--hz-danger-50)', color: 'var(--hz-danger-600)', borderRadius: 8, fontSize: 13 }}>
            {error}
          </div>
        )}
        <div className="row g-3 mb-3">
          <FormField col={6} label="First Name" value={form.firstName} onChange={(v) => set('firstName', v)} required />
          <FormField col={6} label="Last Name" value={form.lastName} onChange={(v) => set('lastName', v)} required />
        </div>
        <FormField label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} required />
        <div className="row g-3 mb-3">
          <FormField col={6} label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
          <FormField col={6} label="Source" placeholder="Referral, LinkedIn…" value={form.source} onChange={(v) => set('source', v)} />
        </div>
        <div className="row g-3 mb-3">
          <FormField col={6} label="Experience (yrs)" type="number" min="0" step="0.5" value={form.experienceYears} onChange={(v) => set('experienceYears', v)} />
          <FormField col={6} label="Skills" value={form.skills} onChange={(v) => set('skills', v)} />
        </div>
        <FormField label="Resume URL (optional)" value={form.resumeUrl} onChange={(v) => set('resumeUrl', v)} />

        <div className="d-flex justify-content-end gap-2 mt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={create.isPending}>Add Candidate</Button>
        </div>
      </form>
    </Dialog>
  );
}
