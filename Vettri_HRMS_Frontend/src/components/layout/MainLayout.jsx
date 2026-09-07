import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Breadcrumbs from './Breadcrumbs';
import { NavMemoryProvider } from './NavMemoryContext';
import { BreadcrumbProvider } from './BreadcrumbContext';
import { useAuth } from '../../hooks/useAuth';
import { NAV_SECTIONS } from './navConfig';

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, selectedCompanyId, hasRole, hasPermission } = useAuth();
  const needsWorkspace = user?.roles?.includes('SUPER_ADMIN') && !selectedCompanyId && location.pathname !== '/settings/platform';
  const isDashboardContext = ['/dashboard', '/welcome', '/support'].includes(location.pathname);
  const isLeaveContext = location.pathname === '/leave' || (location.pathname === '/my-profile' && searchTab(location.search) === 'leave');

  // Below the lg breakpoint the sidebar is an overlay drawer, not part of
  // the flex layout (see hz-sidebar-mobile-* in components.css) - close it
  // whenever the route changes so tapping a link doesn't leave the drawer
  // sitting open over the new page.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <NavMemoryProvider>
      <div className="hz-app-shell d-flex">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />
        <div className="hz-app-shell__content d-flex flex-column flex-grow-1">
          <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
          {isDashboardContext && (
            <div className="hz-contextual-nav-wrap">
              <div className="hz-contextual-nav" aria-label="Dashboard context navigation">
                <button type="button" aria-current={location.pathname === '/dashboard' ? 'page' : undefined} className={location.pathname === '/dashboard' ? 'active' : ''} onClick={() => navigate('/dashboard')}>Overview</button>
                <button type="button" aria-current={location.pathname === '/welcome' ? 'page' : undefined} className={location.pathname === '/welcome' ? 'active' : ''} onClick={() => navigate('/welcome')}>Welcome</button>
                <button type="button" aria-current={location.pathname === '/support' ? 'page' : undefined} className={location.pathname === '/support' ? 'active' : ''} onClick={() => navigate('/support')}>Support info</button>
              </div>
            </div>
          )}
          {isLeaveContext && (
            <div className="hz-contextual-nav-wrap">
              <div className="hz-contextual-nav" aria-label="Workforce context navigation">
                <button type="button" onClick={() => navigate(hasRole('EMPLOYEE') ? '/my-profile?tab=attendance' : '/attendance')}>Attendance</button>
                <button type="button" className="active" aria-current="page" onClick={() => navigate('/leave')}>Leave</button>
                {hasPermission('PERFORMANCE_VIEW') && <button type="button" onClick={() => navigate('/performance')}>Performance</button>}
                <button type="button" onClick={() => navigate('/my-payslip')}>Pay & documents</button>
              </div>
            </div>
          )}
          <main className="hz-main-content hz-page-transition flex-grow-1">
            <BreadcrumbProvider>
              <Breadcrumbs />
              {needsWorkspace ? <WorkspaceRequired /> : isSettingsRoute(location.pathname) ? <SettingsWorkspace hasPermission={hasPermission} hasRole={hasRole} /> : <Outlet />}
            </BreadcrumbProvider>
          </main>
        </div>
      </div>
    </NavMemoryProvider>
  );
}

function SettingsWorkspace({ hasPermission, hasRole }) {
  const settings = NAV_SECTIONS.find((section) => section.id === 'administration');
  const items = (settings?.items || []).filter((item) => (!item.permission || hasPermission(item.permission)) && (!item.role || hasRole(item.role)));

  return (
    <div className="hz-admin-settings-shell">
      <aside className="hz-admin-settings-nav" aria-label="Settings navigation">
        <div className="hz-admin-settings-nav__title">Administration</div>
        {items.map((item) => {
          const Icon = item.icon;
          return <Link key={item.to} to={item.to} className="hz-admin-settings-nav__item"><Icon size={16} /><span>{item.label}</span></Link>;
        })}
      </aside>
      <div className="hz-admin-settings-shell__content"><Outlet /></div>
    </div>
  );
}

function isSettingsRoute(pathname) {
  return pathname.startsWith('/settings/');
}

function searchTab(search) {
  return new URLSearchParams(search).get('tab');
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
