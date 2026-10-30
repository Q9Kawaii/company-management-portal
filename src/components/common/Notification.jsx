import { useEffect } from 'react';

const notificationStyles = {
  success: {
    container: 'border-slate-800 border-l-emerald-500 bg-slate-900/95',
    icon: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    title: 'text-emerald-300',
    message: 'text-slate-400',
    path: 'm5 12 4.5 4.5L19 7',
  },
  error: {
    container: 'border-slate-800 border-l-red-500 bg-slate-900/95',
    icon: 'border-red-500/30 bg-red-500/10 text-red-400',
    title: 'text-red-300',
    message: 'text-slate-400',
    path: 'M6 6l12 12M18 6 6 18',
  },
  warning: {
    container: 'border-slate-800 border-l-amber-500 bg-slate-900/95',
    icon: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    title: 'text-amber-300',
    message: 'text-slate-400',
    path: 'M12 7v6m0 3.5h.01',
  },
  info: {
    container: 'border-slate-800 border-l-indigo-500 bg-slate-900/95',
    icon: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
    title: 'text-indigo-300',
    message: 'text-slate-400',
    path: 'M12 11v5m0-8.5h.01',
  },
};

export default function Notification({
  type = 'info',
  title,
  message,
  onClose,
  duration = 5000,
}) {
  const styles = notificationStyles[type] || notificationStyles.info;

  useEffect(() => {
    if (!duration || !onClose) return undefined;

    const timer = window.setTimeout(() => {
      onClose();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`flex w-full max-w-md items-start gap-3 rounded-xl border border-l-4 p-3.5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-4 ${styles.container}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${styles.icon}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={styles.path}
          />
        </svg>
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        {title && (
          <h3 className={`text-sm font-semibold ${styles.title}`}>
            {title}
          </h3>
        )}

        {message && (
          <p
            className={`break-words text-sm leading-5 ${title ? 'mt-1' : ''} ${styles.message}`}
          >
            {message}
          </p>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}