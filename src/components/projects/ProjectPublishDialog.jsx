import Modal from '../common/Modal';

export default function ProjectPublishDialog({
  isOpen,
  project,
  members = [],
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!project) return null;

  const projectName = project.name || project.project_name || 'Untitled Project';
  const category = project.category || project.project_category || 'Main Project';

  const getMemberName = (member) => {
    const user = member.user || member.profile || member;
    return user.fullName || user.name || 'Unknown User';
  };

  const getMemberId = (member) => {
    const user = member.user || member.profile || member;
    return user.userId || user.user_id || user.id || '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onCancel}
      title="Publish project"
      size="lg"
      closeOnBackdrop={!loading}
      showCloseButton={!loading}
    >
      <div className="min-w-0 space-y-5">
        {/* Publish information */}
        <div className="flex min-w-0 items-start gap-4 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
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
                d="M5 12.5 9.5 17 19 7"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
              />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-white">
              Ready to publish?
            </h3>
            <p className="mt-1 break-words text-sm leading-6 text-slate-300">
              Review the project details below. Publishing will make the
              project available to assigned members and notify them when they
              sign in.
            </p>
          </div>
        </div>

        {/* Project details */}
        <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">
                Project name
              </p>
              <h4 className="mt-1 break-words text-lg font-semibold text-white">
                {projectName}
              </h4>
            </div>

            <span
              className={`inline-flex max-w-full shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                category === 'Intern-Based'
                  ? 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                  : 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200'
              }`}
            >
              {category}
            </span>
          </div>

          {project.description && (
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
              {project.description}
            </p>
          )}
        </div>

        {/* Assigned members */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-white">
              Assigned members
            </h4>
            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>

          {members.length > 0 ? (
            <div className="max-h-56 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {members.map((member, index) => {
                const memberId = getMemberId(member);
                const memberName = getMemberName(member);
                const role =
                  member.role ||
                  member.user?.role ||
                  member.profile?.role ||
                  '';

                const initials = memberName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0].toUpperCase())
                  .join('');

                return (
                  <div
                    key={memberId || index}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-xs font-semibold text-indigo-200">
                      {initials || 'U'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-slate-100">
                        {memberName}
                      </p>
                      <p className="mt-0.5 break-words text-xs leading-5 text-slate-400">
                        {[memberId, role].filter(Boolean).join(' · ')}
                      </p>
                    </div>

                    <svg
                      className="h-5 w-5 shrink-0 text-emerald-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m5 12 4 4L19 6"
                      />
                    </svg>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-4 py-6 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M14 3.13a4 4 0 0 1 0 7.75M10 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-200">
                No members selected
              </p>
              <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                You can publish this project without assigned members.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-700/70 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            Go back
          </button>

          <button
            type="button"
            onClick={() => onConfirm?.(project)}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {loading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
                  />
                </svg>
                Publishing...
              </>
            ) : (
              <>
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
                    d="M5 12.5 9.5 17 19 7"
                  />
                </svg>
                Publish project
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}