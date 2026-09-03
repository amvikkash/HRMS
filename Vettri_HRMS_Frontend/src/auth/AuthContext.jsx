import { createContext, useCallback, useEffect, useState } from 'react';
import { authApi } from '../api/endpoints/auth';
import { queryClient } from '../api/queryClient';
import { tokenStorage } from './tokenStorage';
import { tenantStorage } from './tenantStorage';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState(() => tenantStorage.getSelectedCompanyId());
  const [isLoading, setIsLoading] = useState(true);

  const setSelectedCompanyId = useCallback((companyId) => {
    queryClient.clear();
    setSelectedCompanyIdState(companyId ? String(companyId) : null);
    tenantStorage.setSelectedCompanyId(companyId);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        console.log('[AUTH DEBUG - Session Restore]', {
          role: me?.role || me?.roles?.[0],
          roles: me?.roles,
          permissions: me?.permissions,
          hasMonitoringView: me?.permissions?.includes('MONITORING_VIEW'),
        });
        setUser(me);
        if (!me?.roles?.includes('SUPER_ADMIN')) setSelectedCompanyId(null);
      } catch {
        // axiosClient's interceptor already tried a refresh and failed if
        // we land here - session really is gone.
        tokenStorage.clear();
        tenantStorage.clear();
        setSelectedCompanyIdState(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await authApi.login(username, password);
    console.log('[AUTH DEBUG - Login Response]', {
      role: data.user?.role || data.user?.roles?.[0],
      roles: data.user?.roles,
      permissions: data.user?.permissions,
      hasMonitoringView: data.user?.permissions?.includes('MONITORING_VIEW'),
    });
    tokenStorage.setTokens(data.accessToken || data.token, data.refreshToken);
    tenantStorage.clear();
    setSelectedCompanyIdState(null);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Best-effort - clear local state regardless of whether the server call succeeded.
    }
    tokenStorage.clear();
    tenantStorage.clear();
    setSelectedCompanyIdState(null);
    setUser(null);
  }, []);

  const hasRole = useCallback((roleName) => !!user?.roles?.includes(roleName), [user]);

  const hasAnyRole = useCallback((roleNames) => roleNames.some((r) => user?.roles?.includes(r)), [user]);

  // Prefer this over hasRole/hasAnyRole for showing/hiding UI - permission
  // codes are aggregated across whatever roles the user holds, so this
  // still works correctly for a custom role built in Settings > Roles that
  // isn't named "HR_ADMIN" but was granted the same permissions.
  const hasPermission = useCallback((code) => !!user?.permissions?.includes(code), [user]);

  const hasAnyPermission = useCallback(
    (codes) => codes.some((c) => user?.permissions?.includes(c)),
    [user]
  );

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    selectedCompanyId,
    setSelectedCompanyId,
    login,
    logout,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
