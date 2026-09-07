import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Clock,
  Users,
  TrendingUp,
  Briefcase,
  ArrowRight,
  Mail,
  MapPin as MapPinIcon,
} from 'lucide-react';
import { careersApi } from '../../api/endpoints/recruitment';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';

const NAV_LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '/careers', label: 'Careers', isRoute: true },
  { href: '#contact', label: 'Contact' },
];

export default function HomePage() {
  return (
    <div id="home" style={{ background: 'var(--hz-bg-canvas)' }}>
      <NavBar />
      <Hero />
      <OpenPositions />
      <About />
      <Contact />
      <Footer />
    </div>
  );
}

function NavBar() {
  return (
    <header
      className="position-sticky top-0"
      style={{ zIndex: 40, background: 'var(--hz-bg-surface)', borderBottom: '1px solid var(--hz-border)' }}
    >
      <div className="container d-flex align-items-center justify-content-between" style={{ height: 64 }}>
        <a href="#home" className="d-inline-flex align-items-center gap-2 text-decoration-none">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--hz-primary-600)', color: '#fff', fontWeight: 700, fontSize: 13 }}
          >
            H1
          </div>
          <span style={{ fontWeight: 700, fontSize: 'var(--hz-text-lg)', color: 'var(--hz-primary-800)' }}>Vettri <span style={{ color: 'var(--hz-accent-600)' }}>HRMS</span></span>
        </a>

        <nav className="d-none d-md-flex align-items-center gap-4">
          {NAV_LINKS.map((link) =>
            link.isRoute ? (
              <Link
                key={link.label}
                to={link.href}
                className="text-decoration-none"
                style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500, color: 'var(--hz-text-secondary)' }}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-decoration-none"
                style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500, color: 'var(--hz-text-secondary)' }}
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        <Link to="/login">
          <Button size="sm">Login</Button>
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      style={{
        background: 'linear-gradient(160deg, var(--hz-primary-800), var(--hz-primary-600) 55%, var(--hz-accent-600))',
      }}
    >
      <div className="container py-5">
        <div className="row align-items-center gy-5 py-4">
          {/* Left: marketing copy */}
          <div className="col-12 col-lg-6">
            <h1 style={{ color: '#fff', fontSize: 'var(--hz-text-4xl)', fontWeight: 700, lineHeight: 1.15, marginBottom: 16 }}>
              One Platform for Your Entire Workforce
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'var(--hz-text-lg)', marginBottom: 28, maxWidth: 480 }}>
              Attendance &middot; Recruitment &middot; Payroll &middot; Performance &middot; HRMS &mdash; built for
              organizations that have outgrown spreadsheets and outgrown generic HR software too.
            </p>
            <div className="d-flex flex-wrap gap-3 mb-5">
              <a href="#contact">
                <Button size="lg" variant="ghost">
                  Request Demo
                </Button>
              </a>
              <Link to="/careers">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-white border-white"
                  style={{ background: 'transparent' }}
                >
                  View Careers
                </Button>
              </Link>
            </div>
            <div className="d-flex flex-column gap-3">
              <FeatureRow icon={Users} text="A single source of truth for every employee record" />
              <FeatureRow icon={Clock} text="Live attendance, straight from your biometric devices" />
              <FeatureRow icon={TrendingUp} text="Executive-grade reporting, not just raw data dumps" />
            </div>
          </div>

          {/* Right: inline login form */}
          <div className="col-12 col-lg-6 d-flex justify-content-lg-end">
            <div id="login-panel" style={{ width: '100%', maxWidth: 380 }}>
              <InlineLoginCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ icon: Icon, text }) {
  return (
    <div className="d-flex align-items-center gap-3">
      <div
        className="d-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.15)' }}
      >
        <Icon size={16} color="#fff" />
      </div>
      <span style={{ fontSize: 'var(--hz-text-sm)', color: 'rgba(255,255,255,0.9)' }}>{text}</span>
    </div>
  );
}

function InlineLoginCard() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4" style={{ background: 'var(--hz-bg-surface)', borderRadius: 'var(--hz-radius-xl)', boxShadow: 'var(--hz-shadow-xl)' }}>
      <h2 style={{ fontSize: 'var(--hz-text-xl)', fontWeight: 700, marginBottom: 4 }}>Welcome back</h2>
      <p className="text-secondary-hz mb-3" style={{ fontSize: 'var(--hz-text-sm)' }}>
        Sign in to your Vettri HRMS workspace
      </p>

      {error && (
        <div
          className="px-3 py-2 mb-3"
          style={{ background: 'var(--hz-danger-50)', color: 'var(--hz-danger-600)', borderRadius: 'var(--hz-radius-md)', fontSize: 'var(--hz-text-sm)' }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>
            Username
          </label>
          <input type="text" className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" required />
        </div>
        <div className="mb-4">
          <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500 }}>
            Password
          </label>
          <div className="position-relative">
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control pe-5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="btn position-absolute top-50 end-0 translate-middle-y border-0 bg-transparent"
              style={{ color: 'var(--hz-text-muted)' }}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>
        <Button type="submit" variant="primary" className="w-100 justify-content-center" loading={submitting}>
          Sign In
        </Button>
      </form>
    </div>
  );
}

