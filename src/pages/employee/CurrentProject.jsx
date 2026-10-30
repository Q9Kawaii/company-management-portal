import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Timeline from '../../components/timeline/Timeline';
import TimelineVisibilityNotice from '../../components/timeline/TimelineVisibilityNotice';

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function StatusBadge({ status }) {
  const normalized = String(status || 'active').toLowerCase();

  const styles = {
    active: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
    published: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
    completed: 'border-violet-400/30 bg-violet-500/15 text-violet-200',
    draft: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    archived: 'border-slate-600 bg-slate-800 text-slate-300',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        styles[normalized] || styles.active
      }`}
    >
      {normalized.replaceAll('_', ' ')}
    </span>
  );
}

export default function CurrentProject() {
  const { user } = useAuth();
  const { error: notifyError } = useNotifications();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [teamLead, setTeamLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [activeTimeline, setActiveTimeline] = useState('main');

  const loadCurrentProject = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError('');

    try {
      const { data: memberships, error: membershipError } = await supabase
        .from('project_members')
        .select('project_id, projects(*)')
        .eq('user_id', user.id);

      if (membershipError) throw membershipError;

      const memberProjects = (memberships || [])
        .map((membership) => membership.projects)
        .filter(Boolean);

      const { data: ledProjects, error: leadError } = await supabase
        .from('projects')
        .select('*')
        .eq('lead_id', user.id);

      if (leadError) throw leadError;

      const allProjects = [
        ...memberProjects,
        ...(ledProjects || []),
      ];

      const uniqueProjects = Array.from(
        new Map(allProjects.map((item) => [item.id, item])).values()
      );

      const currentProject =
        uniqueProjects.find((item) =>
          ['published', 'active', 'in_progress'].includes(
            String(item.status || '').toLowerCase()
          )
        ) || null;

      if (!currentProject) {
        setProject(null);
        setMembers([]);
        setTeamLead(null);
        return;
      }

      setProject(currentProject);

      const { data: projectMembers, error: membersError } = await supabase
        .from('project_members')
        .select('user_id, profiles(id, user_id, name,  role, department, is_active)')
        .eq('project_id', currentProject.id);

      if (membersError) throw membersError;

      const normalizedMembers = (projectMembers || [])
        .map((item) => item.profiles)
        .filter(Boolean)
        .map((profile) => ({
          ...profile,
          name: profile.name || 'Unnamed user',
          userId: profile.user_id || '',
          isActive: profile.is_active !== false,
        }));

      setMembers(normalizedMembers);

      if (currentProject.lead_id) {
        const { data: lead, error: leadProfileError } = await supabase
          .from('profiles')
          .select('id, user_id, name,  role, department, is_active')
          .eq('id', currentProject.lead_id)
          .maybeSingle();

        if (leadProfileError) throw leadProfileError;

        setTeamLead(
          lead
            ? {
                ...lead,
                name: lead.name || 'Unnamed user',
                userId: lead.user_id || '',
                isActive: lead.is_active !== false,
              }
            : null
        );
      } else {
        setTeamLead(null);
      }
    } catch (err) {
      console.error('Failed to load current project:', err);
      setPageError(err.message || 'Unable to load your current project.');
      notifyError(err.message || 'Unable to load your current project.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, notifyError]);

  useEffect(() => {
    loadCurrentProject();
  }, [loadCurrentProject]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Loading your current project..." />
      </div>
    );
  }

  if (pageError && !project) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-400/30 bg-slate-900 p-8 text-center shadow-xl shadow-black/10">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 text-xl font-bold text-red-300">
          !
        </div>
        <h1 className="text-xl font-bold text-white">
          Unable to load project
        </h1>
        <p className="mt-2 break-words text-sm text-slate-400">{pageError}</p>
        <button
          type="button"
          onClick={loadCurrentProject}
          className="mt-5 min-h-11 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-700/80 bg-slate-900 px-6 py-14 text-center shadow-xl shadow-black/10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/10 text-3xl">
          📁
        </div>

        <h1 className="text-2xl font-bold text-white">
          No Current Project
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
          You are not currently assigned to an active project. Once HR publishes
          a project and assigns you to it, it will appear here.
        </p>

        <Link
          to="/employee/past-projects"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          View Past Projects
        </Link>
      </div>
    );
  }

  const canWriteMainTimeline = true;
  const canWriteStaffTimeline = ['admin', 'hr'].includes(
    String(user?.role || '').toLowerCase()
  );

  const projectMembers = members.filter((member) => member.id !== teamLead?.id);

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 text-slate-200">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <Link
              to="/employee"
              className="transition hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-200">Current Project</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Current Project
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Follow project updates, share progress, and collaborate with your team.
          </p>
        </div>

        <button
          type="button"
          onClick={loadCurrentProject}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:self-auto"
        >
          ↻ Refresh
        </button>
      </header>

      {pageError && (
        <div
          role="alert"
          className="break-words rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200"
        >
          {pageError}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-xl shadow-black/10">
        <div className="bg-slate-900 px-6 py-7 text-white sm:px-8 sm:py-9">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                  {project.category || 'Project'}
                </span>
                <StatusBadge status={project.status} />
              </div>

              <h2 className="break-words text-2xl font-bold sm:text-3xl">
                {project.name || 'Untitled project'}
              </h2>

              <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                {project.description || 'No project description has been provided.'}
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3 lg:min-w-56">
              <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
                <p className="text-xs text-slate-400">Team members</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {projectMembers.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
                <p className="text-xs text-slate-400">Created</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">
                  {formatDate(project.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-slate-700/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-6 py-5">
            <p className="text-xs font-medium tracking-wide text-slate-400">
              Project lead
            </p>
            <p className="mt-2 break-words font-semibold text-white">
              {teamLead?.name || 'Not assigned'}
            </p>
            <p className="mt-1 break-words text-xs text-slate-400">
              {teamLead?.userId || teamLead?.role || ''}
            </p>
          </div>

          <div className="px-6 py-5">
            <p className="text-xs font-medium tracking-wide text-slate-400">
              Your role
            </p>
            <p className="mt-2 font-semibold capitalize text-white">
              {user?.role || 'Team member'}
            </p>
            <p className="mt-1 break-words text-xs text-slate-400">
              {user?.userId || ''}
            </p>
          </div>

          <div className="px-6 py-5">
            <p className="text-xs font-medium tracking-wide text-slate-400">
              Last updated
            </p>
            <p className="mt-2 font-semibold text-white">
              {formatDate(project.updated_at || project.created_at)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Project information
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/80 bg-slate-900 p-5 shadow-xl shadow-black/10 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Project Team</h2>
            <p className="mt-1 text-sm text-slate-400">
              People assigned to work on this project.
            </p>
          </div>

          <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
            {members.length} {members.length === 1 ? 'person' : 'people'}
          </span>
        </div>

        {members.length === 0 && !teamLead ? (
          <p className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
            No team members have been assigned yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {teamLead && (
              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 font-bold text-indigo-200">
                  {teamLead.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {teamLead.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {teamLead.userId || teamLead.role || 'Team lead'}
                  </p>
                </div>

                <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-2 py-1 text-[10px] font-semibold text-indigo-200">
                  Lead
                </span>
              </div>
            )}

            {projectMembers.map((member) => (
              <div
                key={member.id}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:border-slate-600 hover:bg-slate-800"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-700 font-bold text-slate-200">
                  {member.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {member.name}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {member.userId || member.role || 'Team member'}
                  </p>
                </div>

                <span className="rounded-full border border-slate-600 bg-slate-700/70 px-2 py-1 text-[10px] font-semibold text-slate-300">
                  {member.role || 'Member'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-xl shadow-black/10">
        <div className="border-b border-slate-700/80 px-5 pt-5 sm:px-6">
          <h2 className="text-lg font-bold text-white">Project Timeline</h2>
          <p className="mt-1 text-sm text-slate-400">
            Share updates, attach screenshots, and respond to team progress.
          </p>

          <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Project timelines">
            <button
              type="button"
              role="tab"
              aria-selected={activeTimeline === 'main'}
              onClick={() => setActiveTimeline('main')}
              className={`min-h-11 rounded-t-xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                activeTimeline === 'main'
                  ? 'border-indigo-400/30 border-b-slate-900 bg-indigo-500/10 text-indigo-200'
                  : 'border-transparent bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              Team Timeline
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTimeline === 'staff'}
              onClick={() => setActiveTimeline('staff')}
              className={`min-h-11 rounded-t-xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                activeTimeline === 'staff'
                  ? 'border-indigo-400/30 border-b-slate-900 bg-indigo-500/10 text-indigo-200'
                  : 'border-transparent bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              Staff Timeline
              <span className="ml-2 rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                View only
              </span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {activeTimeline === 'main' ? (
            <>
              <TimelineVisibilityNotice
                timelineType="main"
                userRole={user?.role || 'Employee'}
                readOnly={!canWriteMainTimeline}
              />

              <div className="mt-5">
                <Timeline
                  projectId={project.id}
                  timelineId="main"
                  timelineType="main"
                  readOnly={!canWriteMainTimeline}
                />
              </div>
            </>
          ) : (
            <>
              <TimelineVisibilityNotice
                timelineType="staff"
                userRole={user?.role || 'Employee'}
                readOnly={!canWriteStaffTimeline}
              />

              <div className="mt-5">
                <Timeline
                  projectId={project.id}
                  timelineId="staff"
                  timelineType="staff"
                  readOnly={!canWriteStaffTimeline}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}