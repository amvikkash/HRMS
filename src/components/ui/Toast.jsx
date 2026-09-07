import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

/**
 * Minimal in-app toast system - the Salary module is the first feature
 * that needs fire-and-forget confirmations (email sent, payroll processed,
 * etc.), so it's introduced here rather than pulling in a new dependency.
 * Follows the same "introduced alongside the first module that needs it"
 * pattern BaseEntity's javadoc describes on the backend.
 */
const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const VARIANT_COLOR = {
  success: 'var(--hz-success-600)',
  error: 'var(--hz-danger-600)',
  info: 'var(--hz-info-600)',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = 'success', duration = 4000) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="hz-toast-stack">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant] || Info;
          return (
            <div key={t.id} className="hz-toast" role="status">
              <Icon size={18} style={{ color: VARIANT_COLOR[t.variant], flexShrink: 0 }} />
              <span className="hz-toast__message">{t.message}</span>
              <button type="button" className="hz-toast__close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
