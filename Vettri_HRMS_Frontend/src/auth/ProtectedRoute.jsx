import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PageLoader from '../components/ui/PageLoader';
import { NAV_INDEX } from '../components/layout/navConfig';

/**
 * Wraps a set of routes (via <Outlet/>) behind authentication. Pass
 * `allowedRoles` to additionally gate by role - if the user is signed in
 * but lacks any of the allowed roles, they're redirected to the dashboard
 * rather than the login page (they don't need to re-authenticate, they
 * just don't have access to that particular screen).
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated, isLoading, hasAnyRole, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (hasRole('EMPLOYEE') && location.pathname === '/attendance') {
    return <Navigate to="/my-profile?tab=attendance" replace />;
  }

  if (hasRole('EMPLOYEE') && location.pathname === '/leave') {
    return <Navigate to="/my-profile?tab=leave" replace />;
  }

  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return <AccessDenied />;
  }

  // The backend grants a linked employee access to their own record without
  // granting the broad employee-view permission. Mirror that narrow rule in
  // the route guard so the profile page can actually reach the API.
  const profileId = location.pathname.match(/^\/employees\/([^/]+)$/)?.[1];
  const isOwnProfile = profileId && user?.employeeId && String(user.employeeId) === profileId;

  const matchedItem = [...NAV_INDEX]
    .sort((first, second) => second.to.length - first.to.length)
    .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
  const requiredPermission = matchedItem?.permission;
  const requiredRole = matchedItem?.role;

  if (requiredRole && !hasAnyRole([requiredRole])) {
    return <AccessDenied />;
  }

  if (requiredPermission && !hasPermission(requiredPermission) && !isOwnProfile) {
    return <AccessDenied />;
  }

  return <Outlet />;
}

function AccessDenied() {
  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-4" style={{ background: 'var(--hz-bg-canvas)' }}>
      <div className="hz-state hz-state--error" style={{ maxWidth: 460 }}>
        <div className="hz-state__icon-wrap" aria-hidden="true">
          <ShieldAlert size={26} />
        </div>
        <h1 className="hz-state__title">You do not have access to this page</h1>
        <p className="hz-state__description">Your account is signed in, but its permissions do not include this workspace. If you think this is a mistake, reach out to your workspace administrator.</p>
        <div className="d-flex align-items-center justify-content-center gap-2">
          <a href="/dashboard" className="btn btn-primary">Back to dashboard</a>
          <button type="button" className="btn btn-outline-secondary" onClick={() => window.history.back()}>
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}
