import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';

/**
 * AuthPageShell
 * Unified container for all authentication pages (login, reset password, activate account)
 * Provides consistent premium styling and responsive layout
 * Replaces the ad-hoc AuthShell from ActivateAccount with a more flexible version
 */
export default function AuthPageShell({
  children,
  showLogo = true,
  maxWidth = 440,
  showBackButton = false,
  onBack = null,
}) {
  return (
    <div
      className="auth-page-shell d-flex align-items-center justify-content-center p-4"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, var(--hz-bg-canvas), rgba(245, 248, 252, 0.3))',
      }}
    >
      <main
        className="auth-page-content"
        style={{
          width: '100%',
          maxWidth,
          animation: 'fadeInSlide 400ms ease-out',
        }}
      >
        {showLogo && (
          <div className="mb-5">
            <Link to="/" className="text-decoration-none">
              <Logo size={36} />
            </Link>
          </div>
        )}

        <div className="auth-page-body">{children}</div>

        {showBackButton && onBack && (
          <div className="d-flex justify-content-center mt-6">
            <button
              onClick={onBack}
              className="btn btn-link text-decoration-none"
              style={{
                color: 'var(--hz-primary-600)',
                fontWeight: 500,
                fontSize: 'var(--hz-text-sm)',
                padding: 0,
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {!showBackButton && (
          <div className="text-center mt-6">
            <Link
              to="/login"
              className="text-decoration-none"
              style={{
                color: 'var(--hz-primary-600)',
                fontWeight: 500,
                fontSize: 'var(--hz-text-sm)',
              }}
            >
              Back to Login
            </Link>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .auth-page-shell {
          background-color: var(--hz-bg-canvas);
          font-family: var(--hz-font-sans);
        }

        .auth-page-content {
          will-change: transform;
        }

        .auth-page-body h1 {
          font-size: var(--hz-text-2xl);
          font-weight: 700;
          color: var(--hz-text-primary);
          margin-bottom: 8px;
        }

        .auth-page-body p {
          font-size: var(--hz-text-sm);
          color: var(--hz-text-muted);
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .auth-page-body form {
          margin-bottom: 24px;
        }

        .auth-page-body .form-label {
          font-size: var(--hz-text-sm);
          font-weight: 600;
          color: var(--hz-text-primary);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .auth-page-body .form-control {
          height: 52px;
          border-radius: var(--hz-radius-md);
          font-size: var(--hz-text-base);
          border-color: var(--hz-border);
          transition: all var(--hz-transition-base);
        }

        .auth-page-body .form-control:focus {
          border-color: var(--hz-primary-600);
          box-shadow: var(--hz-shadow-focus);
        }

        @media (max-width: 576px) {
          .auth-page-shell {
            padding: 1rem 1rem;
          }

          .auth-page-content {
            max-width: 100%;
          }

          .auth-page-body h1 {
            font-size: var(--hz-text-xl);
          }

          .auth-page-body p {
            font-size: var(--hz-text-sm);
          }
        }
      `}</style>
    </div>
  );
}
