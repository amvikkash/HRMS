import { Users, TrendingUp, Zap } from 'lucide-react';
import Logo from '../brand/Logo';

/**
 * LoginBrandPanel
 * Premium left-side brand experience for desktop
 * Displays VETTRI brand identity with workforce visualization
 */
export default function LoginBrandPanel() {
  return (
    <div
      className="login-brand-panel d-none d-lg-flex flex-column justify-content-between p-5"
      style={{
        width: '48%',
        background: 'linear-gradient(135deg, var(--hz-primary-900) 0%, var(--hz-primary-800) 50%, var(--hz-primary-700) 100%)',
        color: 'var(--hz-text-on-primary)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Animated background elements */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="dots" x="10" y="10" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.5" fill="var(--hz-text-on-primary)" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#dots)" />
        </svg>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Logo tone="onDark" size={40} wordmarkSize="var(--hz-text-2xl)" />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1
          style={{
            fontSize: 'var(--hz-text-4xl)',
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 16,
            letterSpacing: '-0.02em',
          }}
        >
          People. Performance. Progress.
        </h1>
        <p
          style={{
            fontSize: 'var(--hz-text-lg)',
            opacity: 0.85,
            lineHeight: 1.6,
            maxWidth: 520,
            marginBottom: 48,
            fontWeight: 400,
          }}
        >
          One intelligent workspace for managing your entire workforce. From hiring to retirement, we're with you at every stage.
        </p>

        <div className="d-flex flex-column gap-4">
          <BrandFeature
            icon={Users}
            title="Unified Employee Records"
            description="A single source of truth for every employee across your organization"
          />
          <BrandFeature
            icon={TrendingUp}
            title="Data-Driven Insights"
            description="Executive-grade analytics and reporting, not just raw data dumps"
          />
          <BrandFeature
            icon={Zap}
            title="Real-Time Operations"
            description="Live attendance, immediate approvals, and instant notifications"
          />
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          fontSize: 'var(--hz-text-sm)',
          opacity: 0.5,
        }}
      >
        © {new Date().getFullYear()} Vettri HRMS. All rights reserved.
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .login-brand-panel {
          animation: gradientShift 8s ease infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background: linear-gradient(135deg, var(--hz-primary-900) 0%, var(--hz-primary-800) 50%, var(--hz-primary-700) 100%); }
          50% { background: linear-gradient(135deg, var(--hz-primary-700) 0%, var(--hz-primary-900) 50%, var(--hz-primary-800) 100%); }
        }
      `}</style>
    </div>
  );
}

function BrandFeature({ icon: Icon, title, description }) {
  return (
    <div className="d-flex gap-3">
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <Icon size={20} style={{ color: 'var(--hz-accent-500)' }} />
      </div>
      <div>
        <div
          style={{
            fontSize: 'var(--hz-text-sm)',
            fontWeight: 600,
            marginBottom: 4,
            color: 'var(--hz-text-on-primary)',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 'var(--hz-text-sm)',
            opacity: 0.75,
            lineHeight: 1.5,
            color: 'var(--hz-text-on-primary)',
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}
