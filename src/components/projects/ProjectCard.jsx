import { Link } from 'react-router-dom';

const statusStyles = {
  draft: 'border-slate-600 bg-slate-800 text-slate-200',
  published: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
  active: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
  completed: 'border-violet-400/30 bg-violet-500/15 text-violet-200',
  archived: 'border-slate-600 bg-slate-800 text-slate-300',
  cancelled: 'border-red-400/30 bg-red-500/15 text-red-200',
};

const categoryStyles = {
  'Intern-Based': 'border-amber-400/30 bg-amber-500/15 text-amber-200',
  'Main Project': 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200',
};

function formatDate(date) {
  if (!date) return 'Not set';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return 'Not set';

  return parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStatus(project) {
  return String(project.status || 'published').toLowerCase();
}

export default function ProjectCard({
  project,
  to,
  onClick,
  showActions = false,
  onEdit,
  onView,
  onArchive,
  className = '',
}) {
  if (!project) return null;

  const projectId = project.id || project.project_id;
  const projectName = project.name || project.project_name || 'Untitled Project';
  const category = project.category || project.project_category || 'Main Project';
  const status = getStatus(project);

  const members = project.members || project.project_members || [];
  const memberCount =
    project.memberCount ??
    project.member_count ??
    members.length;

  const lead =
    project.lead ||
    project.teamLead ||
    project.team_lead ||
    project.project_lead;

  const leadName =
    typeof lead === 'string'
      ? lead
      : lead?.fullName ||  lead?.name || lead?.user_id;

  const normalizedStatus = status.replace(/_/g, ' ');
  const statusClass =
    statusStyles[status] || 'border-slate-600 bg-slate-800 text-slate-200';

  const categoryClass =
    categoryStyles[category] || 'border-slate-600 bg-slate-800 text-slate-200';

  const destination = to || (projectId ? `/projects/${projectId}` : undefined);

  const content = (
    <div
      className={`flex h-full break-inside-avoid flex-col rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-lg shadow-black/20 transition-colors hover:border-indigo-400/60 hover:bg-slate-800/70 sm:p-5 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-300">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 10h18M8 4v6"
            />
          </svg>
        </div>

        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}`}
        >
          {normalizedStatus}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="line-clamp-2 break-words text-base font-semibold text-white">
          {projectName}
        </h3>

        <span
          className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${categoryClass}`}
        >
          {category}
        </span>

        <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-slate-300">
          {project.description || 'No project description available.'}
        </p>
      </div>

      <div className="mt-5 space-y-3 border-t border-slate-700/70 pt-4">
        {leadName && (
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <svg
              className="h-4 w-4 shrink-0 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 21v-2a8 8 0 0 1 16 0v2"
              />
            </svg>
            <span className="truncate">
              <span className="text-slate-400">Lead: </span>
              {leadName}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-200">
            <svg
              className="h-4 w-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
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
            <span>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 2v4M8 2v4M3 10h18"
              />
            </svg>
            {formatDate(project.created_at || project.createdAt)}
          </div>
        </div>
      </div>

      {showActions && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-700/70 pt-4">
          {onView && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onView(project);
              }}
              className="min-h-10 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              View
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEdit(project);
              }}
              className="min-h-10 rounded-lg border border-indigo-400/40 px-3 py-2 text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Edit
            </button>
          )}

          {onArchive && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onArchive(project);
              }}
              className="ml-auto min-h-10 rounded-lg border border-red-400/40 px-3 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            >
              Archive
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (destination && !onClick) {
    return (
      <Link
        to={destination}
        className="block h-full break-inside-avoid rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40"
        aria-label={`View project ${projectName}`}
      >
        {content}
      </Link>
    );
  }

  return content;
}