function OpenPositions() {
  const { data: jobs, isLoading } = useQuery({ queryKey: ['careers-jobs', 'home'], queryFn: careersApi.listOpenJobs });
  const latest = (jobs || []).slice(0, 5);

  return (
    <section className="container py-5">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <h2 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, margin: 0 }}>Latest Open Positions</h2>
        <Link to="/careers" className="d-inline-flex align-items-center gap-1 text-decoration-none" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, color: 'var(--hz-primary-600)' }}>
          View all positions <ArrowRight size={15} />
        </Link>
      </div>

      {isLoading && (
        <div className="row g-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="col-12 col-md-6 col-lg-4" key={i}>
              <SkeletonCard />
            </div>
          ))}
        </div>
      )}

      {!isLoading && latest.length === 0 && (
        <div className="hz-surface p-4 text-center" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
          No open positions right now &mdash; check back soon.
        </div>
      )}

      {!isLoading && latest.length > 0 && (
        <div className="hz-surface" style={{ padding: 0, overflow: 'hidden' }}>
          {latest.map((job, i) => (
            <div
              key={job.id}
              className="d-flex align-items-center justify-content-between p-3 px-4"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--hz-border)' }}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--hz-primary-50)', color: 'var(--hz-primary-600)' }}
                >
                  <Briefcase size={17} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--hz-text-base)' }}>{job.title}</div>
                  <div style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
                    {job.departmentName || 'Vettri HRMS'} &middot; {(job.employmentType || 'FULL_TIME').replace('_', '-')}
                  </div>
                </div>
              </div>
              <Link to={`/careers/${job.id}`}>
                <Button size="sm" variant="secondary">
                  Apply Now
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function About() {
  return (
    <section id="about" style={{ background: 'var(--hz-bg-surface)', borderTop: '1px solid var(--hz-border)', borderBottom: '1px solid var(--hz-border)' }}>
      <div className="container py-5">
        <div className="row align-items-center gy-4">
          <div className="col-12 col-lg-6">
            <h2 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 12 }}>About Vettri HRMS</h2>
            <p style={{ fontSize: 'var(--hz-text-base)', color: 'var(--hz-text-secondary)' }}>
              Vettri HRMS brings attendance, recruitment, payroll, performance, and every other people-operations
              workflow into a single system &mdash; so HR teams stop stitching together spreadsheets and disconnected
              tools, and get one dependable source of truth instead.
            </p>
          </div>
          <div className="col-12 col-lg-6">
            <div className="row g-3">
              <StatCard icon={Users} label="Unified employee records" />
              <StatCard icon={Clock} label="Real-time attendance sync" />
              <StatCard icon={Briefcase} label="End-to-end hiring pipeline" />
              <StatCard icon={TrendingUp} label="Actionable HR reporting" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, label }) {
  return (
    <div className="col-6">
      <div className="p-3" style={{ border: '1px solid var(--hz-border)', borderRadius: 'var(--hz-radius-lg)', height: '100%' }}>
        <Icon size={18} color="var(--hz-primary-600)" />
        <p style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500, margin: '8px 0 0' }}>{label}</p>
      </div>
    </div>
  );
}

function Contact() {
  return (
    <section id="contact" className="container py-5">
      <div className="row justify-content-center text-center">
        <div className="col-12 col-lg-7">
          <h2 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 12 }}>Get in Touch</h2>
          <p style={{ fontSize: 'var(--hz-text-base)', color: 'var(--hz-text-secondary)', marginBottom: 24 }}>
            Want a walkthrough of Vettri HRMS, or have a question about a role you've applied to? Reach out and we'll
            get back to you.
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-4">
            {/* Placeholder contact address - update to your team's real inbox before going live. */}
            <a href="mailto:hello@vettrihrms.com" className="d-inline-flex align-items-center gap-2 text-decoration-none" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 500, color: 'var(--hz-text-primary)' }}>
              <Mail size={16} /> hello@vettrihrms.com
            </a>
            <span className="d-inline-flex align-items-center gap-2" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
              <MapPinIcon size={16} /> Vellore, Tamil Nadu, India
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: 'var(--hz-gray-900)' }}>
      <div className="container py-5">
        <div className="row gy-4">
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className="d-flex align-items-center justify-content-center"
                style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--hz-primary-600)', color: '#fff', fontWeight: 700, fontSize: 12 }}
              >
                H1
              </div>
              <span style={{ fontWeight: 700, color: '#fff' }}>Vettri <span style={{ color: '#FFB000' }}>HRMS</span></span>
            </div>
            <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-gray-400)', maxWidth: 280 }}>
              One platform for your entire workforce &mdash; attendance, recruitment, payroll, performance, and HRMS.
            </p>
          </div>
          <div className="col-6 col-md-4">
            <h6 style={{ color: '#fff', fontSize: 'var(--hz-text-sm)', fontWeight: 600, marginBottom: 12 }}>Product</h6>
            <FooterLink href="#home" label="Home" />
            <FooterLink href="#about" label="About" />
            <FooterLink to="/careers" label="Careers" />
          </div>
          <div className="col-6 col-md-4">
            <h6 style={{ color: '#fff', fontSize: 'var(--hz-text-sm)', fontWeight: 600, marginBottom: 12 }}>Account</h6>
            <FooterLink to="/login" label="Login" />
            <FooterLink href="#contact" label="Contact" />
          </div>
        </div>
        <div className="d-flex justify-content-between flex-wrap gap-2 pt-4 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 'var(--hz-text-xs)', color: 'var(--hz-gray-400)' }}>
            &copy; {new Date().getFullYear()} Vettri HRMS. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, to, label }) {
  const style = { display: 'block', fontSize: 'var(--hz-text-sm)', color: 'var(--hz-gray-400)', textDecoration: 'none', marginBottom: 8 };
  if (to) {
    return (
      <Link to={to} style={style}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} style={style}>
      {label}
    </a>
  );
}
