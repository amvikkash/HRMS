import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
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

export default function ActivateAccount() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const invite = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => authApi.inspectInvitation(token),
    enabled: !!token,
    retry: false,
  });

  const activate = useMutation({
    mutationFn: () => authApi.activateAccount(token, password),
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.response?.data?.message || 'We could not activate this account.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    activate.mutate();
  };

  const failure = !token || invite.isError;

  if (done) {
    return (
      <AuthPageShell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 24, color: 'var(--hz-success-600)' }}>
            <CheckCircle2 size={48} style={{ margin: '0 auto' }} />
          </div>
          <h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 8 }}>
            Your account has been activated successfully
          </h1>
          <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', marginBottom: 32 }}>
            You can now sign in to Vettri HRMS with your Employee ID or email.
          </p>
          <Link to="/login" className="btn btn-primary" style={{ minWidth: 200 }}>
            Go to Login
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  if (failure) {
    return (
      <AuthPageShell>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 24, color: 'var(--hz-danger-600)' }}>
            <ShieldAlert size={48} style={{ margin: '0 auto' }} />
          </div>
          <h1 style={{ fontSize: 'var(--hz-text-2xl)', fontWeight: 700, marginBottom: 8 }}>
            {invite.error?.response?.data?.message || 'This invitation link is invalid or expired.'}
          </h1>
          <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', marginBottom: 32 }}>
            Please contact your HR administrator for a new invitation.
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
        Welcome to Vettri HRMS
      </h1>
      <p style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-muted)', marginBottom: 24 }}>
        Create your password{invite.data?.name ? `, ${invite.data.name}` : ''}
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

      <form onSubmit={handleSubmit}>
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
            disabled={activate.isPending}
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
            disabled={activate.isPending}
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

        <Button type="submit" variant="primary" className="w-100 justify-content-center" loading={activate.isPending} disabled={activate.isPending || !password || !confirm}>
          Activate Account
        </Button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/login" className="text-decoration-none" style={{ color: 'var(--hz-primary-600)', fontWeight: 500, fontSize: 'var(--hz-text-sm)' }}>
          Back to Login
        </Link>
      </div>
    </AuthPageShell>
  );
}
