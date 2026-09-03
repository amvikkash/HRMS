import { AlertTriangle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({ title = 'Something went wrong', description, onRetry }) {
  return (
    <div className="hz-state hz-state--error">
      <div className="hz-state__icon-wrap">
        <AlertTriangle size={26} />
      </div>
      <p className="hz-state__title">{title}</p>
      {description && <p className="hz-state__description">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
