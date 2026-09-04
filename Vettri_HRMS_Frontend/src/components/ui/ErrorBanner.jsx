import { AlertTriangle } from 'lucide-react';

export default function ErrorBanner({ children, title = 'Something went wrong', className = '' }) {
  return (
    <div className={`hz-error-banner ${className}`.trim()} role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{children}</span>
      </div>
    </div>
  );
}
