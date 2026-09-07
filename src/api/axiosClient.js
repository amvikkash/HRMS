import axios from 'axios';
import { tokenStorage } from '../auth/tokenStorage';
import { tenantStorage } from '../auth/tenantStorage';
import {
  ConnectionState,
  flushQueuedRequests,
  getConnectionState,
  queueRequestForRetry,
  readQueue,
  scheduleQueueFlush,
  setConnectionState,
  setConnectedStatus,
} from '../utils/offlineRequestQueue';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://orvexa-l01t.onrender.com';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

axiosClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const path = config.url || '';
  const isCompanyIndependent = path.includes('/api/auth/') || path.startsWith('/api/admin/') || path.startsWith('/api/careers/');
  const selectedCompanyId = tenantStorage.getSelectedCompanyId();
  if (selectedCompanyId && !isCompanyIndependent) {
    config.headers['X-Company-Id'] = selectedCompanyId;
  }
  if (config._queueReplayed) {
    config.headers = { ...config.headers };
  }
  return config;
});

// Queues concurrent requests that 401'd while a single refresh is in
// flight, instead of firing one refresh call per failed request.
let isRefreshing = false;
let pendingQueue = [];

function resolveQueue(error, token) {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  pendingQueue = [];
}

function shouldQueueForOfflineRetry(config, status) {
  if (status === 401) return false;
  if (status === 403) return false;
  if (status === 400 || status === 404 || status === 422) return false;
  if (!config || config._queueReplayed) return false;
  return true;
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/');
    const status = error.response?.status;

    if (status === 401 && !isAuthEndpoint && !originalRequest?._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest._retry = true;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = tokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw error;
        }
        const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
        const accessToken = data.accessToken || data.token;
        tokenStorage.setTokens(accessToken, data.refreshToken);
        resolveQueue(null, accessToken);
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        resolveQueue(refreshError, null);
        setConnectionState(ConnectionState.AUTHENTICATION_REQUIRED);
        tokenStorage.clear();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (!error.response && !originalRequest?._queueReplayed) {
      setConnectedStatus(false);
      const queued = queueRequestForRetry({
        ...originalRequest,
        _queueId: originalRequest?._queueId || `${Date.now()}-${Math.random()}`,
      }, error);
      if (queued) {
        scheduleQueueFlush(axiosClient);
      }
      return Promise.reject(error);
    }

    if (shouldQueueForOfflineRetry(originalRequest, status)) {
      setConnectionState(status === 429 ? ConnectionState.CONNECTING : status >= 500 ? ConnectionState.OFFLINE : getConnectionState());
      const queued = queueRequestForRetry({
        ...originalRequest,
        _queueId: originalRequest?._queueId || `${Date.now()}-${Math.random()}`,
      }, error);
      if (queued) {
        scheduleQueueFlush(axiosClient);
      }
      return Promise.reject(error);
    }

    if (status === 403) {
      setConnectionState(ConnectionState.DISABLED);
      return Promise.reject(error);
    }

    if (status === 429) {
      setConnectionState(ConnectionState.CONNECTING);
      const queued = queueRequestForRetry({
        ...originalRequest,
        _queueId: originalRequest?._queueId || `${Date.now()}-${Math.random()}`,
      }, error);
      if (queued) {
        scheduleQueueFlush(axiosClient);
      }
      return Promise.reject(error);
    }

    if (status >= 500) {
      setConnectionState(ConnectionState.OFFLINE);
      const queued = queueRequestForRetry({
        ...originalRequest,
        _queueId: originalRequest?._queueId || `${Date.now()}-${Math.random()}`,
      }, error);
      if (queued) {
        scheduleQueueFlush(axiosClient);
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setConnectedStatus(true);
    flushQueuedRequests(axiosClient).catch(() => undefined);
  });
  window.addEventListener('offline', () => {
    setConnectedStatus(false);
  });
  if (readQueue().length) {
    scheduleQueueFlush(axiosClient);
  }
}

export { getConnectionState, ConnectionState };
