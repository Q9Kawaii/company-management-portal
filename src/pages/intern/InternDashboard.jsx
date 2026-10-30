import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProjectCard from '../../components/projects/ProjectCard';

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

export default function InternDashboard() {
  const { user } = useAuth();
  const notifications = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [pastProjects, setPastProjects] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [projectLead, setProjectLead] = useState(null);

  const loadDashboard = useCallback(
    async (showLoader = true) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      if (showLoader) setLoading(true);
      else setRefreshing(true);

      try {
        const { data: memberships, error: membershipError } = await supabase
          .from('project_members')
          .select('project_id, user_id, role')
          .eq('user_id', user.id);

        if (membershipError) throw membershipError;

        const memberProjectIds = [
          ...new Set(
            (memberships || [])
              .map((membership) => membership.project_id)
              .filter(Boolean)
          ),
        ];

        const { data: ledProjects, error: leadError } = await supabase
          .from('projects')
          .select('*')
          .eq('lead_id', user.id);

        if (leadError) throw leadError;

        let memberProjects = [];

        if (memberProjectIds.length > 0) {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .in('id', memberProjectIds);

          if (error) throw error;
          memberProjects = data || [];
        }

        const projectMap = new Map();

        [...(ledProjects || []), ...memberProjects].forEach((project) => {
          projectMap.set(project.id, normalizeProject(project));
        });

        const allProjects = Array.from(projectMap.values()).sort(
          (a, b) =>
            new Date(b.published_at || b.created_at || 0) -
            new Date(a.published_at || a.created_at || 0)
        );

        const visibleProjects = allProjects.filter((project) =>
          ['published', 'active', 'in_progress', 'in progress', 'completed', 'archived'].includes(
            String(project.status || '').toLowerCase()
          )
        );

        const activeProjects = visibleProjects.filter((project) =>
          ['published', 'active', 'in_progress', 'in progress'].includes(
            String(project.status || '').toLowerCase()
          )
        );

        const previousProjects = visibleProjects.filter((project) =>
          ['completed', 'archived'].includes(
            String(project.status || '').toLowerCase()
          )
        );

        const selectedCurrentProject = activeProjects[0] || null;

        setProjects(visibleProjects);
        setCurrentProject(selectedCurrentProject);
        setPastProjects(previousProjects);

        if (selectedCurrentProject) {
          const { data: projectMemberships, error: projectMembershipError } =
            await supabase
              .from('project_members')
              .select('project_id, user_id, role')
              .eq('project_id', selectedCurrentProject.id);

          if (projectMembershipError) throw projectMembershipError;

          const memberIds = new Set(
            (projectMemberships || [])
              .flatMap((membership) => [
                membership.user_id,              ])
              .filter(Boolean)
          );

          if (selectedCurrentProject.lead_id) {
            memberIds.add(selectedCurrentProject.lead_id);
          }

          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select(
              'id, user_id, name, email, role, department, is_active'
            )
          .in('id', [...memberIds]);

          if (profilesError) throw profilesError;

          const normalizedProfiles = (profiles || []).map(normalizeProfile);

          setTeamMembers(
            normalizedProfiles.filter(
              (profile) =>
                memberIds.has(profile.id) ||
                memberIds.has(profile.user_id)
            )
          );

          setProjectLead(
            normalizedProfiles.find(
              (profile) =>
                profile.id === selectedCurrentProject.lead_id ||
                profile.user_id === selectedCurrentProject.lead_id
            ) || null
          );
        } else {
          setTeamMembers([]);
          setProjectLead(null);
        }

        const { data: notificationData, error: notificationError } =
          await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (notificationError) {
          console.warn('Could not load notifications:', notificationError);
          setRecentNotifications([]);
        } else {
          setRecentNotifications(notificationData || []);
        }
      } catch (error) {
        console.error('Failed to load intern dashboard:', error);
        notifications.error(
          error.message || 'Unable to load your dashboard.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <LoadingSpinner
        fullScreen
        label="Loading your dashboard..."
      />
    );
  }

  const firstName = user?.name?.trim()?.split(/\s+/)[0] || 'Intern';

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-indigo-300">
              Intern Workspace
            </p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Here is your project progress and latest activity.
            </p>
            {user?.userId && (
              <p className="mt-2 break-words text-xs text-slate-400">
                User ID:{' '}
                <span className="font-medium text-slate-200">
                  {user.userId}
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => loadDashboard(false)}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
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
            Refresh Dashboard
          </button>
        </header>

        <section className="mb-8 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Current Projects"
            value={currentProject ? 1 : 0}
            description="Your active assignment"
            icon="◈"
            tone="indigo"
          />
          <StatCard
            label="Past Projects"
            value={pastProjects.length}
            description="Completed or archived"
            icon="✓"
            tone="emerald"
          />
          <StatCard
            label="Team Members"
            value={teamMembers.length}
            description="People in your current project"
            icon="◎"
            tone="blue"
          />
          <StatCard
            label="Notifications"
            value={recentNotifications.filter(
              (item) => !item.is_read
            ).length}
            description="Unread recent notifications"
            icon="♢"
            tone="purple"
          />
        </section>

        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Current Project
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Your currently published assignment.
              </p>
            </div>

            <Link
              to="/intern/current-project"
              className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Open Project →
            </Link>
          </div>

          {currentProject ? (
            <ProjectCard
              project={currentProject}
              lead={projectLead}
              memberCount={teamMembers.length}
              onClick={() => {
                window.location.href = '/intern/current-project';
              }}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-10 text-center sm:px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-2xl text-indigo-300">
                ◈
              </div>
              <h3 className="mt-4 font-semibold text-white">
                No active project assigned
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                When HR assigns you to a project and publishes it, the project
                will appear here.
              </p>
              <Link
                to="/intern/past-projects"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                View Past Projects
              </Link>
            </div>
          )}
        </section>

        <div className="grid min-w-0 gap-8 lg:grid-cols-3">
          <section className="min-w-0 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Recent Notifications
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Important updates about your work.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/10">
              {recentNotifications.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm font-medium text-slate-200">
                    You are all caught up.
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    New project updates and announcements will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex gap-3 px-4 py-4 transition-colors hover:bg-slate-800/40 sm:px-5"
                    >
                      <div
                        className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                          notification.is_read
                            ? 'border-slate-700 bg-slate-800 text-slate-300'
                            : 'border-indigo-400/20 bg-indigo-500/15 text-indigo-200'
                        }`}
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
                            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                          />
                        </svg>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="break-words text-sm font-semibold text-white">
                            {notification.title || 'Notification'}
                          </p>
                          {!notification.is_read && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400 ring-4 ring-indigo-500/10" />
                          )}
                        </div>

                        <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-slate-300">
                          {notification.message || ''}
                        </p>

                        <p className="mt-2 text-xs text-slate-400">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10">
              <h2 className="font-semibold text-white">Quick Actions</h2>
              <p className="mt-1 text-sm text-slate-400">
                Jump to the areas you use most.
              </p>

              <div className="mt-5 space-y-2">
                <QuickAction
                  to="/intern/current-project"
                  title="Current Project"
                  description="View your team and timelines"
                  icon="◈"
                />
                <QuickAction
                  to="/intern/past-projects"
                  title="Past Projects"
                  description="Review completed assignments"
                  icon="↗"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-white">Your Team</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Current project members
                  </p>
                </div>
                <span className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200">
                  {teamMembers.length}
                </span>
              </div>

              {teamMembers.length === 0 ? (
                <p className="mt-5 text-sm leading-6 text-slate-400">
                  Your team will appear here once you have an active project.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {teamMembers.slice(0, 5).map((member) => (
                    <div
                      key={member.id}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200">
                        {(member.name || member.userId || '?')
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {member.name || 'Unnamed user'}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {member.role}
                        </p>
                      </div>

                      {(projectLead?.id === member.id ||
                        projectLead?.user_id === member.user_id) && (
                        <span className="shrink-0 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-200">
                          Lead
                        </span>
                      )}
                    </div>
                  ))}

                  {teamMembers.length > 5 && (
                    <Link
                      to="/intern/current-project"
                      className="inline-flex min-h-11 items-center pt-1 text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      View all {teamMembers.length} members →
                    </Link>
                  )}
                </div>
              )}
            </section>
          </aside>
        </div>

        {projects.length > 0 && (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/10 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">
                  Project Overview
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  A summary of your published and previous assignments.
                </p>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-300">
                {projects.length} project{projects.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <OverviewItem
                label="Published / Active"
                value={
                  projects.filter((project) =>
                    ['published', 'active', 'in_progress', 'in progress'].includes(
                      String(project.status || '').toLowerCase()
                    )
                  ).length
                }
              />
              <OverviewItem
                label="Completed"
                value={
                  projects.filter(
                    (project) =>
                      String(project.status || '').toLowerCase() ===
                      'completed'
                  ).length
                }
              />
              <OverviewItem
                label="Archived"
                value={
                  projects.filter(
                    (project) =>
                      String(project.status || '').toLowerCase() ===
                      'archived'
                  ).length
                }
              />
            </div>
          </section>
        )}

        <footer className="mt-8 border-t border-slate-800 py-5 text-center text-xs text-slate-400">
          Company Management Portal · Intern Workspace
        </footer>
      </div>
    </div>
  );
}

function StatCard({ label, value, description, icon, tone = 'indigo' }) {
  const tones = {
    indigo: 'border-indigo-400/25 bg-indigo-500/10 text-indigo-200',
    emerald: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
    blue: 'border-sky-400/25 bg-sky-500/10 text-sky-200',
    purple: 'border-violet-400/25 bg-violet-500/10 text-violet-200',
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-lg shadow-black/10 transition-colors hover:border-slate-700 ${
        tones[tone] || tones.indigo
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-300">{label}</p>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-slate-950/40 text-lg">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}

function QuickAction({ to, title, description, icon }) {
  return (
    <Link
      to={to}
      className="group flex min-h-16 items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 transition-colors hover:border-indigo-400/30 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-lg text-indigo-200 transition-colors group-hover:bg-indigo-500/20">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-200 transition-colors group-hover:text-white">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">
          {description}
        </span>
      </span>
      <span className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-300">
        →
      </span>
    </Link>
  );
}

function OverviewItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-colors hover:border-slate-700">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

function formatDate(value) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}