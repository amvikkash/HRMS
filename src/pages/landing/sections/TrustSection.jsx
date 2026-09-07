import { ArrowRight, ClipboardCheck, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReveal } from '../useReveal';

const TRUST_POINTS = [
  {
    icon: LockKeyhole,
    title: 'Tenant-aware access',
    description: 'Keep company data scoped to the right workspace as your organization grows.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based permissions',
    description: 'Give HR, managers, payroll, and employees the access their work requires.',
  },
  {
    icon: ClipboardCheck,
    title: 'Audit-friendly operations',
    description: 'Make approvals, attendance, and people changes easier to review and follow up.',
  },
];

export default function TrustSection() {
  const reveal = useReveal();

  return (
    <section className="hz-trust-section">
      <div className="container">
        <div className="row align-items-end g-4">
          <div className="col-12 col-lg-5">
            <div ref={reveal.ref} className={reveal.className}>
              <span className="hz-eyebrow">Built for trust</span>
              <h2 className="hz-trust-title">A calmer foundation for people operations</h2>
              <p className="text-secondary-hz mb-0">
                Bring the right people, data, and decisions into one workspace with controls designed for real HR teams.
              </p>
              <Link to="/contact" className="hz-trust-link">
                See Vettri with your workflow <ArrowRight size={15} />
              </Link>
            </div>
          </div>
          <div className="col-12 col-lg-7">
            <div className="row g-3">
              {TRUST_POINTS.map((point, index) => {
                const Icon = point.icon;
                return (
                  <div className="col-12 col-md-4" key={point.title}>
                    <div className="hz-trust-point" style={{ transitionDelay: `${index * 60}ms` }}>
                      <div className="hz-trust-point__icon"><Icon size={18} /></div>
                      <h3>{point.title}</h3>
                      <p>{point.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
