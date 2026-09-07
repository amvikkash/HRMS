import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="hz-hero">
      <div className="container position-relative" style={{ padding: '96px 0 88px', zIndex: 1 }}>
        <div className="row align-items-center g-5">
          <div className="col-12 col-lg-6">
            <span className="hz-hero-eyebrow">
              <Sparkles size={13} /> Enterprise HRMS platform
            </span>

            <h1 className="mt-4 mb-3" style={{ fontSize: 'clamp(2.25rem, 4vw, 3.25rem)', fontWeight: 700, lineHeight: 1.12 }}>
              One platform for your entire workforce.
            </h1>

            <p style={{ fontSize: 'var(--hz-text-lg)', color: 'rgba(255,255,255,0.82)', maxWidth: 520, marginBottom: 36 }}>
              Bring employee records, attendance, leave, payroll, and performance into one trusted workspace for HR and
              operations teams.
            </p>

            <div className="d-flex flex-wrap gap-3">
              <Link to="/contact" className="hz-btn-hero-primary d-inline-flex align-items-center gap-2">
                Request Demo <ArrowRight size={16} />
              </Link>
              <Link to="/about" className="hz-btn-hero-secondary">
                Explore the platform
              </Link>
            </div>

            <div className="d-flex align-items-center gap-3 mt-5 flex-wrap" style={{ opacity: 0.78 }}>
              <TrustNote text="Role-based access" />
              <TrustNote text="Live workforce data" />
              <TrustNote text="Built for growing teams" />
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="hz-hero-art">
              <div className="hz-hero-art-panel">
                <DashboardGlyph />
              </div>

              <div className="hz-hero-chip" style={{ top: -18, left: -6, animationDelay: '0s' }}>
                <span className="hz-chip-dot" style={{ background: 'var(--hz-success-500)' }} />
                Leave request approved
              </div>
              <div className="hz-hero-chip" style={{ bottom: 26, right: -18, animationDelay: '1.2s' }}>
                <span className="hz-chip-dot" style={{ background: 'var(--hz-accent-500)' }} />
                Attendance synced live
              </div>
              <div className="hz-hero-chip" style={{ bottom: -20, left: 40, animationDelay: '0.6s' }}>
                <span className="hz-chip-dot" style={{ background: 'var(--hz-primary-500)' }} />
                Performance review · Q3
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustNote({ text }) {
  return (
    <div className="d-inline-flex align-items-center gap-2">
      <CheckCircle2 size={15} color="#b7d4ff" />
      <span style={{ fontSize: 'var(--hz-text-sm)', color: 'rgba(255,255,255,0.78)' }}>{text}</span>
    </div>
  );
}

/** Abstract "product" glyph - a dashboard made of bars, a trend line, and a
 *  ring - built in plain SVG so the hero never depends on a fabricated
 *  screenshot of a screen that doesn't exist yet. */
function DashboardGlyph() {
  return (
    <svg viewBox="0 0 420 300" width="100%" height="300" role="img" aria-label="Illustration of workforce analytics dashboard">
      <rect x="0" y="0" width="420" height="300" rx="14" fill="rgba(255,255,255,0.04)" />

      {/* bar chart */}
      {[
        { x: 24, h: 70 },
        { x: 62, h: 110 },
        { x: 100, h: 88 },
        { x: 138, h: 140 },
        { x: 176, h: 100 },
      ].map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={220 - bar.h}
          width="26"
          height={bar.h}
          rx="6"
          fill={i === 3 ? '#FF8A00' : 'rgba(255,255,255,0.55)'}
        />
      ))}
      <line x1="10" y1="220" x2="220" y2="220" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

      {/* trend line */}
      <polyline
        points="248,150 278,120 308,135 338,88 368,102 396,64"
        fill="none"
        stroke="#a5b4fc"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [248, 150],
        [278, 120],
        [308, 135],
        [338, 88],
        [368, 102],
        [396, 64],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="4" fill="#fff" />
      ))}

      {/* progress ring */}
      <circle cx="330" cy="220" r="34" stroke="rgba(255,255,255,0.18)" strokeWidth="10" fill="none" />
      <circle
        cx="330"
        cy="220"
        r="34"
        stroke="#FFB000"
        strokeWidth="10"
        fill="none"
        strokeDasharray={2 * Math.PI * 34}
        strokeDashoffset={2 * Math.PI * 34 * 0.28}
        strokeLinecap="round"
        transform="rotate(-90 330 220)"
      />
    </svg>
  );
}
