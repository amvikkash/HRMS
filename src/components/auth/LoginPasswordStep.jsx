import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Button from '../ui/Button';

/**
 * LoginPasswordStep
 * Displays the second step: password entry
 * Shows personalized welcome and secure password input with visibility toggle
 */
export default function LoginPasswordStep({
  username = '',
  password = '',
  onPasswordChange,
  onSubmit,
  loading = false,
  error = null,
  onBack,
  userEmail = null,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="login-step">
      <div
        className="mb-5 pb-3"
        style={{
          borderBottom: '2px solid transparent',
          transition: 'border-color var(--hz-transition-base)',
        }}
      >
        <h2 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 8, color: 'var(--hz-text-primary)' }}>
          Welcome back
        </h2>
        <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', margin: 0, marginBottom: 12 }}>
          Sign in to continue to your workspace
        </p>
        <div
          style={{
            background: 'var(--hz-primary-50)',
            color: 'var(--hz-primary-700)',
            padding: '8px 12px',
            borderRadius: 'var(--hz-radius-sm)',
            fontSize: 'var(--hz-text-sm)',
            fontWeight: 500,
          }}
        >
          {userEmail || username}
        </div>
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

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            className="hz-form-label"
            style={{
              fontSize: 'var(--hz-text-sm)',
              fontWeight: 600,
              color: 'var(--hz-text-primary)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Password
          </label>
          <div
            className="position-relative"
            style={{
              transition: 'all var(--hz-transition-base)',
              transform: isFocused ? 'translateY(-1px)' : 'translateY(0)',
            }}
          >
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control login-input"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="••••••••"
              autoFocus
              required
              disabled={loading}
              autoComplete="current-password"
              style={{
                height: '52px',
                borderRadius: 'var(--hz-radius-md)',
                fontSize: 'var(--hz-text-base)',
                paddingRight: '48px',
                paddingLeft: '16px',
                borderColor: isFocused ? 'var(--hz-primary-600)' : 'var(--hz-border)',
                boxShadow: isFocused ? 'var(--hz-shadow-focus)' : 'none',
                transition: 'all var(--hz-transition-base)',
                borderWidth: '1px',
                borderStyle: 'solid',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="btn position-absolute top-50 end-0 translate-middle-y border-0 bg-transparent"
              style={{
                color: 'var(--hz-text-muted)',
                padding: '8px 12px',
                transition: 'color var(--hz-transition-base)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--hz-text-secondary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--hz-text-muted)')}
              tabIndex="-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
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
          disabled={!password || loading}
        >
          Sign In
        </Button>
      </form>

      <div className="d-flex align-items-center gap-2 mt-4" style={{ fontSize: 'var(--hz-text-sm)' }}>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-link text-decoration-none"
          style={{
            color: 'var(--hz-primary-600)',
            padding: 0,
            fontWeight: 500,
          }}
        >
          ← Use different account
        </button>
      </div>

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
