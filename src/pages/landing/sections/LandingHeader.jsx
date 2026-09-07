import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../../../components/brand/Logo';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/careers', label: 'Careers' },
  { to: '/contact', label: 'Contact' },
];

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`hz-landing-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container d-flex align-items-center justify-content-between" style={{ height: 72 }}>
        <Link to="/">
          <Logo />
        </Link>

        <nav className="d-none d-lg-flex align-items-center gap-4">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `hz-landing-nav-link ${isActive ? 'is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="d-none d-lg-flex align-items-center gap-2">
          <Link to="/careers" className="hz-landing-nav-link">
            View Openings
          </Link>
          <Link to="/login" className="btn btn-primary btn-sm px-3">
            Login
          </Link>
        </div>

        <button
          className="btn btn-light border-0 d-lg-none d-flex align-items-center justify-content-center"
          style={{ width: 38, height: 38, borderRadius: 9 }}
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="d-lg-none border-top" style={{ borderColor: 'var(--hz-border)', background: '#fff' }}>
          <div className="container d-flex flex-column py-3 gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `hz-landing-nav-link py-2 ${isActive ? 'is-active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/careers" className="hz-landing-nav-link py-2" onClick={() => setMobileOpen(false)}>
              View Openings
            </Link>
            <Link to="/login" className="btn btn-primary btn-sm mt-2" onClick={() => setMobileOpen(false)}>
              Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
