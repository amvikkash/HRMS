import { tokenStorage } from '../auth/tokenStorage';

export const ConnectionState = Object.freeze({
  CONNECTED: 'CONNECTED',
  CONNECTING: 'CONNECTING',
  OFFLINE: 'OFFLINE',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  DISABLED: 'DISABLED',
  DEGRADED: 'DEGRADED',
});

const QUEUE_KEY = 'haodaone_offline_request_queue_v1';
const HEALTH_KEY = 'haodaone_offline_queue_health_v1';
const MAX_QUEUE_ITEMS = 250;
const RETRY_BASE_MS = 5_000;
const MAX_RETRY_MS = 90_000;
const MAX_RETRIES = 8;

const state = {
  nextAttemptAt: null,
  lastSuccessfulUpload: null,
  lastError: null,
  connectionState: typeof navigator !== 'undefined' && navigator.onLine ? ConnectionState.CONNECTED : ConnectionState.OFFLINE,
  flushTimer: null,
  flushing: false,
};

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  const nextHealth = {
    queuedRequests: queue.length,
    maxQueueSize: MAX_QUEUE_ITEMS,
    lastSuccessfulUpload: state.lastSuccessfulUpload,
    lastError: state.lastError,
    nextAttemptAt: state.nextAttemptAt,
    connectionState: state.connectionState,
  };
  localStorage.setItem(HEALTH_KEY, JSON.stringify(nextHealth));
}

export function readQueue() {
  return safeJsonParse(localStorage.getItem(QUEUE_KEY), []).map((item) => ({
    id: item.id || `${Date.now()}-${Math.random()}`,
    method: (item.method || 'POST').toLowerCase(),
    url: item.url || '/',
    baseURL: item.baseURL || '',
    data: item.data ?? null,
    params: item.params ?? {},
    headers: item.headers ?? {},
    retryCount: Number(item.retryCount || 0),
    nextAttemptAt: item.nextAttemptAt || 0,
    createdAt: item.createdAt || Date.now(),
    idempotencyKey: item.idempotencyKey || null,
  }));
}

export function getConnectionState() {
  return state.connectionState;
}

export function setConnectionState(nextState) {
  state.connectionState = nextState;
  if (nextState === ConnectionState.CONNECTED) {
    state.lastError = null;
  }
  localStorage.setItem(
    HEALTH_KEY,
    JSON.stringify({
      queuedRequests: readQueue().length,
      maxQueueSize: MAX_QUEUE_ITEMS,
      lastSuccessfulUpload: state.lastSuccessfulUpload,
      lastError: state.lastError,
      nextAttemptAt: state.nextAttemptAt,
      connectionState: state.connectionState,
    })
  );
}

export function getQueueHealth() {
  const queue = readQueue();
  const health = safeJsonParse(localStorage.getItem(HEALTH_KEY), {});
  return {
    queuedActivities: queue.length,
    maxQueueSize: MAX_QUEUE_ITEMS,
    connectionState: state.connectionState,
    nearLimit: queue.length >= MAX_QUEUE_ITEMS * 0.8,
    lastSuccessfulUpload: state.lastSuccessfulUpload ?? health.lastSuccessfulUpload ?? null,
    lastError: state.lastError ?? health.lastError ?? null,
    nextAttemptAt: state.nextAttemptAt ?? health.nextAttemptAt ?? null,
  };
}

function stableStringify(value) {
  if (value == null) return 'null';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return Object.keys(value)
    .sort()
    .map((key) => `${key}:${stableStringify(value[key])}`)
    .join('|');
}

function computeIdempotencyKey(request) {
  const headers = request.headers || {};
  const fromHeader = headers['Idempotency-Key'] || headers['X-Idempotency-Key'] || headers['idempotency-key'];
  if (fromHeader) return String(fromHeader);
  return `queue:${request.method}:${request.url}:${stableStringify(request.params || {})}:${stableStringify(request.data || {})}`;
}

function getRetryDelayMs(retryCount, error) {
  const status = error?.response?.status;
  if (status === 429) {
    const retryAfter = Number(error.response.headers?.['retry-after'] || error.response.headers?.['Retry-After']);
    if (Number.isFinite(retryAfter)) {
      return Math.max(retryAfter * 1000, 5_000);
    }
  }
  const raw = RETRY_BASE_MS * Math.pow(2, Math.min(retryCount - 1, 6));
  const bounded = Math.min(raw, MAX_RETRY_MS);
  return bounded;
}

export function queueRequestForRetry(request, error) {
  const queue = readQueue();
  const safeRequest = {
    id: request._queueId || `${Date.now()}-${Math.random()}`,
    method: (request.method || 'POST').toLowerCase(),
    url: request.url || '/',
    baseURL: request.baseURL || '',
    params: request.params || {},
    data: request.data ?? null,
    headers: { ...request.headers },
    retryCount: 0,
    createdAt: Date.now(),
    nextAttemptAt: Date.now() + 5_000,
    idempotencyKey: computeIdempotencyKey(request),
  };

  if (safeRequest.headers.Authorization) {
    delete safeRequest.headers.Authorization;
  }
  if (safeRequest.headers.authorization) {
    delete safeRequest.headers.authorization;
  }
  if (safeRequest.headers.Cookie) {
    delete safeRequest.headers.Cookie;
  }

  const existingIndex = queue.findIndex((item) => item.idempotencyKey === safeRequest.idempotencyKey);
  if (existingIndex >= 0) {
    const updated = queue[existingIndex];
    updated.retryCount = Math.max(updated.retryCount, safeRequest.retryCount);
    updated.nextAttemptAt = Math.min(updated.nextAttemptAt || Date.now() + 5_000, safeRequest.nextAttemptAt);
    queue[existingIndex] = updated;
    writeQueue(queue);
    return false;
  }

  if (queue.length >= MAX_QUEUE_ITEMS) {
    state.connectionState = ConnectionState.DEGRADED;
    state.lastError = 'Offline queue limit reached; retaining the oldest queued requests and logging a degraded state.';
    console.warn(state.lastError);
    writeQueue(queue);
    return false;
  }

  queue.push(safeRequest);
  state.nextAttemptAt = safeRequest.nextAttemptAt;
  state.lastError = error ? `${error.response?.status || 'network'} failure queued for retry` : 'Request queued for retry';
  if (queue.length >= MAX_QUEUE_ITEMS * 0.8) {
    console.warn('Offline queue is approaching its storage limit. The Agent is still operating, but the queue is degraded.');
  }
  writeQueue(queue);
  return true;
}

