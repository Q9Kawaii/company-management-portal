import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';

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

function getInitials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || '?'
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || 'active').toLowerCase();

  const styles = {
    draft: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
    published: 'bg-sky-500/15 text-sky-200 ring-sky-400/30',
    active: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
    in_progress: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
    completed: 'bg-violet-500/15 text-violet-200 ring-violet-400/30',
    archived: 'bg-slate-700 text-slate-300 ring-slate-600',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
        styles[normalized] || styles.active
      }`}
    >
      {normalized.replaceAll('_', ' ')}
    </span>
  );
}

function StatCard({ label, value, description, icon }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xl text-indigo-200 ring-1 ring-inset ring-indigo-400/20">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const loadDashboard = useCallback(async () => {
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

      const { data: leadProjects, error: leadError } = await supabase
        .from('projects')
        .select('*')
        .eq('lead_id', user.id);

      if (leadError) throw leadError;

      const allProjects = [...memberProjects, ...(leadProjects || [])];

      const uniqueProjects = Array.from(
        new Map(allProjects.map((project) => [project.id, project])).values()
      ).sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
      );

      setProjects(uniqueProjects);

      const { data: notifications, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (notificationError) {
        console.error('Unable to load notifications:', notificationError);
        setRecentNotifications([]);
      } else {
        setRecentNotifications(notifications || []);
      }
    } catch (err) {
      console.error('Failed to load employee dashboard:', err);
      setPageError(err.message || 'Unable to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Loading your dashboard..." />
      </div>
    );
  }

  const currentProjects = projects.filter((project) =>
    ['published', 'active', 'in_progress'].includes(
      String(project.status || '').toLowerCase()
    )
  );

  const pastProjects = projects.filter((project) =>
    ['completed', 'archived'].includes(
      String(project.status || '').toLowerCase()
    )
  );

  const draftProjects = projects.filter(
    (project) => String(project.status || '').toLowerCase() === 'draft'
  );

  const unreadNotifications = recentNotifications.filter(
    (notification) => !notification.is_read
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-sm font-medium text-indigo-300">
            Employee Workspace
          </p>

          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Welcome back, {user?.name?.split(' ')[0] || 'there'}!
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Here is an overview of your projects and recent activity.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-base font-semibold text-slate-200 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:text-sm"
        >
          ↻ Refresh
        </button>
      </header>

      {pageError && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"
        >
          <p className="font-semibold">Dashboard could not be fully loaded</p>
          <p className="mt-1 break-words">{pageError}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="mt-3 min-h-11 font-semibold text-red-300 underline underline-offset-4 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Try again
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 px-6 py-7 text-white shadow-sm sm:px-8 sm:py-9">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-lg font-bold text-indigo-200 ring-1 ring-indigo-400/30">
              {getInitials(user?.name || '')}
            </div>

            <div className="min-w-0">
              <p className="text-sm text-slate-400">Signed in as</p>
              <h2 className="mt-1 break-words text-xl font-bold">
                {user?.name || 'Employee'}
              </h2>
              <p className="mt-1 break-words text-sm text-slate-400">
                {user?.userId || ''} {user?.department ? `· ${user.department}` : ''}
              </p>
            </div>
          </div>

          <Link
            to="/employee/current-project"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-base font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 sm:text-sm"
          >
            View Current Project
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current Projects"
          value={currentProjects.length}
          description="Published or active projects"
          icon="🚀"
        />

        <StatCard
          label="Past Projects"
          value={pastProjects.length}
          description="Completed or archived"
          icon="📁"
        />

        <StatCard
          label="All Assignments"
          value={projects.length}
          description="Projects linked to your account"
          icon="📋"
        />

        <StatCard
          label="Unread Notifications"
          value={unreadNotifications}
          description="Among your five latest notifications"
          icon="🔔"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Current Projects
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Projects currently available to you.
                </p>
              </div>

              <Link
                to="/employee/current-project"
                className="inline-flex min-h-11 items-center text-base font-semibold text-indigo-300 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:text-sm"
              >
                View details →
              </Link>
            </div>

            {currentProjects.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-xl">
                  📂
                </div>
                <h3 className="text-sm font-semibold text-white">
                  No active projects yet
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-400">
                  When HR publishes a project and assigns you to it, it will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {currentProjects.slice(0, 4).map((project) => (
                  <Link
                    key={project.id}
                    to="/employee/current-project"
                    className="flex min-w-0 items-start gap-4 px-5 py-5 transition hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 sm:px-6"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xl text-indigo-200">
                      📁
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words text-sm font-semibold text-white">
                          {project.name || 'Untitled project'}
                        </h3>
                        <StatusBadge status={project.status} />
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        {project.category || 'Project'}
                        {' · '}
                        Updated {formatDate(project.updated_at || project.created_at)}
                      </p>

                      <p className="mt-2 line-clamp-2 break-words text-sm leading-5 text-slate-300">
                        {project.description || 'No description available.'}
                      </p>
                    </div>

                    <span className="mt-1 shrink-0 text-slate-400" aria-hidden="true">
                      →
                    </span>
                  </Link>
                ))}

                {currentProjects.length > 4 && (
                  <div className="px-6 py-3 text-center text-xs text-slate-400">
                    Showing 4 of {currentProjects.length} current projects.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Past Projects
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Your completed and archived project history.
                </p>
              </div>

              <Link
                to="/employee/past-projects"
                className="inline-flex min-h-11 items-center text-base font-semibold text-indigo-300 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:text-sm"
              >
                View all →
              </Link>
            </div>

            {pastProjects.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-400">
                  Your completed projects will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {pastProjects.slice(0, 3).map((project) => (
                  <div
                    key={project.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-lg text-emerald-300">
                        ✓
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-white">
                          {project.name || 'Untitled project'}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          {project.category || 'Project'}
                        </p>
                      </div>
                    </div>

                    <StatusBadge status={project.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="min-w-0 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 shadow-sm">
            <div className="border-b border-slate-800 px-5 py-5">
              <h2 className="text-lg font-bold text-white">Quick Links</h2>
              <p className="mt-1 text-sm text-slate-400">
                Jump to a section of your workspace.
              </p>
            </div>

            <div className="space-y-2 p-4">
              <Link
                to="/employee/current-project"
                className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-700/70 p-3 transition hover:border-indigo-400/40 hover:bg-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-lg text-indigo-200">
                  🚀
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold text-white">
                    Current Project
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Updates and team timeline
                  </span>
                </span>
                <span className="shrink-0 text-slate-400">→</span>
              </Link>

              <Link
                to="/employee/past-projects"
                className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-700/70 p-3 transition hover:border-indigo-400/40 hover:bg-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-lg">
                  📚
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-semibold text-white">
                    Past Projects
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Browse your project history
                  </span>
                </span>
                <span className="shrink-0 text-slate-400">→</span>
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 shadow-sm">
            <div className="border-b border-slate-800 px-5 py-5">
              <h2 className="text-lg font-bold text-white">
                Recent Notifications
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Your latest account updates.
              </p>
            </div>

            {recentNotifications.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-lg">
                  🔔
                </div>
                <p className="text-sm text-slate-400">
                  You are all caught up. No recent notifications.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {recentNotifications.map((notification) => (
                  <div key={notification.id} className="flex gap-3 px-5 py-4">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        notification.is_read ? 'bg-slate-600' : 'bg-indigo-400'
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-white">
                        {notification.title || 'Notification'}
                      </p>
                      <p className="mt-1 break-words text-xs leading-5 text-slate-300">
                        {notification.message || notification.body || ''}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {draftProjects.length > 0 && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
              <div className="flex items-start gap-3">
                <span className="text-xl text-amber-200">ℹ️</span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-amber-200">
                    Pending projects
                  </h3>
                  <p className="mt-1 break-words text-sm leading-5 text-amber-100/90">
                    {draftProjects.length} draft{' '}
                    {draftProjects.length === 1 ? 'project is' : 'projects are'}{' '}
                    associated with your account. Draft projects may not be
                    available until published.
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}