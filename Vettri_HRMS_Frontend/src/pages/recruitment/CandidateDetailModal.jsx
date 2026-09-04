import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Download, Eye, CalendarClock, CheckCircle2, UserPlus, ClipboardCheck, ArrowRightCircle, Award, Send, FileText, Clock3 } from 'lucide-react';
import { candidatesApi, interviewsApi } from '../../api/endpoints/recruitment';
import { axiosClient } from '../../api/axiosClient';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import ReviewCandidateModal from './ReviewCandidateModal';
import AdvanceCandidateModal from './AdvanceCandidateModal';
import AssignManagerModal from './AssignManagerModal';
import ScheduleInterviewModal from './ScheduleInterviewModal';
import InterviewFeedbackModal from './InterviewFeedbackModal';
import GenerateOfferModal from './GenerateOfferModal';
import OfferLetterPanel from './OfferLetterPanel';
import Drawer from '../../components/ui/Drawer';

const STAGE_VARIANT = {
  APPLIED: 'neutral', SHORTLISTED: 'info', HOLD: 'warning',
  ROUND1: 'primary', ROUND2: 'primary', ROUND3: 'primary',
  OFFERED: 'warning', OFFER_LETTER_SENT: 'primary', HIRED: 'success', REJECTED: 'danger',
};
const ROUND_LABEL = { 1: 'Round 1 · HR Interview', 2: 'Round 2 · Hiring Manager', 3: 'Round 3 · Final / Management' };

