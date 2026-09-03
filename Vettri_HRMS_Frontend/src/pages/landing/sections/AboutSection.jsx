import { Users, Clock, CalendarDays, Briefcase, TrendingUp, FileBarChart } from 'lucide-react';
import { useReveal } from '../useReveal';

const PILLARS = [
  {
    icon: Users,
    color: 'var(--hz-primary-600)',
    bg: 'var(--hz-primary-50)',
    title: 'Workforce records',
    description: 'A single source of truth for every employee record - no more three spreadsheets with three different answers.',
  },
  {
    icon: Clock,
    color: 'var(--hz-accent-600)',
    bg: '#e6fbfa',
    title: 'Attendance',
    description: 'Live attendance, synced straight from your biometric devices, reconciled automatically against shift schedules.',
  },
  {
    icon: CalendarDays,
    color: 'var(--hz-info-600)',
    bg: 'var(--hz-info-50)',
    title: 'Leave management',
    description: 'Configurable leave policies with instant, auditable approvals - no more chasing sign-offs over email.',
  },
  {
    icon: Briefcase,
    color: 'var(--hz-warning-600)',
    bg: 'var(--hz-warning-50)',
    title: 'Recruitment',
    description: 'One pipeline from job posting to signed offer, so hiring managers and recruiters work off the same picture.',
  },
  {
    icon: TrendingUp,
    color: 'var(--hz-success-600)',
    bg: 'var(--hz-success-50)',
    title: 'Performance',
    description: 'Structured review cycles and goal tracking that hold up when it is time to talk about promotions.',
  },
  {
    icon: FileBarChart,
    color: 'var(--hz-primary-700)',
    bg: 'var(--hz-primary-50)',
    title: 'Reports',
    description: 'Executive-grade reporting, not just raw data dumps - built for the conversations leadership actually has.',
  },
];

export default function AboutSection() {
  const heading = useReveal();

  return (
    <section className="hz-section" style={{ background: 'var(--hz-bg-canvas)' }}>
      <div className="container">
        <div ref={heading.ref} className={`${heading.className} text-center mx-auto mb-5`} style={{ maxWidth: 640 }}>
          <span className="hz-eyebrow">About Vettri HRMS</span>
          <h2 style={{ fontSize: 'var(--hz-text-3xl)', fontWeight: 700, marginBottom: 14 }}>
            Built for how modern teams actually work
          </h2>
          <p className="text-secondary-hz" style={{ fontSize: 'var(--hz-text-base)' }}>
            Vettri HRMS brings every people process onto one platform, with the same role-based access, audit trail, and
            design system underneath each module - so IT ships one product, not six.
          </p>
        </div>

        <div className="row g-4">
          {PILLARS.map((pillar, i) => (
            <PillarCard key={pillar.title} pillar={pillar} delay={i * 60} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PillarCard({ pillar, delay }) {
  const reveal = useReveal();
  const Icon = pillar.icon;
  return (
    <div className="col-12 col-sm-6 col-lg-4">
      <div ref={reveal.ref} className={reveal.className} style={{ transitionDelay: `${delay}ms` }}>
        <div className="hz-pillar">
          <div className="hz-pillar-icon" style={{ background: pillar.bg }}>
            <Icon size={21} color={pillar.color} strokeWidth={2} />
          </div>
          <h3 style={{ fontSize: 'var(--hz-text-lg)', fontWeight: 600, marginBottom: 8 }}>{pillar.title}</h3>
          <p className="text-secondary-hz mb-0" style={{ fontSize: 'var(--hz-text-sm)' }}>
            {pillar.description}
          </p>
        </div>
      </div>
    </div>
  );
}
