const getUserId = (user) =>
  user?.userId || user?.user_id || user?.id || '';

const getUserName = (user) =>
  user?.name ||
  'Unknown User';

const formatDate = (date) => {
  if (!date) return 'Not specified';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return 'Not specified';

  return parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

function DetailRow({ label, children }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-1 border-b border-slate-700/70 py-3 last:border-b-0 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-slate-200 sm:col-span-2">
        {children}
      </dd>
    </div>
  );
}

function MemberList({ title, members = [] }) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200">
          {members.length}
        </span>
      </div>

      {members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 px-4 py-5 text-center text-sm text-slate-400">
          No members selected.
        </p>
      ) : (
        <div className="space-y-2">
          {members.map((member, index) => {
            const user = member.user || member.profile || member;
            const id = getUserId(user);
            const name = getUserName(user);
            const role = user.role || member.role || '';

            const initials = name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0].toUpperCase())
              .join('');

            return (
              <div
                key={id || index}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/60 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-sm font-semibold text-indigo-200">
                  {initials || 'U'}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-slate-100">
                    {name}
                  </p>
                  <p className="break-words text-xs leading-5 text-slate-400">
                    {[id, role].filter(Boolean).join(' · ')}
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
      )}
    </div>
  );
}

export default function ProjectReview({
  project = {},
  employees = [],
  interns = [],
  members = [],
  lead = null,
  onBack,
  onPublish,
  loading = false,
  className = '',
}) {
  const projectName =
    project.name || project.project_name || 'Untitled Project';

  const category =
    project.category || project.project_category || 'Not specified';

  const description = project.description || 'No description provided.';

  const selectedMembers =
    members.length > 0
      ? members
      : [
          ...employees.filter((user) =>
            (project.memberIds || project.member_ids || []).includes(
              getUserId(user)
            )
          ),
          ...interns.filter((user) =>
            (project.memberIds || project.member_ids || []).includes(
              getUserId(user)
            )
          ),
        ];

  const projectLead =
    lead ||
    employees.find(
      (user) =>
        getUserId(user) ===
        (project.leadId || project.lead_id || project.team_lead_id)
    ) ||
    interns.find(
      (user) =>
        getUserId(user) ===
        (project.leadId || project.lead_id || project.team_lead_id)
    );

  const leadName = projectLead
    ? getUserName(projectLead)
    : typeof project.teamLead === 'string'
      ? project.teamLead
      : 'Not assigned';

  const handlePublish = () => {
    if (!loading) {
      onPublish?.({
        ...project,
        name: projectName,
        category,
        description,
        leadId:
          project.leadId ||
          project.lead_id ||
          getUserId(projectLead),
        memberIds: selectedMembers.map((member) =>
          getUserId(member.user || member.profile || member)
        ),
      });
    }
  };

  return (
    <section className={`w-full min-w-0 space-y-6 ${className}`}>
      {/* Step heading */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m5 12 4 4L19 6"
              />
            </svg>
          </span>
          Final step
        </div>

        <h2 className="mt-3 break-words text-xl font-bold text-white sm:text-2xl">
          Review your project
        </h2>
        <p className="mt-1 break-words text-sm leading-6 text-slate-300">
          Verify the project details and assigned members before publishing.
        </p>
      </div>

      {/* Project details */}
      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700/70 bg-slate-800/70 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-400">
                Project details
              </p>
              <h3 className="mt-1 break-words text-lg font-bold text-white">
                {projectName}
              </h3>
            </div>

            <span
              className={`inline-flex max-w-full shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                category === 'Intern-Based'
                  ? 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                  : category === 'Main Project'
                    ? 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200'
                    : 'border-slate-600 bg-slate-800 text-slate-200'
              }`}
            >
              {category}
            </span>
          </div>
        </div>

        <dl className="px-4 py-2 sm:px-6">
          <DetailRow label="Project name">{projectName}</DetailRow>

          <DetailRow label="Category">{category}</DetailRow>

          <DetailRow label="Description">
            <p className="whitespace-pre-wrap break-words leading-6">
              {description}
            </p>
          </DetailRow>

          <DetailRow label="Project lead">
            {projectLead ? (
              <div>
                <p className="break-words font-medium text-slate-100">
                  {leadName}
                </p>
                <p className="mt-0.5 break-words text-xs leading-5 text-slate-400">
                  {getUserId(projectLead)}
                  {projectLead.role ? ` · ${projectLead.role}` : ''}
                </p>
              </div>
            ) : (
              leadName
            )}
          </DetailRow>

          <DetailRow label="Created">
            {formatDate(project.created_at || project.createdAt)}
          </DetailRow>
        </dl>
      </div>

      {/* Team and publishing checklist */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
          <MemberList title="Assigned team members" members={selectedMembers} />
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-5">
          <h4 className="text-sm font-semibold text-white">
            Before you publish
          </h4>

          <ul className="mt-4 space-y-3">
            {[
              'Project details have been reviewed.',
              'The project lead has been selected.',
              'Team members have been assigned.',
              'Assigned users will be notified when they sign in.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m5 12 4 4L19 6"
                    />
                  </svg>
                </span>
                <span className="break-words text-sm leading-5 text-slate-300">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-700/70 pt-5 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
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
              d="M19 12H5m7 7-7-7 7-7"
            />
          </svg>
          Back to editing
        </button>

        <button
          type="button"
          onClick={handlePublish}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
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
              Publish project
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
            </>
          )}
        </button>
      </div>
    </section>
  );
}