export default function CandidateDetailModal({ candidateId, onClose }) {
  const queryClient = useQueryClient();
  const { data: candidate, isLoading } = useQuery({ queryKey: ['candidate', candidateId], queryFn: () => candidatesApi.get(candidateId) });
  const { data: interviews = [] } = useQuery({
    queryKey: ['interviews', candidateId],
    queryFn: () => interviewsApi.byCandidate(candidateId),
    enabled: !!candidateId,
  });

  const [action, setAction] = useState(null); // 'review' | 'advance' | 'schedule' | 'offer'
  const [feedbackFor, setFeedbackFor] = useState(null);

  const acceptOffer = useMutation({
    mutationFn: () => candidatesApi.acceptOffer(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] });
    },
  });

  if (isLoading || !candidate) {
    return (
      <Drawer open onClose={onClose} title="Candidate details">
        <p className="text-secondary-hz mb-0">Loading candidate details…</p>
      </Drawer>
    );
  }

  const currentRoundInterview = interviews.find((i) => i.roundNumber === { ROUND1: 1, ROUND2: 2, ROUND3: 3 }[candidate.stage] && i.status === 'SCHEDULED');

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title={candidate.fullName}
        description={`${candidate.email} · ${candidate.phone || 'No phone'} · ${candidate.jobOpeningTitle || 'Candidate'}`}
        size="lg"
      >
          <div className="d-flex align-items-center gap-2 mb-4">
            <StatusBadge status={candidate.stage} variant={STAGE_VARIANT[candidate.stage] || 'neutral'}>{candidate.stage}</StatusBadge>
          </div>

          <div className="d-flex flex-column gap-4">
            {/* Application summary */}
            <div className="row g-3">
              <div className="col-6">
                <div style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>Experience</div>
                <div style={{ fontSize: 'var(--hz-text-sm)' }}>{candidate.experienceYears != null ? `${candidate.experienceYears} yrs` : '—'}</div>
              </div>
              <div className="col-6">
                <div style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>Source</div>
                <div style={{ fontSize: 'var(--hz-text-sm)' }}>{candidate.source || '—'}</div>
              </div>
              <div className="col-12">
                <div style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>Skills</div>
                <div style={{ fontSize: 'var(--hz-text-sm)' }}>{candidate.skills || '—'}</div>
              </div>
              <div className="col-12">
                <div style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>Resume</div>
                {candidate.hasResume ? (
                  <div className="d-flex align-items-center gap-3">
                    <ResumePreviewLink candidateId={candidate.id} />
                    <ResumeDownloadLink candidateId={candidate.id} filename={candidate.resumeOriginalName} />
                  </div>
                ) : candidate.resumeUrl ? (
                  <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--hz-text-sm)' }}>{candidate.resumeUrl}</a>
                ) : (
                  <span style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)' }}>No resume on file</span>
                )}
              </div>
            </div>

            <NotesSection candidate={candidate} onSaved={() => queryClient.invalidateQueries({ queryKey: ['candidate', candidateId] })} />

            {/* Screening review */}
            {(candidate.rating || candidate.remarks || candidate.rejectionReason) && (
              <div className="p-3" style={{ background: 'var(--hz-gray-50)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>HR Screening Review</div>
                {candidate.rating && (
                  <div className="d-flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={14} fill={n <= candidate.rating ? 'var(--hz-warning-500)' : 'none'} color={n <= candidate.rating ? 'var(--hz-warning-500)' : 'var(--hz-border)'} />
                    ))}
                  </div>
                )}
                {candidate.remarks && <div style={{ fontSize: 'var(--hz-text-sm)' }}>{candidate.remarks}</div>}
                {candidate.rejectionReason && <div style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-danger-600)', marginTop: 4 }}>Rejection reason: {candidate.rejectionReason}</div>}
              </div>
            )}

            {/* Interview history */}
            {interviews.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Interview History</div>
                <div className="d-flex flex-column gap-2">
                  {interviews.map((iv) => (
                    <div key={iv.id} className="d-flex align-items-start justify-content-between p-2" style={{ border: '1px solid var(--hz-border)', borderRadius: 8 }}>
                      <div>
                        <div style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600 }}>{ROUND_LABEL[iv.roundNumber] || `Round ${iv.roundNumber}`}</div>
                        <div style={{ fontSize: 12, color: 'var(--hz-text-secondary)' }}>
                          {new Date(iv.scheduledAt).toLocaleString()} {iv.interviewerName ? `· ${iv.interviewerName}` : ''}
                        </div>
                        {iv.feedback && <div style={{ fontSize: 12, color: 'var(--hz-text-secondary)', marginTop: 4 }}>{iv.feedback}</div>}
                        {iv.meetingLink && (
                          <div style={{ fontSize: 12, marginTop: 4 }}>
                            <a href={iv.meetingLink} target="_blank" rel="noreferrer">{iv.meetingLink}</a>
                          </div>
                        )}
                        {iv.decision && (
                          <div style={{ fontSize: 12, marginTop: 4 }}>
                            <StatusBadge status={iv.decision} variant={iv.decision === 'REJECTED' ? 'danger' : 'success'}>{iv.decision.replaceAll('_', ' ')}</StatusBadge>
                          </div>
                        )}
                      </div>
                      <div className="text-end">
                        <StatusBadge status={iv.status} variant={iv.status === 'COMPLETED' ? 'success' : 'neutral'}>{iv.status}</StatusBadge>
                        {iv.rating && (
                          <div className="d-flex gap-1 justify-content-end mt-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} size={11} fill={n <= iv.rating ? 'var(--hz-warning-500)' : 'none'} color={n <= iv.rating ? 'var(--hz-warning-500)' : 'var(--hz-border)'} />
                            ))}
                          </div>
                        )}
                        {iv.status === 'SCHEDULED' && (
                          <div className="mt-1">
                            <Button size="sm" variant="secondary" onClick={() => setFeedbackFor(iv)}>Add Feedback</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offer summary */}
            {candidate.offerAmount != null && (
              <div className="p-3" style={{ background: 'var(--hz-gray-50)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Offer</div>
                <div style={{ fontSize: 'var(--hz-text-sm)' }}>Amount: {candidate.offerAmount.toLocaleString()}</div>
                <div style={{ fontSize: 'var(--hz-text-sm)' }}>Joining: {candidate.expectedJoiningDate}</div>
                {candidate.offerAcceptedAt && (
                  <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-success-600)' }}>
                    <CheckCircle2 size={14} /> Accepted - employee profile created
                  </div>
                )}
              </div>
            )}

            {/* Upload / send the offer letter document - shown once an offer has been generated */}
            {['OFFERED', 'OFFER_LETTER_SENT'].includes(candidate.stage) && (
              <OfferLetterPanel candidate={candidate} />
            )}

            {/* Contextual actions */}
            <div className="d-flex flex-wrap gap-2 pt-2" style={{ borderTop: '1px solid var(--hz-border)' }}>
              {candidate.stage === 'APPLIED' && <Button onClick={() => setAction('review')}>Review Application</Button>}

              {['SHORTLISTED', 'HOLD', 'ROUND1', 'ROUND2', 'ROUND3'].includes(candidate.stage) && (
                <Button variant="secondary" onClick={() => setAction('advance')}>
                  {candidate.stage === 'ROUND1' ? 'Reject / Hold' : 'Update Stage'}
                </Button>
              )}

              {candidate.stage === 'ROUND1' && (
                <Button onClick={() => setAction('assign-manager')}>Select for Manager Round</Button>
              )}

              {['ROUND1', 'ROUND2', 'ROUND3'].includes(candidate.stage) && !currentRoundInterview && (
                <Button variant="secondary" icon={CalendarClock} onClick={() => setAction('schedule')}>Schedule Interview</Button>
              )}

              {candidate.stage === 'ROUND3' && (
                <Button onClick={() => setAction('offer')}>Generate Offer</Button>
              )}

              {candidate.stage === 'OFFER_LETTER_SENT' && (
                <Button onClick={() => acceptOffer.mutate()} loading={acceptOffer.isPending}>Mark Offer Accepted &amp; Onboard</Button>
              )}
            </div>

            <TimelineSection candidateId={candidate.id} />
          </div>
      </Drawer>

      {action === 'review' && <ReviewCandidateModal candidate={candidate} onClose={() => setAction(null)} />}
      {action === 'advance' && <AdvanceCandidateModal candidate={candidate} onClose={() => setAction(null)} />}
      {action === 'assign-manager' && <AssignManagerModal candidate={candidate} onClose={() => setAction(null)} />}
      {action === 'schedule' && <ScheduleInterviewModal candidate={candidate} onClose={() => setAction(null)} />}
      {action === 'offer' && <GenerateOfferModal candidate={candidate} onClose={() => setAction(null)} />}
      {feedbackFor && <InterviewFeedbackModal interview={feedbackFor} candidateId={candidateId} onClose={() => setFeedbackFor(null)} />}
    </>
  );
}

