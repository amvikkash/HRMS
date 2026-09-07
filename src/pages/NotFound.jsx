import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center" style={{ minHeight: '100vh' }}>
      <Compass size={40} style={{ color: 'var(--hz-text-muted)', marginBottom: 16 }} />
      <h1 style={{ fontSize: 'var(--hz-text-3xl)', fontWeight: 700 }}>Page not found</h1>
      <p className="text-secondary-hz mb-4">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/">
        <Button>Back to Dashboard</Button>
      </Link>
    </div>
  );
}