export function markRequestRejectedPermanently(request) {
  const queue = readQueue();
  const nextQueue = queue.filter((item) => item.idempotencyKey !== (request?.idempotencyKey || request?._queueId));
  writeQueue(nextQueue);
  return nextQueue;
}

export function scheduleQueueFlush(axiosInstance) {
  if (state.flushing || !axiosInstance || typeof window === 'undefined') return;
  const queue = readQueue();
  if (!queue.length) {
    state.nextAttemptAt = null;
    return;
  }

  const nextItem = queue.filter((item) => item.nextAttemptAt <= Date.now()).sort((a, b) => a.nextAttemptAt - b.nextAttemptAt)[0] || queue[0];
  const waitMs = Math.max(0, (nextItem?.nextAttemptAt || Date.now()) - Date.now());
  if (state.flushTimer) {
    clearTimeout(state.flushTimer);
  }
  state.flushTimer = setTimeout(() => flushQueuedRequests(axiosInstance), waitMs || 1_000);
}

export async function flushQueuedRequests(axiosInstance) {
  if (!axiosInstance || state.flushing) return;
  state.flushing = true;
  state.flushTimer = null;

  try {
    const queue = readQueue();
    if (!queue.length) {
      state.nextAttemptAt = null;
      return;
    }

    const remaining = [];
    for (const item of queue) {
      if (item.nextAttemptAt > Date.now()) {
        remaining.push(item);
        continue;
      }

      const requestConfig = {
        method: item.method,
        url: item.url,
        baseURL: item.baseURL,
        params: item.params,
        data: item.data,
        headers: {
          ...(item.headers || {}),
        },
        _queueReplayed: true,
      };

      const token = tokenStorage.getAccessToken();
      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }

      try {
        await axiosInstance(requestConfig);
        state.lastSuccessfulUpload = new Date().toISOString();
        state.connectionState = ConnectionState.CONNECTED;
        state.nextAttemptAt = null;
        continue;
      } catch (error) {
        const status = error?.response?.status;
        const isPermanentFailure = status === 400 || status === 401 || status === 403 || status === 404 || status === 422;
        const isRetryableFailure = !error?.response || status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

        if (status === 401) {
          state.connectionState = ConnectionState.AUTHENTICATION_REQUIRED;
          state.lastError = 'Authentication failed while replaying queued requests; queued work remains pending until recovery.';
          remaining.push({ ...item, nextAttemptAt: Date.now() + 60_000, retryCount: Math.max(item.retryCount, 1) });
          break;
        }

        if (status === 403) {
          state.connectionState = ConnectionState.DISABLED;
          state.lastError = 'Request rejected as forbidden/disabled; queued work is retained and will not be retried indefinitely.';
          break;
        }

        if (!isRetryableFailure && !isPermanentFailure) {
          remaining.push({ ...item, nextAttemptAt: Date.now() + 60_000, retryCount: Math.max(item.retryCount, 1) });
          break;
        }

        if (item.retryCount >= MAX_RETRIES) {
          state.connectionState = ConnectionState.DEGRADED;
          state.lastError = 'Queued request exceeded retry budget and is retaining for later diagnosis.';
          remaining.push({ ...item, nextAttemptAt: Date.now() + 60_000, retryCount: item.retryCount });
          break;
        }

        const nextRetryCount = item.retryCount + 1;
        const delay = getRetryDelayMs(nextRetryCount, error);
        state.connectionState = navigator.onLine ? ConnectionState.CONNECTING : ConnectionState.OFFLINE;
        state.nextAttemptAt = Date.now() + delay;
        state.lastError = `Activity upload failed. Retrying in ${Math.ceil(delay / 1000)} seconds.`;
        console.warn(state.lastError);
        remaining.push({ ...item, retryCount: nextRetryCount, nextAttemptAt: state.nextAttemptAt });
      }
    }

    if (!remaining.length) {
      state.nextAttemptAt = null;
    } else {
      state.nextAttemptAt = remaining.reduce((min, item) => Math.min(min, item.nextAttemptAt || Date.now()), Number.POSITIVE_INFINITY);
    }
    writeQueue(remaining);
  } finally {
    state.flushing = false;
    if (readQueue().length) {
      scheduleQueueFlush(axiosInstance);
    }
  }
}

export function setConnectedStatus(isOnline) {
  state.connectionState = isOnline ? ConnectionState.CONNECTED : ConnectionState.OFFLINE;
  if (isOnline) {
    state.lastError = null;
  }
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
  localStorage.removeItem(HEALTH_KEY);
  state.nextAttemptAt = null;
  state.lastError = null;
  state.connectionState = navigator.onLine ? ConnectionState.CONNECTED : ConnectionState.OFFLINE;
}
