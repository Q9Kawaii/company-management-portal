export default function TimelineVisibilityNotice({
  timelineType = 'main',
  userRole = '',
  readOnly = false,
  className = '',
}) {
  const role = String(userRole || '').toLowerCase();
  const type = String(timelineType || 'main').toLowerCase();

  const isStaffTimeline =
    type === 'staff' ||
    type === 'staff_timeline' ||
    type === 'staff-timeline';

  const isAdminOrHR = role === 'admin' || role === 'hr';

  const canWrite = isStaffTimeline
    ? isAdminOrHR
    : ['admin', 'hr', 'employee', 'intern'].includes(role);

  const isReadOnly = readOnly || !canWrite;

  const notice = isStaffTimeline
    ? {
        icon: 'shield',
        title: 'Staff Timeline',
        description: isAdminOrHR
          ? 'This internal timeline is visible to project members. You can post updates, reply, and upload attachments.'
          : 'You can view internal staff updates, but only Admin and HR can post, reply, or upload attachments.',
        badge: isAdminOrHR ? 'Write access' : 'View only',
        color: 'amber',
      }
    : {
        icon: 'users',
        title: 'Project Timeline',
        description: isReadOnly
          ? 'You have read-only access to this timeline.'
          : 'Visible to the project team, Admin, and HR. Authorized team members can post updates, reply, and share attachments.',
        badge: isReadOnly ? 'View only' : 'Team access',
        color: 'indigo',
      };

  const colorClasses = {
    amber: {
      container: 'border-amber-400/30 bg-amber-500/10',
      icon: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
      title: 'text-amber-200',
      description: 'text-amber-100/80',
      badge: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    },
    indigo: {
      container: 'border-indigo-400/30 bg-indigo-500/10',
      icon: 'border-indigo-400/30 bg-indigo-500/15 text-indigo-300',
      title: 'text-white',
      description: 'text-slate-300',
      badge: 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200',
    },
  };

  const colors = colorClasses[notice.color];

  return (
    <div
      role="note"
      className={`rounded-2xl border p-4 sm:p-5 ${colors.container} ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${colors.icon}`}
        >
          {notice.icon === 'shield' ? (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m9 12 2 2 4-4"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
              />
              <circle cx="10" cy="7" r="4" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              />
            </svg>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-sm font-semibold ${colors.title}`}>
              {notice.title}
            </h3>

            <span
              className={`inline-flex min-h-6 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${colors.badge}`}
            >
              {notice.badge}
            </span>
          </div>

          <p className={`mt-1.5 break-words text-sm leading-6 ${colors.description}`}>
            {notice.description}
          </p>
        </div>
      </div>
    </div>
  );
}