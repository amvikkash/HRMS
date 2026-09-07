import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Briefcase, Users, Clock3, CalendarClock, ArrowRight } from 'lucide-react';
import { jobOpeningsApi, candidatesApi, interviewsApi } from '../../api/endpoints/recruitment';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonCard, SkeletonText } from '../../components/ui/Skeleton';

/**
 * "recruiterId" already exists on JobOpeningDTO - job openings are already
 * assigned to a specific recruiter in the data model, it just had no
 * screen that scoped to it. That's what makes this genuinely a personal
 * dashboard rather than a filtered copy of the org-wide Recruitment list:
 * everything here is actually "mine," not "everything, narrowed."
 *
 * Interviews don't carry a jobOpeningId directly (InterviewDTO only has
 * candidateId + jobOpeningTitle), so "my upcoming interviews" is resolved
 * by cross-referencing interviewsApi.upcoming() against the candidate IDs
 * pulled from my own openings - no backend change needed, just a client-
 * side join.
 */
export default function RecruiterDashboard() {
  const { user } = useAuth();
  const myEmployeeId = user?.employeeId;

  const openings = useQuery({ queryKey: ['job-openings'], queryFn: jobOpeningsApi.list });

  const myOpenings = useMemo(
    () => (openings.data || []).filter((o) => myEmployeeId && o.recruiterId === myEmployeeId),
    [openings.data, myEmployeeId]
  );
  const myOpenOpenings = myOpenings.filter((o) => o.status === 'OPEN');

  // One candidates call per open pipeline - fine at the scale a single
  // recruiter's active openings actually reach; not something to
  // paginate or batch for a dashboard widget.
  const candidateQueries = useQuery({
    queryKey: ['recruiter-dashboard-candidates', myOpenOpenings.map((o) => o.id).join(',')],
    queryFn: async () => {
      const results = await Promise.all(myOpenOpenings.map((o) => candidatesApi.list(o.id)));
      return results.flat();
    },
    enabled: myOpenOpenings.length > 0,
  });

  const upcoming = useQuery({ queryKey: ['interviews-upcoming'], queryFn: interviewsApi.upcoming });

  const myCandidates = candidateQueries.data || [];
  const myCandidateIds = useMemo(() => new Set(myCandidates.map((c) => c.id)), [myCandidates]);
  const awaitingReview = myCandidates.filter((c) => c.stage === 'APPLIED').length;
  const myUpcomingInterviews = (upcoming.data || [])
    .filter((i) => myCandidateIds.has(i.candidateId))
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 6);

  const isLoading = openings.isLoading || (myOpenOpenings.length > 0 && candidateQueries.isLoading) || upcoming.isLoading;
  const isError = openings.isError || candidateQueries.isError || upcoming.isError;

  if (!myEmployeeId) {
    return (
      <Card>
        <EmptyState
          icon={Briefcase}
          title="No linked employee record"
          description="This login isn't linked to an employee profile, so there's no 'my openings' to scope to. See Employee.user in the backend for how that link works."
        />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="d-flex flex-column gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        description="Couldn't load your recruiting pipeline."
        onRetry={() => {
          openings.refetch();
          candidateQueries.refetch();
          upcoming.refetch();
        }}
      />
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700 }}>My Recruiting</h1>
        <p className="text-secondary-hz" style={{ fontSize: 'var(--hz-text-sm)' }}>
          Openings assigned to you, and what's waiting on you across them
        </p>
      </div>

      <div className="row g-3">
        <KpiCard icon={Briefcase} label="Open Positions" value={myOpenOpenings.length} accent="var(--hz-primary-600)" tint="var(--hz-primary-50)" />
        <KpiCard icon={Users} label="In Pipeline" value={myCandidates.length} accent="var(--hz-info-500)" tint="var(--hz-info-50)" />
        <KpiCard icon={Clock3} label="Awaiting Review" value={awaitingReview} accent="var(--hz-warning-500)" tint="var(--hz-warning-50)" />
        <KpiCard icon={CalendarClock} label="Upcoming Interviews" value={myUpcomingInterviews.length} accent="var(--hz-success-500)" tint="var(--hz-success-50)" />
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <Card title="My Open Positions">
            {myOpenOpenings.length === 0 && (
              <EmptyState icon={Briefcase} title="No open positions assigned to you" description="Positions HR assigns to you will show up here." />
            )}
            {myOpenOpenings.length > 0 && (
              <div className="d-flex flex-column gap-1">
                {myOpenOpenings.map((o) => (
                  <Link
                    key={o.id}
                    to={`/recruitment/${o.id}`}
                    className="d-flex align-items-center justify-content-between text-decoration-none p-2 rounded-3 hz-joiner-row"
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="text-truncate" style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>
                        {o.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>
                        {o.departmentName || 'Any department'} · {o.openingsCount} opening{o.openingsCount === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-3 flex-shrink-0">
                      <span style={{ fontSize: 12, color: 'var(--hz-text-secondary)' }}>{o.candidateCount} candidates</span>
                      <ArrowRight size={14} color="var(--hz-text-muted)" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="col-12 col-lg-5">
          <Card title="Upcoming Interviews">
            {myUpcomingInterviews.length === 0 && (
              <EmptyState icon={CalendarClock} title="Nothing scheduled" description="Interviews for your candidates will appear here." />
            )}
            {myUpcomingInterviews.length > 0 && (
              <div className="d-flex flex-column gap-3">
                {myUpcomingInterviews.map((i) => (
                  <div key={i.id} className="d-flex align-items-center gap-2">
                    <Avatar name={i.candidateName} size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <div className="text-truncate" style={{ fontWeight: 600, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-primary)' }}>
                        {i.candidateName}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--hz-text-muted)' }}>
                        Round {i.roundNumber} · {new Date(i.scheduledAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent, tint }) {
  return (
    <div className="col-6 col-lg-3">
      <Card>
        <div className="d-flex align-items-center gap-3">
          <div className="hz-stat__icon" style={{ background: tint, color: accent }}>
            <Icon size={20} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
            <div className="text-secondary-hz" style={{ fontSize: 12 }}>{label}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
