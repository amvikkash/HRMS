/**
 * Backend/DB timestamps are stored and returned in UTC. Every helper in this
 * file is purely a *display* concern - nothing here mutates or re-stores a
 * timestamp, it only formats a UTC instant for an Asia/Kolkata viewer.
 *
 * Asia/Kolkata has a fixed +05:30 offset with no DST, so we can safely use
 * Intl's IANA timezone support for display and simple offset arithmetic for
 * computing "today in IST" query boundaries.
 */
const IST_TIME_ZONE = 'Asia/Kolkata';

function toDate(value) {
  if (!value) return null;
  const normalizedValue = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value) ? `${value}Z` : value;
  const date = value instanceof Date ? value : new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** e.g. "21 Aug 2026, 3:45 PM" */
export function formatDateTimeIST(value) {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** e.g. "21 Aug 2026" */
export function formatDateIST(value) {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** e.g. "3:45 PM" */
export function formatTimeIST(value) {
  const date = toDate(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** Relative "time ago" for last-seen/heartbeat columns, e.g. "5m ago". */
export function timeAgoIST(value) {
  const date = toDate(value);
  if (!date) return 'Never';
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 0) return formatDateTimeIST(value);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDateIST(value);
}

/** Seconds -> "1h 12m" / "12m 4s" / "4s". */
export function formatDurationShort(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/**
 * UTC instant boundaries for "today" as measured in Asia/Kolkata, suitable
 * for passing straight into the `from`/`to` params of
 * GET /api/monitoring/sessions. Stored timestamps never change - only the
 * window we ask the backend to filter by is timezone-aware.
 */
export function todayRangeIST() {
  const nowIstDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // "2026-08-21"

  const from = new Date(`${nowIstDateStr}T00:00:00.000+05:30`);
  const to = new Date(`${nowIstDateStr}T23:59:59.999+05:30`);
  return { from: toBackendLocalDateTime(from), to: toBackendLocalDateTime(to), istDate: nowIstDateStr };
}

/** yyyy-mm-dd (IST) for a UTC instant - used to pre-fill <input type="date"> filters. */
export function toISTDateInputValue(value) {
  const date = toDate(value) || new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Converts a yyyy-mm-dd (IST) date-input value into a UTC ISO start/end-of-day instant. */
export function istDateInputToUtcRange(dateStr) {
  if (!dateStr) return { from: undefined, to: undefined };
  const from = new Date(`${dateStr}T00:00:00.000+05:30`);
  const to = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { from: toBackendLocalDateTime(from), to: toBackendLocalDateTime(to) };
}

/** Spring's monitoring read endpoints accept LocalDateTime, not offset timestamps. */
function toBackendLocalDateTime(date) {
  return date.toISOString().slice(0, 23);
}
