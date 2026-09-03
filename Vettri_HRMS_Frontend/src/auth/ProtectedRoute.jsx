import { Navigate, Outlet, useLocation } from 'react-router-dom';
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
  const { user, isAuthenticated, isLoading, hasAnyRole, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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

  console.log('[PERMISSION CHECK]', {
    pathname: location.pathname,
    matchedItem: matchedItem?.to,
    requiredPermission,
    requiredRole,
    userPermissions: user?.permissions,
    userRoles: user?.roles,
    hasPermission: requiredPermission ? hasPermission(requiredPermission) : 'N/A',
    hasRole: requiredRole ? !!user?.roles?.includes(requiredRole) : 'N/A',
  });

  if (requiredRole && !hasAnyRole([requiredRole])) {
    console.log('[BLOCKED - Missing Role]', requiredRole);
    return <AccessDenied />;
  }

  if (requiredPermission && !hasPermission(requiredPermission) && !isOwnProfile) {
    console.log('[BLOCKED - Missing Permission]', requiredPermission);
    return <AccessDenied />;
  }

  return <Outlet />;
}

function AccessDenied() {
  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100 p-4" style={{ background: 'var(--hz-bg-canvas)' }}>
      <div className="hz-state" style={{ maxWidth: 460 }}>
        <div className="hz-state__icon-wrap" aria-hidden="true">!</div>
        <h1 className="hz-state__title">You do not have access to this page</h1>
        <p className="hz-state__description">Your account is signed in, but its permissions do not include this workspace.</p>
        <NavigateButton />
      </div>
    </div>
  );
}

function NavigateButton() {
  return <a href="/dashboard" className="btn btn-primary">Back to dashboard</a>;
}
