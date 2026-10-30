import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Timeline from '../../components/timeline/Timeline';

const normalizeProfile = (profile) => ({
  ...profile,
  userId: profile.user_id,
  isActive: profile.is_active,
});

const normalizeProject = (project) => ({
  ...project,
  leadId: project.lead_id,
  createdAt: project.created_at,
});

export default function CurrentProject() {
  const { user } = useAuth();
  const notifications = useNotifications();

  const [project, setProject] = useState(null);
  const [lead, setLead] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTimeline, setActiveTimeline] = useState('main');
  const [refreshing, setRefreshing] = useState(false);

  const loadCurrentProject = useCallback(async (showLoader = true) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);
    else setRefreshing(true);

    try {
      const { data: memberships, error: membershipError } = await supabase
        .from('project_members')
        .select('project_id, user_id, profile_id, role')
        .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`);

      if (membershipError) throw membershipError;

      const memberProjectIds = (memberships || []).map(
        (membership) => membership.project_id
      );

      const { data: ledProjects, error: leadError } = await supabase
        .from('projects')
        .select('*')
        .eq('lead_id', user.id)
        .in('status', ['published', 'active', 'in_progress']);

      if (leadError) throw leadError;

      let memberProjects = [];

      if (memberProjectIds.length > 0) {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .in('id', memberProjectIds)
          .in('status', ['published', 'active', 'in_progress']);

        if (error) throw error;
        memberProjects = data || [];
      }

      const uniqueProjects = new Map();

      [...(ledProjects || []), ...memberProjects].forEach((item) => {
        uniqueProjects.set(item.id, item);
      });

      const currentProjects = Array.from(uniqueProjects.values()).sort(
        (a, b) =>
          new Date(b.published_at || b.created_at || 0) -
          new Date(a.published_at || a.created_at || 0)
      );

      if (currentProjects.length === 0) {
        setProject(null);
        setLead(null);
        setMembers([]);
        return;
      }

      const selectedProject = currentProjects[0];

      const { data: projectMemberships, error: projectMembershipError } =
        await supabase
          .from('project_members')
          .select('project_id, user_id, profile_id, role')
          .eq('project_id', selectedProject.id);

      if (projectMembershipError) throw projectMembershipError;

      const memberIds = new Set(
        (projectMemberships || [])
          .flatMap((membership) => [
            membership.user_id,
            membership.profile_id,
          ])
          .filter(Boolean)
      );

      if (selectedProject.lead_id) {
        memberIds.add(selectedProject.lead_id);
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(
          'id, user_id, name, email, role, department, is_active'
        );

      if (profilesError) throw profilesError;

      const normalizedProfiles = (profiles || []).map(normalizeProfile);

      const projectMembers = normalizedProfiles.filter(
        (profile) =>
          memberIds.has(profile.id) || memberIds.has(profile.user_id)
      );

      const projectLead =
        normalizedProfiles.find(
          (profile) =>
            profile.id === selectedProject.lead_id ||
            profile.user_id === selectedProject.lead_id
        ) || null;

      setProject(normalizeProject(selectedProject));
      setLead(projectLead);
      setMembers(projectMembers);
    } catch (error) {
      console.error('Failed to load current project:', error);
      notifications.error(
        error.message || 'Unable to load your current project.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCurrentProject();
  }, [loadCurrentProject]);

  if (loading) {
    return (
      <LoadingSpinner
        fullScreen
        label="Loading your current project..."
      />
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <Link
              to="/intern"
              className="transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200">Current Project</span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-10 text-center shadow-xl shadow-black/10 sm:px-8 sm:py-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
              <svg
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 9h8M8 13h5"
                />
              </svg>
            </div>

            <h1 className="mt-5 text-xl font-bold tracking-tight text-white sm:text-2xl">
              No Current Project
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              You are not currently assigned to a published project. Once HR
              assigns you to a project and publishes it, it will appear here.
            </p>

            <Link
              to="/intern/past-projects"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              View Past Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isStaff = ['Admin', 'HR'].includes(user?.role);
  const isLead =
    lead?.id === user?.id ||
    lead?.user_id === user?.id ||
    project.lead_id === user?.id;

  const isMember = members.some(
    (member) =>
      member.id === user?.id || member.user_id === user?.id
  );

  const canAccessProject = isLead || isMember;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <Link
            to="/intern"
            className="transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200">Current Project</span>
        </div>

        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold capitalize text-emerald-200">
                {project.status?.replaceAll('_', ' ') || 'Published'}
              </span>

              {project.category && (
                <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-200">
                  {project.category}
                </span>
              )}
            </div>

            <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              {project.name}
            </h1>

            <p className="mt-3 max-w-3xl whitespace-pre-line break-words text-sm leading-6 text-slate-300">
              {project.description || 'No project description provided.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadCurrentProject(false)}
            disabled={refreshing}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`}
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
                d="M5.6 9A7 7 0 0 1 17.5 6L20 12M4 12l2.5 6A7 7 0 0 0 18.4 15"
              />
            </svg>
            Refresh
          </button>
        </header>

        <section className="mb-8 grid min-w-0 gap-4 lg:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Team Lead
            </p>

            {lead ? (
              <div className="mt-4 flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/15 font-semibold text-indigo-200">
                  {(lead.name || lead.userId || '?')
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">
                    {lead.name || 'Unnamed user'}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                    {lead.role} · {lead.userId || 'No user ID'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                No team lead assigned.
              </p>
            )}
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Team Members
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-white">
              {members.length}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Assigned employees and interns
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Project Category
            </p>
            <p className="mt-3 break-words text-lg font-semibold text-white">
              {project.category || 'Not specified'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Project workspace and timelines
            </p>
          </div>
        </section>

        <section className="mb-8 min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10">
          <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Project Team
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              People assigned to this project.
            </p>
          </div>

          {members.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">
              No team members were found.
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              {members.map((member) => {
                const isCurrentUser =
                  member.id === user?.id ||
                  member.user_id === user?.id;

                return (
                  <div
                    key={member.id}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-slate-700 hover:bg-slate-950"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-200">
                      {(member.name || member.userId || '?')
                        .split(' ')
                        .map((part) => part[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {member.name || 'Unnamed user'}
                        {isCurrentUser && (
                          <span className="ml-2 inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-200">
                            You
                          </span>
                        )}
                      </p>
                      <p className="mt-1 break-words text-xs leading-5 text-slate-400">
                        {member.role} · {member.userId || 'No user ID'}
                      </p>
                    </div>

                    {(lead?.id === member.id ||
                      lead?.user_id === member.user_id) && (
                      <span className="shrink-0 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-200">
                        Lead
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10">
          <div className="border-b border-slate-800 p-4 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Project Timelines
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Follow project updates, reply to team posts and share progress
              with your team.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTimeline('main')}
                className={`min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  activeTimeline === 'main'
                    ? 'border border-indigo-400/30 bg-indigo-500/15 text-indigo-200'
                    : 'border border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white'
                }`}
              >
                Team Timeline
              </button>

              <button
                type="button"
                onClick={() => setActiveTimeline('staff')}
                className={`min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  activeTimeline === 'staff'
                    ? 'border border-indigo-400/30 bg-indigo-500/15 text-indigo-200'
                    : 'border border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white'
                }`}
              >
                Staff Timeline
                <span className="ml-2 text-xs font-medium text-slate-400">
                  Read only
                </span>
              </button>
            </div>
          </div>

          {!canAccessProject && !isStaff ? (
            <div className="m-4 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-200 sm:m-6">
              You are not assigned to this project and cannot access its
              timelines.
            </div>
          ) : (
            <div className="min-w-0 p-4 sm:p-6">
              <Timeline
                key={`${project.id}-${activeTimeline}`}
                projectId={project.id}
                timelineId={activeTimeline}
                timelineType={activeTimeline}
                readOnly={activeTimeline === 'staff' && !isStaff}
              />
            </div>
          )}
        </section>

        <div className="mt-8">
          <Link
            to="/intern/past-projects"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-slate-300 transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span aria-hidden="true">←</span>
            View Past Projects
          </Link>
        </div>
      </div>
    </div>
  );
}