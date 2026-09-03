import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Video, Star, Download } from 'lucide-react';
import { interviewsApi } from '../../api/endpoints/recruitment';
import { axiosClient } from '../../api/axiosClient';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonText } from '../../components/ui/Skeleton';
import InterviewDecisionModal from './InterviewDecisionModal';
import { useAuth } from '../../hooks/useAuth';

const ROUND_LABEL = { 2: 'Manager Interview', 3: 'Final Interview' };

export default function MyInterviews() {
  const [decisionFor, setDecisionFor] = useState(null);
  const { hasPermission } = useAuth();
  const canDecide = hasPermission('INTERVIEW_DECISION') || hasPermission('RECRUITMENT_MANAGE');
  const { data: interviews, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-interviews'],
    queryFn: interviewsApi.my,
  });

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 style={{ fontSize: 'var(--hz-text-xl)', fontWeight: 700, margin: 0 }}>My Interviews</h2>
        <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)', margin: 0 }}>
          {canDecide ? 'Candidates assigned to you for interview' : 'Interviews assigned to you'}
        </p>
      </div>

      <Card bodyClassName="p-0">
        {isLoading && (
          <div className="p-4">
            <SkeletonText lines={4} />
          </div>
        )}

        {isError && <div className="p-4"><ErrorState description="Couldn't load your interviews." onRetry={refetch} /></div>}

        {!isLoading && !isError && (!interviews || interviews.length === 0) && (
          <div className="p-4">
            <EmptyState icon={CalendarClock} title="No interviews assigned" description={canDecide ? 'Candidates HR assigns to you will show up here.' : 'Interviews assigned to you will show up here.'} />
          </div>
        )}

        {!isLoading && !isError && interviews && interviews.length > 0 && (
          <div className="d-flex flex-column">
            {interviews.map((iv) => (
              <div
                key={iv.id}
                className="d-flex flex-column flex-md-row justify-content-between gap-3 p-4"
                style={{ borderBottom: '1px solid var(--hz-border)' }}
              >
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span style={{ fontWeight: 600 }}>{iv.candidateName}</span>
                    <Badge variant={iv.status === 'COMPLETED' ? 'success' : 'primary'}>{ROUND_LABEL[iv.roundNumber] || `Round ${iv.roundNumber}`}</Badge>
                    {iv.decision && <Badge variant={iv.decision === 'REJECTED' ? 'danger' : 'success'}>{iv.decision.replaceAll('_', ' ')}</Badge>}
                  </div>
                  <div style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                    {iv.jobOpeningTitle} · {iv.candidateEmail}
                  </div>
                  <div className="d-flex flex-wrap gap-3 mt-2" style={{ fontSize: 'var(--hz-text-sm)' }}>
                    <span className="d-flex align-items-center gap-1">
                      <CalendarClock size={14} /> {new Date(iv.scheduledAt).toLocaleString()}
                    </span>
                    {iv.meetingLink && (
                      <a href={iv.meetingLink} target="_blank" rel="noreferrer" className="d-flex align-items-center gap-1">
                        <Video size={14} /> Join Meet
                      </a>
                    )}
                  </div>
                  {(iv.candidateSkills || iv.candidateExperienceYears != null) && (
                    <div className="mt-2" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                      {iv.candidateExperienceYears != null && <>{iv.candidateExperienceYears} yrs experience</>}
                      {iv.candidateExperienceYears != null && iv.candidateSkills && ' · '}
                      {iv.candidateSkills}
                    </div>
                  )}
                  {iv.candidateHasResume && (
                    <div className="mt-1">
                      <ResumeLink candidateId={iv.candidateId} />
                    </div>
                  )}
                  {iv.instructions && (
                    <div className="mt-2 p-2" style={{ background: 'var(--hz-gray-50)', borderRadius: 6, fontSize: 'var(--hz-text-sm)' }}>
                      <strong>Instructions:</strong> {iv.instructions}
                    </div>
                  )}
                  {iv.status === 'COMPLETED' && (
                    <div className="d-flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={13} fill={n <= (iv.rating || 0) ? 'var(--hz-warning-500)' : 'none'} color={n <= (iv.rating || 0) ? 'var(--hz-warning-500)' : 'var(--hz-border)'} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="d-flex align-items-start">
                  {canDecide && iv.status !== 'COMPLETED' && (
                    <Button onClick={() => setDecisionFor(iv)}>Submit Decision</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {decisionFor && <InterviewDecisionModal interview={decisionFor} onClose={() => setDecisionFor(null)} />}
    </div>
  );
}

/** Same pattern as CandidateDetailModal's ResumeDownloadLink - a plain <a href> to /api/... won't carry the JWT, so this goes through axiosClient and downloads the blob directly. */
function ResumeLink({ candidateId }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await axiosClient.get(`/api/candidates/${candidateId}/resume`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume';
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
      <Download size={14} /> {downloading ? 'Downloading…' : 'View resume'}
    </button>
  );
}
