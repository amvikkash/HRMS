// Centralized so axiosClient (which can't import AuthContext without a
// circular dependency) and AuthContext both read/write tokens the same way.
// localStorage is fine here - these are JWTs meant to survive a page
// refresh, and XSS is mitigated at the framework level (React escapes by
// default) rather than by moving the token out of JS-reachable storage.

const ACCESS_TOKEN_KEY = 'haodaone_access_token';
const REFRESH_TOKEN_KEY = 'haodaone_refresh_token';

const readToken = (key) => {
  const value = localStorage.getItem(key);
  return value && value !== 'undefined' && value !== 'null' ? value : null;
};

export const tokenStorage = {
  getAccessToken: () => readToken(ACCESS_TOKEN_KEY),
  getRefreshToken: () => readToken(REFRESH_TOKEN_KEY),
  setTokens: (accessToken, refreshToken) => {
    if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
      throw new Error('Authentication response did not include an access token');
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null') {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
