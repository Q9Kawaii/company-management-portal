import { useState } from 'react';
import ConfirmDialog from '../common/ConfirmDialog';

export default function DeactivateUserDialog({
  isOpen,
  user,
  onConfirm,
  onCancel,
  loading = false,
}) {
  const [reason, setReason] = useState('');

  if (!user) return null;

  const isActive = user.isActive !== false;
  const action = isActive ? 'Deactivate' : 'Reactivate';

  const handleConfirm = async () => {
    await onConfirm?.({
      user,
      isActive: !isActive,
      reason: reason.trim(),
    });

    setReason('');
  };

  const handleCancel = () => {
    setReason('');
    onCancel?.();
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={`${action} User`}
      message={
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">
            {isActive
              ? `Are you sure you want to deactivate ${user.name || user.fullName || user.userId}? They will no longer be able to access the portal. Their existing project assignments and history will be preserved.`
              : `Are you sure you want to reactivate ${user.name || user.fullName || user.userId}? They will regain access to the portal according to their role and permissions.`}
          </p>

          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3 sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-sm font-semibold text-indigo-200">
                {(user.name || user.fullName || user.userId || 'U')
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user.name || user.fullName || 'Unnamed User'}
                </p>

                <p className="mt-0.5 break-words text-xs text-slate-400">
                  {user.userId || user.id || 'No user ID'}
                  {user.role ? ` · ${user.role}` : ''}
                </p>
              </div>

              <span
                className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  isActive
                    ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                    : 'border-red-400/30 bg-red-500/15 text-red-200'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? 'bg-emerald-400' : 'bg-red-400'
                  }`}
                  aria-hidden="true"
                />
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {isActive && (
            <div>
              <label
                htmlFor="deactivation-reason"
                className="mb-1.5 block text-sm font-medium text-slate-200"
              >
                Reason for deactivation{' '}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>

              <textarea
                id="deactivation-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Enter a reason..."
                rows={3}
                maxLength={500}
                disabled={loading}
                className="min-h-24 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-base leading-relaxed text-white transition-colors placeholder:text-slate-500 focus-visible:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm motion-reduce:transition-none"
              />

              <p className="mt-1.5 text-right text-xs text-slate-400">
                {reason.length}/500
              </p>
            </div>
          )}
        </div>
      }
      confirmText={loading ? 'Please wait...' : action}
      cancelText="Cancel"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      loading={loading}
      variant={isActive ? 'danger' : 'primary'}
    />
  );
}