import { AlertTriangle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className="hz-state hz-state--error" role="alert">
      <div className="hz-state__icon-wrap">
        <AlertTriangle size={26} />
      </div>
      <h2 className="hz-state__title">{title}</h2>
      {description && <p className="hz-state__description">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
