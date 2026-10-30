import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import useTimeline from '../../hooks/useTimeline';
import TimelineComposer from './TimelineComposer';
import TimelineEntry from './TimelineEntry';
import LoadingSpinner from '../common/LoadingSpinner';

const normalizeRole = (role) => String(role || '').toLowerCase();

export default function Timeline({
  projectId,
  timelineId,
  timelineType = 'main',
  visibility = 'team',
  readOnly = false,
  className = '',
}) {
  const { user } = useAuth();

  // The hook loads entries itself whenever the project or timeline changes.
  const {
    entries = [],
    loading = false,
    errorMessage: error = '',
    fetchEntries,
    createEntry,
    replyToEntry,
    deleteEntry,
    refresh,
  } = useTimeline(projectId, timelineId);

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const role = normalizeRole(user?.role);
  const isAdminOrHR = role === 'admin' || role === 'hr';

  const isStaffTimeline =
    normalizeRole(timelineType) === 'staff' ||
    normalizeRole(visibility) === 'staff';

  const canWrite = useMemo(() => {
    if (!user || readOnly) return false;

    if (isStaffTimeline) {
      return isAdminOrHR;
    }

    return ['admin', 'hr', 'employee', 'intern'].includes(role);
  }, [user, readOnly, isStaffTimeline, isAdminOrHR, role]);

  const canReply = canWrite;

  const loadEntries = useCallback(async () => {
    try {
      setActionError('');

      if (typeof refresh === 'function') {
        await refresh();
      } else if (typeof fetchEntries === 'function') {
        await fetchEntries();
      }
    } catch (loadError) {
      setActionError(loadError?.message || 'Unable to load timeline entries.');
    }
  }, [refresh, fetchEntries]);

  // useTimeline reports failures as `{ success: false }` rather than throwing.
  // Re-throw so the composer keeps the user's text and shows the error.
  const ensureSuccess = (result) => {
    if (result?.success === false) {
      throw new Error(result.error || 'Something went wrong.');
    }
  };

  const handleCreateEntry = async (payload) => {
    if (!canWrite || submitting) return;

    setSubmitting(true);
    setActionError('');

    try {
      ensureSuccess(await createEntry(payload));
      await loadEntries();
    } catch (submitError) {
      setActionError(
        submitError?.message || 'Unable to publish the timeline update.'
      );
      throw submitError;
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (entryId, payload) => {
    if (!canReply || submitting) return;

    setSubmitting(true);
    setActionError('');

    try {
      ensureSuccess(await replyToEntry(entryId, payload));
      await loadEntries();
    } catch (replyError) {
      setActionError(replyError?.message || 'Unable to submit your reply.');
      throw replyError;
    } finally {
      setSubmitting(false);
    }
  };

  // AttachmentUploader has already stored the files and their records by the
  // time this runs, so only the list needs refreshing.
  const handleAttachmentsUploaded = () => loadEntries();

  const handleDeleteEntry = async (entryId) => {
    if (!canWrite || submitting || !deleteEntry) return;

    setSubmitting(true);
    setActionError('');

    try {
      ensureSuccess(await deleteEntry(entryId));
      await loadEntries();
    } catch (deleteError) {
      setActionError(deleteError?.message || 'Unable to delete this entry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`flex min-h-48 items-center justify-center ${className}`}
      >
        <LoadingSpinner label="Loading timeline..." />
      </div>
    );
  }

  return (
    <section className={`min-w-0 space-y-6 ${className}`}>
      {/* Timeline header */}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="break-words text-lg font-semibold tracking-tight text-white">
              {isStaffTimeline ? 'Staff Timeline' : 'Project Timeline'}
            </h2>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                isStaffTimeline
                  ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                  : 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isStaffTimeline ? 'bg-amber-300' : 'bg-indigo-300'
                }`}
                aria-hidden="true"
              />
              {isStaffTimeline ? 'Staff only' : 'Team updates'}
            </span>
          </div>

          <p className="mt-1.5 max-w-2xl text-sm leading-5 text-slate-300">
            {isStaffTimeline
              ? 'Internal updates visible to Admin and HR only.'
              : 'Updates, discussions, and attachments for this project.'}
          </p>
        </div>

        <button
          type="button"
          onClick={loadEntries}
          disabled={loading || submitting}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto motion-reduce:transition-none"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 7v5h-5M4 17v-5h5"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.6 9A7 7 0 0 1 17.4 6L20 12M4 12l2.6 6A7 7 0 0 0 18.4 15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Error feedback */}
      {(error || actionError) && (
        <div
          role="alert"
          className="flex min-w-0 items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-200"
        >
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-red-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01"
            />
          </svg>
          <p className="min-w-0 break-words">{actionError || error}</p>
        </div>
      )}

      {/* Timeline composer */}
      {canWrite && (
        <TimelineComposer
          onSubmit={handleCreateEntry}
          loading={submitting}
          projectId={projectId}
          timelineId={timelineId}
          timelineType={timelineType}
        />
      )}

      {/* Access notices */}
      {!canWrite && isStaffTimeline && (
        <div className="flex min-w-0 items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm leading-5 text-amber-100">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <rect x="5" y="10" width="14" height="11" rx="2" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10V7a4 4 0 1 1 8 0v3"
            />
          </svg>
          <p className="min-w-0">
            This timeline is read-only. Only Admin and HR can post updates,
            reply, or upload attachments here.
          </p>
        </div>
      )}

      {!canWrite && !isStaffTimeline && (
        <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm leading-5 text-slate-300">
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <rect x="5" y="10" width="14" height="11" rx="2" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10V7a4 4 0 1 1 8 0v3"
            />
          </svg>
          <p className="min-w-0">
            You have read-only access to this timeline.
          </p>
        </div>
      )}

      {/* Timeline entries */}
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-5 py-12 text-center sm:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h8M8 14h5m-8 6 3-3h10a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v14z"
              />
            </svg>
          </div>

          <h3 className="mt-4 text-sm font-semibold text-white">
            No updates yet
          </h3>

          <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-slate-300">
            {canWrite
              ? 'Be the first to share an update with the team.'
              : 'Timeline updates will appear here when they are posted.'}
          </p>
        </div>
      ) : (
        <div className="relative min-w-0 space-y-5">
          <div
            className="absolute bottom-5 left-5 top-5 w-px bg-slate-700"
            aria-hidden="true"
          />

          {entries.map((entry) => {
            const entryId = entry.id || entry.entry_id;

            return (
              <div key={entryId} className="relative min-w-0">
                <TimelineEntry
                  entry={entry}
                  currentUser={user}
                  canReply={canReply}
                  canDelete={canWrite}
                  readOnly={!canWrite}
                  onReply={(payload) => handleReply(entryId, payload)}
                  onDelete={() => handleDeleteEntry(entryId)}
                  onUpload={handleAttachmentsUploaded}
                  loading={submitting}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}