import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin } from 'lucide-react';
import { careersApi } from '../../api/endpoints/recruitment';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonCard } from '../../components/ui/Skeleton';

export default function CareersList() {
  const { data: jobs, isLoading, isError, refetch } = useQuery({ queryKey: ['careers-jobs'], queryFn: careersApi.listOpenJobs });

  return (
    <section className="hz-section" style={{ background: 'var(--hz-bg-canvas)' }}>
      <div className="container" style={{ maxWidth: 860 }}>
      <div className="text-center mb-5">
        <span className="hz-eyebrow">Careers</span>
        <h1 style={{ fontSize: 'var(--hz-text-3xl)', fontWeight: 700, marginTop: 10 }}>Open Positions</h1>
        <p className="text-secondary-hz" style={{ fontSize: 'var(--hz-text-base)', maxWidth: 560, margin: '8px auto 0' }}>
          We're growing - take a look at the roles we're currently hiring for.
        </p>
      </div>

      {isError && <ErrorState description="Couldn't load open positions right now." onRetry={refetch} />}

      {!isError && (
        <div className="row g-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div className="col-12 col-md-6" key={i}>
                <SkeletonCard />
              </div>
            ))}

          {!isLoading && jobs?.length === 0 && (
            <div className="col-12">
              <EmptyState icon={Briefcase} title="No open positions right now" description="Please check back soon - new roles are posted regularly." />
            </div>
          )}

          {!isLoading &&
            jobs?.map((job) => (
              <div className="col-12 col-md-6" key={job.id}>
                <Link to={`/careers/${job.id}`} className="text-decoration-none">
                  <div className="hz-surface p-4 h-100" style={{ transition: 'box-shadow 0.15s, transform 0.15s' }}>
                    <h3 style={{ fontSize: 'var(--hz-text-lg)', fontWeight: 600, color: 'var(--hz-text-primary)', marginBottom: 6 }}>{job.title}</h3>
                    <div className="d-flex align-items-center gap-3 flex-wrap mb-3" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                      {job.departmentName && (
                        <span className="d-inline-flex align-items-center gap-1">
                          <MapPin size={13} /> {job.departmentName}
                        </span>
                      )}
                      <span>{(job.employmentType || 'FULL_TIME').replace('_', '-')}</span>
                      <span>{job.openingsCount} opening{job.openingsCount > 1 ? 's' : ''}</span>
                    </div>
                    {job.description && (
                      <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)', marginBottom: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {job.description}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            ))}
        </div>
      )}
      </div>
    </section>
  );
}