const TIMELINE_ACTION_META = {
  CREATE: { label: 'Added to pipeline', icon: UserPlus },
  REVIEW: { label: 'Application reviewed', icon: ClipboardCheck },
  NOTES_UPDATED: { label: 'Notes updated', icon: FileText },
  STAGE_CHANGE: { label: 'Stage updated', icon: ArrowRightCircle },
  MANAGER_ROUND_ASSIGNED: { label: 'Manager round assigned', icon: CalendarClock },
  OFFER_GENERATED: { label: 'Offer generated', icon: Award },
  OFFER_LETTER_UPLOADED: { label: 'Offer letter uploaded', icon: FileText },
  OFFER_LETTER_SENT: { label: 'Offer letter sent', icon: Send },
  OFFER_ACCEPTED: { label: 'Offer accepted', icon: CheckCircle2 },
  // Interview entity events, merged into this same timeline server-side.
  DECISION: { label: 'Interview decision recorded', icon: ClipboardCheck },
  INVITE_RESENT: { label: 'Interview invite resent', icon: Send },
};
const DEFAULT_TIMELINE_META = { label: null, icon: Clock3 };

function TimelineSection({ candidateId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['candidate-timeline', candidateId],
    queryFn: () => candidatesApi.timeline(candidateId),
  });

  return (
    <div className="pt-2" style={{ borderTop: '1px solid var(--hz-border)' }}>
      <span style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>Timeline</span>

      {isLoading && <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', marginTop: 8 }}>Loading history…</p>}
      {isError && <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', marginTop: 8 }}>Couldn't load this candidate's history.</p>}
      {!isLoading && !isError && (!data || data.length === 0) && (
        <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', marginTop: 8 }}>No recorded activity yet.</p>
      )}

      {!isLoading && !isError && data?.length > 0 && (
        <div className="d-flex flex-column gap-3 mt-2">
          {data.map((event) => {
            const meta = TIMELINE_ACTION_META[event.action] || DEFAULT_TIMELINE_META;
            const Icon = meta.icon;
            return (
              <div key={event.id} className="d-flex gap-2">
                <span
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--hz-gray-100)', color: 'var(--hz-text-secondary)' }}
                >
                  <Icon size={13} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, color: 'var(--hz-text-primary)' }}>
                    {meta.label || event.action}
                  </div>
                  {event.details && (
                    <div style={{ fontSize: 12, color: 'var(--hz-text-secondary)' }}>{event.details}</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--hz-text-muted)' }}>
                    {event.performedBy || 'System'} · {new Date(event.performedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NotesSection({ candidate, onSaved }) {
  const [notes, setNotes] = useState(candidate.notes || '');
  const [error, setError] = useState(null);
  const dirty = notes !== (candidate.notes || '');

  const save = useMutation({
    mutationFn: () => candidatesApi.updateNotes(candidate.id, notes),
    onSuccess: () => {
      setError(null);
      onSaved();
    },
    onError: (err) => setError(err.response?.data?.message || 'Could not save notes.'),
  });

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <span style={{ fontSize: 11, color: 'var(--hz-text-muted)', textTransform: 'uppercase' }}>Recruiter Notes</span>
        {dirty && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save Notes'}
          </button>
        )}
      </div>
      <textarea
        className="form-control"
        rows={3}
        placeholder="Screening impressions, interview follow-ups, anything worth remembering about this candidate…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={{ fontSize: 'var(--hz-text-sm)' }}
      />
      {error && <p style={{ fontSize: 12, color: 'var(--hz-danger-600)', marginTop: 4, marginBottom: 0 }}>{error}</p>}
    </div>
  );
}

function ResumePreviewLink({ candidateId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handlePreview() {
    setLoading(true);
    setError(false);
    try {
      const response = await candidatesApi.previewResume(candidateId);
      const url = window.URL.createObjectURL(response.data);
      // Opened in a new tab rather than an inline <iframe> here - the
      // browser's own viewer handles PDF natively and falls back to its
      // normal open/download behavior for doc/docx, which a homegrown
      // in-modal preview can't do for non-PDF files anyway. Same choice
      // OfferLetterPanel.jsx already made for the same reason.
      window.open(url, '_blank', 'noopener');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        className="btn btn-link p-0 d-inline-flex align-items-center gap-1"
        style={{ fontSize: 'var(--hz-text-sm)' }}
        onClick={handlePreview}
        disabled={loading}
      >
        <Eye size={14} /> {loading ? 'Opening…' : 'Preview'}
      </button>
      {error && <div style={{ fontSize: 11, color: 'var(--hz-danger-600)' }}>Could not open the preview.</div>}
    </div>
  );
}

function ResumeDownloadLink({ candidateId, filename }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await axiosClient.get(`/api/candidates/${candidateId}/resume`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'resume';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button className="btn btn-link p-0 d-inline-flex align-items-center gap-1" style={{ fontSize: 'var(--hz-text-sm)' }} onClick={handleDownload} disabled={downloading}>
      <Download size={14} /> {downloading ? 'Downloading…' : filename || 'Download resume'}
    </button>
  );
}
