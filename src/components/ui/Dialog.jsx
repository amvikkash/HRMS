import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const SIZE_WIDTH = { sm: 420, md: 560, lg: 680, xl: 860 };

/**
 * Shared modal primitive. Every modal in the app today (12 in Recruitment
 * alone, plus CreateEmployeeModal, ApplyLeaveModal, AssignSalaryStructure
 * Modal, NewPayrollRunModal) hand-rolls its own backdrop + close button,
 * and none of them close on Escape, trap focus, or lock body scroll. This
 * gives every one of those the same behavior for free once they adopt it -
 * see CreateEmployeeModal for the reference migration.
 *
 * Usage:
 *   <Dialog open={open} onClose={onClose} title="Onboard Employee" size="lg">
 *     <form>...</form>
 *   </Dialog>
 *
 * `footer` is optional - pass it to get a sticky footer bar (typical for
 * Cancel/Submit actions) separated from scrollable body content. Omit it
 * and put your own submit button inline in children if the form doesn't
 * need one (e.g. CreateEmployeeModal keeps its submit button inside the
 * scrollable form, which is also fine).
 */
export default function Dialog({ open, onClose, title, description, size = 'md', footer, children, hasUnsavedChanges = false }) {
  const dialogRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    lastFocusedRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first focusable element inside the dialog (or the dialog
    // itself as a fallback) so keyboard/screen-reader users land inside it
    // immediately, not still on whatever triggered the open.
    const focusable = dialogRef.current?.querySelector(
      'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
    );
    (focusable || dialogRef.current)?.focus();

    function requestClose() {
      if (hasUnsavedChanges && !window.confirm('Discard your unsaved changes?')) return;
      onClose();
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        requestClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
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
  }, [open, onClose, hasUnsavedChanges]);

  if (!open) return null;

  return (
    <div
      className="hz-dialog-backdrop position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      onClick={() => {
        if (!hasUnsavedChanges || window.confirm('Discard your unsaved changes?')) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className="hz-dialog d-flex flex-column"
        style={{ width: '100%', maxWidth: SIZE_WIDTH[size] || SIZE_WIDTH.md }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="hz-dialog__header d-flex align-items-start justify-content-between">
            <div>
              {title && (
                  <h3 id={titleId} className="hz-dialog__title">
                  {title}
                </h3>
              )}
              {description && <p className="hz-dialog__description">{description}</p>}
            </div>
            <button type="button" onClick={() => { if (!hasUnsavedChanges || window.confirm('Discard your unsaved changes?')) onClose(); }} className="hz-dialog__close" aria-label="Close dialog">
              <X size={18} />
            </button>
          </div>
        )}

        <div className="hz-dialog__body overflow-auto">{children}</div>

        {footer && <div className="hz-dialog__footer d-flex align-items-center justify-content-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
