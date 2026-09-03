import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/endpoints/auth';
import Button from '../components/ui/Button';
import AuthPageShell from '../components/auth/AuthPageShell';

const passwordRequirements = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number',
  'One special character',
];

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const reset = useMutation({
    mutationFn: () => authApi.resetPassword(token, password),
    onSuccess: () => setSent(true),
    onError: (e) => setError(e.response?.data?.message || 'This reset link is invalid or expired.'),
  });

  const request = useMutation({
    mutationFn: () => authApi.requestPasswordReset(identifier),
    onSuccess: () => setSent(true),
    onError: () => setError('We could not send the reset email. Please try again.'),
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    reset.mutate();
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    setError('');
    request.mutate();
  };

  if (sent) {
    return (
      <AuthPageShell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 24, color: 'var(--hz-success-600)' }}>
            <CheckCircle2 size={48} style={{ margin: '0 auto' }} />
          </div>
          <h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 8 }}>
            {token ? 'Password updated' : 'Check your email'}
          </h1>
          <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', marginBottom: 32 }}>
            {token
              ? 'Your password has been reset successfully. You can now sign in with your new password.'
              : 'If an account matches that identifier, we sent a secure reset link to your email.'}
          </p>
          <Link to="/login" className="btn btn-primary" style={{ minWidth: 200 }}>
            Go to Login
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 8 }}>
        {token ? 'Create a new password' : 'Forgot your password?'}
      </h1>
      <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', marginBottom: 24 }}>
        {token
          ? 'Choose a strong password for your Vettri HRMS account.'
          : 'Enter your Employee ID or email and we will send a secure reset link.'}
      </p>

      {error && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 16px',
            background: 'var(--hz-danger-50)',
            color: 'var(--hz-danger-600)',
            borderRadius: 'var(--hz-radius-md)',
            border: '1px solid var(--hz-danger-100)',
            fontSize: 'var(--hz-text-sm)',
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {token ? (
        <form onSubmit={handlePasswordSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, marginBottom: 8, display: 'block' }}>
              New Password
            </label>
            <input
              className="form-control"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={reset.isPending}
              autoComplete="new-password"
              style={{
                height: '52px',
                borderRadius: 'var(--hz-radius-md)',
                fontSize: 'var(--hz-text-base)',
                padding: '0 16px',
                border: '1px solid var(--hz-border)',
                boxSizing: 'border-box',
                transition: 'all var(--hz-transition-base)',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Confirm Password
            </label>
            <input
              className="form-control"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={reset.isPending}
              autoComplete="new-password"
              style={{
                height: '52px',
                borderRadius: 'var(--hz-radius-md)',
                fontSize: 'var(--hz-text-base)',
                padding: '0 16px',
                border: '1px solid var(--hz-border)',
                boxSizing: 'border-box',
                transition: 'all var(--hz-transition-base)',
              }}
            />
          </div>

          <div style={{ marginBottom: 24, fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', paddingLeft: 20 }}>
            <strong style={{ color: 'var(--hz-text-primary)', display: 'block', marginBottom: 8 }}>Password requirements:</strong>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              {passwordRequirements.map((req) => (
                <li key={req}>{req}</li>
              ))}
            </ul>
          </div>

          <Button type="submit" variant="primary" className="w-100 justify-content-center" loading={reset.isPending} disabled={reset.isPending || !password || !confirm}>
            Reset Password
          </Button>
        </form>
      ) : (
        <form onSubmit={handleRequestSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label className="form-label" style={{ fontSize: 'var(--hz-text-sm)', fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Employee ID or Email
            </label>
            <input
              className="form-control"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="name@company.com or EMP001"
              required
              disabled={request.isPending}
              autoComplete="username"
              style={{
                height: '52px',
                borderRadius: 'var(--hz-radius-md)',
                fontSize: 'var(--hz-text-base)',
                padding: '0 16px',
                border: '1px solid var(--hz-border)',
                boxSizing: 'border-box',
                transition: 'all var(--hz-transition-base)',
              }}
            />
          </div>

          <Button type="submit" variant="primary" className="w-100 justify-content-center" loading={request.isPending} disabled={request.isPending || !identifier.trim()}>
            Send Reset Link
          </Button>
        </form>
      )}

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/login" className="text-decoration-none" style={{ color: 'var(--hz-primary-600)', fontWeight: 500, fontSize: 'var(--hz-text-sm)' }}>
          Back to Login
        </Link>
      </div>
    </AuthPageShell>
  );
}
