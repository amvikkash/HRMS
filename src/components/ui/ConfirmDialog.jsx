import Dialog from './Dialog';
import Button from './Button';

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', loading = false }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      )}
    >
      <p className="hz-confirm-dialog__body">This action may affect workspace data and cannot be undone.</p>
    </Dialog>
  );
}
