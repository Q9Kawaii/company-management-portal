export default function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  variant = 'danger',
}) {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  const confirmStyles = isDanger
    ? 'bg-red-600 shadow-red-950/60 hover:bg-red-500 focus-visible:ring-red-400/50'
    : 'bg-indigo-600 shadow-indigo-950/60 hover:bg-indigo-500 focus-visible:ring-indigo-400/50';

  const iconStyles = isDanger
    ? 'border-red-500/25 bg-red-500/10 text-red-400'
    : 'border-indigo-500/25 bg-indigo-500/10 text-indigo-400';

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget && !loading) {
      onCancel?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={handleBackdropClick}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/60 sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${iconStyles}`}
          >
            {isDanger ? (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 3.5h.01M10.3 4.2 2.9 17a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 11v5M12 8h.01" />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-semibold tracking-tight text-white"
            >
              {title}
            </h2>

            <p
              id="confirm-dialog-message"
              className="mt-2 break-words text-sm leading-6 text-slate-400"
            >
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${confirmStyles}`}
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />
            )}
            {loading ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}