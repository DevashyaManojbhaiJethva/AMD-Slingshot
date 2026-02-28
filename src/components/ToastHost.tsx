import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useUiStore } from '../store/useStore';

export const ToastHost = () => {
  const { toasts, removeToast } = useUiStore();

  React.useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timeoutIds = toasts.map((toast) =>
      window.setTimeout(() => removeToast(toast.id), 3200)
    );

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [removeToast, toasts]);

  return (
    <div className="fixed top-20 right-4 z-[80] space-y-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const toneClass = toast.type === 'success'
          ? 'border-agri-green/40 bg-agri-green/10 text-agri-green'
          : toast.type === 'error'
            ? 'border-red-500/40 bg-red-500/10 text-red-500'
            : 'border-blue-500/40 bg-blue-500/10 text-blue-500';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto glass border rounded-xl p-3 flex items-start gap-2 shadow-lg ${toneClass}`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 mt-0.5" />
            )}
            <p className="text-sm leading-snug flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md hover:bg-black/5"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
