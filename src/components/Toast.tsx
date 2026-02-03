import { memo } from 'react';
import type { Toast as ToastType } from '../hooks/useToast';

interface ToastProps {
  toasts: ToastType[];
  onRemove: (id: number) => void;
}

const Toast = memo(({ toasts, onRemove }: ToastProps) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => onRemove(toast.id)}
        >
          <span className="toast-icon">
            {toast.type === 'success' && '✅'}
            {toast.type === 'error' && '❌'}
            {toast.type === 'info' && 'ℹ️'}
          </span>
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>
  );
});

export default Toast;
