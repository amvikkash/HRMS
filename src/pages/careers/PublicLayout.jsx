import { Link } from 'react-router-dom';
import Logo from '../../components/brand/Logo';

export default function PublicLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--hz-bg-canvas)' }}>
      <header style={{ borderBottom: '1px solid var(--hz-border)', background: 'var(--hz-bg-surface)' }}>
        <div className="container py-3 d-flex align-items-center justify-content-between">
          <Link to="/careers" className="text-decoration-none">
            <Logo tagline="Careers" />
          </Link>
          <Link to="/" className="text-decoration-none" style={{ fontSize: 'var(--hz-text-sm)', color: 'var(--hz-text-secondary)' }}>
            &larr; Back to Vettri HRMS
          </Link>
        </div>
      </header>
      <main className="container py-5" style={{ maxWidth: 860 }}>
        {children}
      </main>
      <footer className="container py-4 text-center" style={{ fontSize: 'var(--hz-text-xs)', color: 'var(--hz-text-muted)' }}>
        &copy; {new Date().getFullYear()} Vettri HRMS. All rights reserved.
      </footer>
    </div>
  );
}
