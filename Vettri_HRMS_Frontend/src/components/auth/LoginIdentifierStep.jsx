import { useState } from 'react';
import { Mail } from 'lucide-react';
import Button from '../ui/Button';

/**
 * LoginIdentifierStep
 * Displays the first step: email/username entry with continue button
 * Communicates enterprise professionalism and minimal cognitive load
 */
export default function LoginIdentifierStep({
  identifier = '',
  onIdentifierChange,
  onContinue,
  loading = false,
  error = null,
  onFocus = null,
}) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  return (
    <div className="login-step">
      <div className="mb-4 pb-2" style={{ borderBottom: '2px solid transparent', transition: 'border-color var(--hz-transition-base)' }}>
        <h2 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 8, color: 'var(--hz-text-primary)' }}>
          Sign in to VETTRI
        </h2>
        <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', margin: 0 }}>
          Enter your work email or employee ID
        </p>
      </div>

      {error && (
        <div
          className="mb-3 px-3 py-3 d-flex align-items-start gap-3"
          style={{
            background: 'var(--hz-danger-50)',
            color: 'var(--hz-danger-600)',
            borderRadius: 'var(--hz-radius-md)',
            border: '1px solid var(--hz-danger-100)',
            fontSize: 'var(--hz-text-sm)',
            animation: 'slideDown var(--hz-transition-base) ease',
          }}
        >
          <div style={{ marginTop: 2, flexShrink: 0 }}>!</div>
          <div>{error}</div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onContinue();
        }}
      >
        <div className="mb-4">
          <label
            className="form-label"
            style={{
              fontSize: 'var(--hz-text-sm)',
              fontWeight: 600,
              color: 'var(--hz-text-primary)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Work Email or Employee ID
          </label>
          <div
            className="position-relative"
            style={{
              transition: 'all var(--hz-transition-base)',
              transform: isFocused ? 'translateY(-1px)' : 'translateY(0)',
            }}
          >
            <input
              type="text"
              className="form-control login-input"
              value={identifier}
              onChange={(e) => onIdentifierChange(e.target.value)}
              onFocus={handleFocus}
              onBlur={() => setIsFocused(false)}
              placeholder="name@company.com or EMP001"
              autoFocus
              required
              disabled={loading}
              autoComplete="username"
              style={{
                height: '52px',
                borderRadius: 'var(--hz-radius-md)',
                fontSize: 'var(--hz-text-base)',
                borderColor: isFocused ? 'var(--hz-primary-600)' : 'var(--hz-border)',
                boxShadow: isFocused ? 'var(--hz-shadow-focus)' : 'none',
                transition: 'all var(--hz-transition-base)',
                padding: '0 16px',
                border: '1px solid',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-100 justify-content-center"
          style={{
            height: '48px',
            fontSize: 'var(--hz-text-base)',
            fontWeight: 600,
            borderRadius: 'var(--hz-radius-md)',
          }}
          loading={loading}
          disabled={!identifier.trim() || loading}
        >
          Continue →
        </Button>
      </form>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-input {
          transition: all var(--hz-transition-base);
        }

        .login-input:focus {
          border-color: var(--hz-primary-600) !important;
          box-shadow: var(--hz-shadow-focus) !important;
        }
      `}</style>
    </div>
  );
}
