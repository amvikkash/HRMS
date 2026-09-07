import { Shield } from 'lucide-react';

/**
 * LoginSecurityIndicator
 * Subtle security badge beneath login form
 * Communicates trustworthiness without making unsubstantiated claims
 */
export default function LoginSecurityIndicator() {
  return (
    <div
      className="d-flex align-items-center justify-content-center gap-2 mt-4 pt-3"
      style={{
        fontSize: 'var(--hz-text-xs)',
        color: 'var(--hz-text-muted)',
        borderTop: '1px solid var(--hz-border)',
      }}
    >
      <Shield size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
      <span>Enterprise security by default</span>
    </div>
  );
}
