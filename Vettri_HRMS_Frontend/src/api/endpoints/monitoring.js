import { axiosClient } from '../axiosClient';

/**
 * Employee Monitoring API - talks to the Spring Boot monitoring backend
 * through the app's existing authenticated axios instance (same JWT/refresh
 * flow as every other endpoint module). No separate axios instance, no
 * separate auth handling.
 */
export const monitoringApi = {
  devices: () => axiosClient.get('/api/monitoring/devices').then((res) => res.data),
  enrollDevice: (payload) => axiosClient.post('/api/monitoring/devices', payload).then((res) => res.data),
  deviceById: (id) => axiosClient.get(`/api/monitoring/devices/${id}`).then((res) => res.data),
  sessionsByDevice: (deviceId) => axiosClient.get(`/api/monitoring/sessions/device/${deviceId}`).then((res) => getPageContent(res.data)),
  sessionsByEmployee: (employeeId) => axiosClient.get(`/api/monitoring/sessions/employee/${employeeId}`).then((res) => getPageContent(res.data)),
  searchSessions: (params) => axiosClient.get('/api/monitoring/sessions/search', { params }).then((res) => getPage(res.data)),
  /** `from`/`to` are backend LocalDateTime values covering a UTC range. */
  sessions: (from, to) =>
    axiosClient.get('/api/monitoring/sessions', { params: { from: from || undefined, to: to || undefined } }).then((res) => getPageContent(res.data)),
  requestTokenOtp: (deviceId) => axiosClient.post(`/api/monitoring/devices/${deviceId}/token/request-otp`).then((res) => res.data),
  confirmTokenOtp: (deviceId, otp, reason) => axiosClient.post(`/api/monitoring/devices/${deviceId}/token/confirm`, { otp, reason }).then((res) => res.data),
  tokenRotationHistory: (deviceId) => axiosClient.get(`/api/monitoring/devices/${deviceId}/token/history`).then((res) => res.data),
  productivityReport: (params) => axiosClient.get('/api/monitoring/reports/productivity', { params }).then((res) => res.data),
  managementReport: (params) => axiosClient.get('/api/monitoring/reports/management', { params }).then((res) => res.data),
  exportReport: (format, params) => axiosClient.get(`/api/monitoring/reports/export/${format}`, { params, responseType: 'blob' }).then((res) => res.data),
};

function getPageContent(data) {
  return Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
}

function getPage(data) {
  return {
    content: getPageContent(data),
    totalElements: Number(data?.totalElements) || 0,
    totalPages: Number(data?.totalPages) || 0,
    number: Number(data?.number) || 0,
    size: Number(data?.size) || 0,
  };
}

/**
 * The monitoring DTO field names weren't specified alongside the endpoint
 * list, so these accessors fall back across the common shapes a Spring Boot
 * DTO for this data is likely to use. Centralizing the fallback chains here
 * (instead of scattering `??` chains through every page) means there's one
 * place to trim once the real DTO shapes are confirmed against the backend.
 */
export function getDeviceId(d) {
  return d?.id ?? d?.deviceId;
}
export function getDeviceName(d) {
  return d?.deviceName ?? d?.name ?? 'Unnamed Device';
}
export function getDeviceEmployeeName(d) {
  return d?.employeeName ?? d?.employee?.fullName ?? d?.assignedEmployeeName ?? null;
}
export function getDeviceEmployeeId(d) {
  return d?.employeeId ?? d?.employee?.id ?? null;
}
export function isDeviceOnline(d) {
  if (typeof d?.online === 'boolean') return d.online;
  if (typeof d?.isOnline === 'boolean') return d.isOnline;
  if (typeof d?.status === 'string') return d.status.toUpperCase() === 'ONLINE';
  return false;
}
export function getDeviceStatus(d) {
  if (!isDeviceOnline(d)) return 'OFFLINE';
  return String(d?.status || 'ONLINE').toUpperCase();
}
export function getDeviceCurrentApplication(d) {
  return d?.currentApplication ?? d?.applicationName ?? null;
}
export function getDeviceCurrentWindow(d) {
  return d?.currentWindowTitle ?? d?.windowTitle ?? null;
}
export function getDeviceLastSeen(d) {
  return d?.lastSeenAt ?? d?.lastHeartbeatAt ?? d?.lastHeartbeat ?? d?.lastSeen ?? null;
}
export function getDeviceOS(d) {
  return d?.operatingSystem ?? d?.os ?? d?.osVersion ?? '—';
}
export function getDeviceAgentVersion(d) {
  return d?.agentVersion ?? d?.version ?? '—';
}

export function getSessionId(s) {
  return s?.id ?? s?.sessionId;
}
export function getSessionEmployeeName(s) {
  return s?.employeeName ?? s?.employee?.fullName ?? '—';
}
export function getSessionEmployeeId(s) {
  return s?.employeeId ?? s?.employee?.id ?? null;
}
export function getSessionDeviceName(s) {
  return s?.deviceName ?? s?.device?.deviceName ?? '—';
}
export function getSessionDeviceId(s) {
  return s?.deviceId ?? s?.device?.id ?? null;
}
export function getSessionApp(s) {
  return s?.applicationName ?? s?.appName ?? s?.application ?? 'Unknown App';
}
export function getSessionWindowTitle(s) {
  return s?.windowTitle ?? s?.title ?? '—';
}
export function getSessionStart(s) {
  return s?.startTime ?? s?.startedAt ?? s?.start ?? null;
}
export function getSessionEnd(s) {
  return s?.endTime ?? s?.endedAt ?? s?.end ?? null;
}
export function getSessionDurationSeconds(s) {
  if (typeof s?.durationSeconds === 'number') return s.durationSeconds;
  if (typeof s?.duration === 'number') return s.duration;
  const start = getSessionStart(s);
  const end = getSessionEnd(s);
  if (start && end) {
    const seconds = (new Date(end).getTime() - new Date(start).getTime()) / 1000;
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  }
  return 0;
}

/** Sums session duration per application, sorted descending - powers the "Top Applications" panels. */
export function aggregateSessionsByApp(sessions, limit = 5) {
  const totals = new Map();
  for (const s of sessions || []) {
    const app = getSessionApp(s);
    totals.set(app, (totals.get(app) || 0) + getSessionDurationSeconds(s));
  }
  return Array.from(totals.entries())
    .map(([applicationName, seconds]) => ({ applicationName, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, limit);
}
