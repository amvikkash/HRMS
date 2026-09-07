import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/brand/Logo';
import LoginBrandPanel from '../components/auth/LoginBrandPanel';
import LoginIdentifierStep from '../components/auth/LoginIdentifierStep';
import LoginPasswordStep from '../components/auth/LoginPasswordStep';
import LoginSecurityIndicator from '../components/auth/LoginSecurityIndicator';
import { mapPasswordError, mapIdentifierError } from '../utils/errorMapping';

/**
 * Premium two-step VETTRI HRMS login experience
 * Step 1: Identifier (email/employee ID)
 * Step 2: Password (after identifier is confirmed)
 *
 * Architecture preserved: uses existing AuthContext.login, JWT storage, and role system
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from
    ? `${location.state.from.pathname}${location.state.from.search || ''}${location.state.from.hash || ''}`
    : '/';

  // Two-step flow state
  const [step, setStep] = useState('identifier'); // 'identifier' | 'password' | 'success'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifiedIdentifier, setVerifiedIdentifier] = useState(null);

  /**
   * Step 1: Handle identifier input
   * In a real two-step system, this might call an API to verify the identifier exists
   * For now, we proceed to password step locally (API will validate on login)
   */
  async function handleIdentifierContinue() {
    if (!identifier.trim()) {
      setError('Please enter your email or employee ID');
      return;
    }

    // Simulate brief verification
    setError(null);
    setSubmitting(true);

    try {
      // In this implementation, we trust the backend login API to validate the identifier
      // A more sophisticated implementation might call an API to pre-check the identifier
      setVerifiedIdentifier(identifier);
      setStep('password');
    } catch (err) {
      setError(mapIdentifierError(err));
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Step 2: Handle password submission
   * Calls the existing login() function with identifier + password
   */
  async function handlePasswordSubmit() {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await login(identifier, password);
      // Navigate after successful login
      navigate(from, { replace: true });
    } catch (err) {
      setError(mapPasswordError(err));
      // Keep user on password step to retry
    } finally {
      setSubmitting(false);
    }
  }

  /**
   * Go back to identifier step
   */
  function handleBackToIdentifier() {
    setStep('identifier');
    setPassword('');
    setError(null);
    setVerifiedIdentifier(null);
  }

  return (
    <div className="vettri-login d-flex" style={{ minHeight: '100vh', background: 'var(--hz-bg-canvas)' }}>
      {/* Premium left brand panel - desktop only */}
      <LoginBrandPanel />

      {/* Right form panel */}
      <div
        className="vettri-login__form-panel d-flex flex-column justify-content-center align-items-center flex-grow-1 p-4"
        style={{ overflowY: 'auto' }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            marginY: 'auto',
          }}
        >
          {/* Mobile logo */}
          <div className="d-flex d-lg-none mb-5">
            <Link to="/" className="text-decoration-none">
              <Logo size={36} />
            </Link>
          </div>

          {/* Step indicator or breadcrumb - subtle */}
          {step === 'password' && (
            <div
              style={{
                fontSize: 'var(--hz-text-xs)',
                color: 'var(--hz-text-muted)',
                marginBottom: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Step 2 of 2
            </div>
          )}

          {/* Smooth step transitions */}
          <div
            style={{
              animation: 'fadeInSlide 300ms ease-out',
              minHeight: '300px',
            }}
          >
            {step === 'identifier' && (
              <LoginIdentifierStep
                identifier={identifier}
                onIdentifierChange={setIdentifier}
                onContinue={handleIdentifierContinue}
                loading={submitting}
                error={error}
              />
            )}

            {step === 'password' && (
              <LoginPasswordStep
                username={identifier}
                userEmail={verifiedIdentifier}
                password={password}
                onPasswordChange={setPassword}
                onSubmit={handlePasswordSubmit}
                loading={submitting}
                error={error}
                onBack={handleBackToIdentifier}
              />
            )}
          </div>

          {/* Forgot password link - shown on both steps */}
          {step === 'password' && (
            <div className="text-center mt-4">
              <Link
                to="/reset-password"
                className="text-decoration-none"
                style={{
                  fontSize: 'var(--hz-text-sm)',
                  color: 'var(--hz-primary-600)',
                  fontWeight: 500,
                }}
              >
                Forgot your password?
              </Link>
            </div>
          )}

          {/* Security indicator */}
          <LoginSecurityIndicator />
        </div>
      </div>

      <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .vettri-login {
          font-family: var(--hz-font-sans);
          background-color: var(--hz-bg-canvas);
        }

        .vettri-login__form-panel {
          min-height: 100vh;
          background: linear-gradient(to bottom, var(--hz-bg-canvas), rgba(245, 248, 252, 0.5));
        }

        @media (max-width: 992px) {
          .vettri-login__form-panel {
            padding: 2rem 1.5rem;
          }
        }

        @media (max-width: 576px) {
          .vettri-login__form-panel {
            padding: 1.5rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
