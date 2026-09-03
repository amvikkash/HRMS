import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Breadcrumbs from './Breadcrumbs';
import { NavMemoryProvider } from './NavMemoryContext';
import { BreadcrumbProvider } from './BreadcrumbContext';
import { useAuth } from '../../hooks/useAuth';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, selectedCompanyId } = useAuth();
  const needsWorkspace = user?.roles?.includes('SUPER_ADMIN') && !selectedCompanyId && location.pathname !== '/settings/platform';
  const isDashboardContext = ['/dashboard', '/welcome', '/support'].includes(location.pathname);

  // Below the lg breakpoint the sidebar is an overlay drawer, not part of
  // the flex layout (see hz-sidebar-mobile-* in components.css) - close it
  // whenever the route changes so tapping a link doesn't leave the drawer
  // sitting open over the new page.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <NavMemoryProvider>
      <div className="d-flex" style={{ minHeight: '100vh', background: 'var(--hz-bg-canvas)' }}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />
        <div className="d-flex flex-column flex-grow-1" style={{ minWidth: 0 }}>
          <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
          {isDashboardContext && (
            <div className="hz-contextual-nav-wrap">
              <div className="hz-contextual-nav" aria-label="Dashboard context navigation">
                <button type="button" className={location.pathname === '/dashboard' ? 'active' : ''} onClick={() => navigate('/dashboard')}>Overview</button>
                <button type="button" className={location.pathname === '/welcome' ? 'active' : ''} onClick={() => navigate('/welcome')}>Welcome</button>
                <button type="button" className={location.pathname === '/support' ? 'active' : ''} onClick={() => navigate('/support')}>Support info</button>
              </div>
            </div>
          )}
          <main className="hz-main-content hz-page-transition flex-grow-1 p-3 p-md-4">
            <BreadcrumbProvider>
              <Breadcrumbs />
              {needsWorkspace ? <WorkspaceRequired /> : <Outlet />}
            </BreadcrumbProvider>
          </main>
        </div>
      </div>
    </NavMemoryProvider>
  );
}

function WorkspaceRequired() {
  return (
    <div className="hz-state py-5">
      <div className="hz-state__icon-wrap" aria-hidden="true"><Building2 size={24} /></div>
      <h1 className="hz-state__title">Choose a workspace to continue</h1>
      <p className="hz-state__description">Select a company from the workspace switcher in the top bar before opening tenant HR data.</p>
      <Link to="/settings/platform" className="btn btn-outline-primary">Open platform administration</Link>
    </div>
  );
}
