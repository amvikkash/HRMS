import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapPin, Briefcase, ArrowRight, Clock3 } from 'lucide-react';
import { useReveal } from '../useReveal';
import { careersApi } from '../../../api/endpoints/recruitment';

export default function CareersSection() {
  const heading = useReveal();
  const { data: jobs, isLoading } = useQuery({ queryKey: ['careers-jobs-preview'], queryFn: careersApi.listOpenJobs });
  const preview = (jobs || []).slice(0, 4);

  if (!isLoading && preview.length === 0) return null;

  return (
    <section id="careers" className="hz-section" style={{ background: 'var(--hz-bg-surface)' }}>
      <div className="container">
        <div ref={heading.ref} className={`${heading.className} d-flex flex-wrap align-items-end justify-content-between gap-3 mb-5`}>
          <div>
            <span className="hz-eyebrow">Careers</span>
            <h2 style={{ fontSize: 'var(--hz-text-3xl)', fontWeight: 700, marginBottom: 10 }}>Join our team</h2>
            <p className="text-secondary-hz mb-0" style={{ fontSize: 'var(--hz-text-base)', maxWidth: 480 }}>
              We're hiring across engineering, people operations, design, and sales.
            </p>
          </div>
          <Link to="/careers" className="btn btn-outline-secondary d-inline-flex align-items-center gap-2">
            View all openings <ArrowRight size={15} />
          </Link>
        </div>

        <div className="row g-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div className="col-12 col-md-6 col-lg-3" key={i}>
                  <div className="hz-job-card hz-job-card--loading" aria-hidden="true" />
                </div>
              ))
            : preview.map((job, i) => <JobCard key={job.id} job={job} delay={i * 60} />)}
        </div>
      </div>
    </section>
  );
}

function JobCard({ job, delay }) {
  const reveal = useReveal();
  return (
    <div className="col-12 col-md-6 col-lg-3">
      <div ref={reveal.ref} className={reveal.className} style={{ transitionDelay: `${delay}ms`, height: '100%' }}>
        <Link to="/careers" className="text-decoration-none d-block h-100">
          <div className="hz-job-card d-flex flex-column">
            <div
              className="d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--hz-primary-50)' }}
            >
              <Briefcase size={17} color="var(--hz-primary-600)" />
            </div>
            <h3 style={{ fontSize: 'var(--hz-text-base)', fontWeight: 600, color: 'var(--hz-text-primary)', marginBottom: 10 }}>
              {job.title}
            </h3>
            <div className="d-flex flex-column gap-2 mt-auto" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
              <span className="d-inline-flex align-items-center gap-2">
                <MapPin size={13} /> {job.location || job.departmentName}
              </span>
              <span className="d-inline-flex align-items-center gap-2">
                <Clock3 size={13} /> {(job.employmentType || 'FULL_TIME').replace('_', '-')}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
