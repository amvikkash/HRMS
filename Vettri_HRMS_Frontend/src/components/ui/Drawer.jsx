import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const SIZE_WIDTH = { sm: 380, md: 480, lg: 620 };

/**
 * Slide-over panel from the right edge. Same Escape/focus/scroll-lock
 * behavior as Dialog, different shape - use this instead of Dialog when
 * the content is a multi-step or reference-heavy workflow that benefits
 * from staying open alongside the page behind it (e.g. reviewing a
 * candidate's full profile while the pipeline board stays visible), which
 * the Phase 1 audit flagged Recruitment's stacked modals as not doing well.
 */
export default function Drawer({ open, onClose, title, description, size = 'md', footer, children }) {
  const drawerRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    lastFocusedRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = drawerRef.current?.querySelector(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
    );
    (focusable || drawerRef.current)?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      lastFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="hz-dialog-backdrop position-fixed top-0 start-0 w-100 h-100" onClick={onClose}>
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'hz-drawer-title' : undefined}
        tabIndex={-1}
        className="hz-drawer d-flex flex-column position-fixed top-0 end-0 h-100"
        style={{ width: '100%', maxWidth: SIZE_WIDTH[size] || SIZE_WIDTH.md }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="hz-dialog__header d-flex align-items-start justify-content-between">
            <div>
              {title && (
                <h3 id="hz-drawer-title" className="hz-dialog__title">
                  {title}
                </h3>
              )}
              {description && <p className="hz-dialog__description">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="hz-dialog__close" aria-label="Close panel">
              <X size={18} />
            </button>
          </div>
        )}

        <div className="hz-dialog__body flex-grow-1 overflow-auto">{children}</div>

        {footer && <div className="hz-dialog__footer d-flex align-items-center justify-content-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
