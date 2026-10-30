import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STAT_CARDS = [
  {
    label: 'Total HR',
    key: 'hr',
    description: 'Human resources accounts',
    href: '/admin/hr',
    icon: '👥',
  },
  {
    label: 'Employees',
    key: 'employees',
    description: 'Registered employee accounts',
    href: '/admin/employees',
    icon: '💼',
  },
  {
    label: 'Interns',
    key: 'interns',
    description: 'Registered intern accounts',
    href: '/admin/interns',
    icon: '🎓',
  },
  {
    label: 'Projects',
    key: 'projects',
    description: 'All company projects',
    href: '/admin/projects',
    icon: '📁',
  },
];

const ROLE_LABELS = {
  Admin: 'Administrator',
  HR: 'Human Resources',
  Employee: 'Employee',
  Intern: 'Intern',
};

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getDisplayName(user) {
  return user?.name || user?.user_id || 'Unknown user';
}

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        active
          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
          : 'border-slate-600 bg-slate-800 text-slate-300'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? 'bg-emerald-400' : 'bg-slate-400'
        }`}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function DashboardSection({ title, action, children }) {
  return (
    <section className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 px-5 py-4 sm:px-6">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-xl">
        📭
      </div>
      <p className="text-sm text-slate-300">{message}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    hr: 0,
    employees: 0,
    interns: 0,
    projects: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    activeProjects: 0,
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const [profilesResult, projectsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, user_id, name, email, role, department, is_active, created_at')
            .order('created_at', { ascending: false }),

          supabase
            .from('projects')
            .select('id, name, category, status, created_at')
            .order('created_at', { ascending: false }),
        ]);

        if (profilesResult.error) throw profilesResult.error;
        if (projectsResult.error) throw projectsResult.error;

        const profiles = profilesResult.data || [];
        const projects = projectsResult.data || [];

        const isActiveUser = (profile) =>
          profile.is_active !== false && profile.is_active !== 0;

        const activeUsers = profiles.filter(isActiveUser).length;

        const nextStats = {
          hr: profiles.filter((profile) => profile.role === 'HR').length,
          employees: profiles.filter((profile) => profile.role === 'Employee').length,
          interns: profiles.filter((profile) => profile.role === 'Intern').length,
          projects: projects.length,
          activeUsers,
          inactiveUsers: profiles.length - activeUsers,
          activeProjects: projects.filter((project) =>
            ['published', 'active', 'in_progress', 'in progress'].includes(
              String(project.status || '').toLowerCase()
            )
          ).length,
        };

        if (!isMounted) return;

        setStats(nextStats);
        setRecentUsers(profiles.slice(0, 6));
        setRecentProjects(projects.slice(0, 5));
      } catch (err) {
        if (!isMounted) return;

        console.error('Failed to load admin dashboard:', err);
        setError(err.message || 'Unable to load dashboard data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const statCards = useMemo(
    () =>
      STAT_CARDS.map((card) => ({
        ...card,
        value: stats[card.key],
      })),
    [stats]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Loading admin dashboard..." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-8">
      <header className="relative overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900 px-6 py-8 text-white shadow-lg sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/3 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex min-w-0 flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Administrator Dashboard
            </div>

            <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, {getDisplayName(user).split(' ')[0]}!
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Manage your people, monitor projects, and oversee your company
              portal from one place.
            </p>
          </div>

          <div className="w-full shrink-0 rounded-2xl border border-slate-700 bg-slate-800/80 p-4 sm:w-auto">
            <p className="text-xs font-medium text-slate-300">
              Total registered users
            </p>
            <p className="mt-1 text-3xl font-bold text-white">
              {stats.activeUsers + stats.inactiveUsers}
            </p>
            <p className="mt-1 text-xs text-emerald-300">
              {stats.activeUsers} active accounts
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="break-words">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 shrink-0 rounded-xl px-3 font-semibold text-red-300 underline underline-offset-2 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Try again
          </button>
        </div>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Company overview</h2>
            <p className="mt-1 text-sm text-slate-300">
              A snapshot of your organization.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <Link
              key={card.key}
              to={card.href}
              className="group min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm transition-colors hover:border-indigo-400/40 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-300">{card.label}</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-white">
                    {card.value}
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/15 text-xl transition-colors group-hover:bg-indigo-500/25 motion-reduce:transition-none">
                  {card.icon}
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-400">{card.description}</p>

              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-indigo-300">
                Manage
                <span className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
        <div className="break-inside-avoid rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-emerald-200">Active accounts</p>
            <span className="text-lg text-emerald-300">✓</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">{stats.activeUsers}</p>
          <p className="mt-1 text-xs text-emerald-200/80">Users with active access</p>
        </div>

        <div className="break-inside-avoid rounded-2xl border border-slate-700/70 bg-slate-900 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-300">Inactive accounts</p>
            <span className="text-lg text-slate-400">⏸</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">{stats.inactiveUsers}</p>
          <p className="mt-1 text-xs text-slate-400">Accounts without active access</p>
        </div>

        <div className="break-inside-avoid rounded-2xl border border-sky-400/25 bg-sky-500/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-sky-200">Active projects</p>
            <span className="text-lg text-sky-300">🚀</span>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">{stats.activeProjects}</p>
          <p className="mt-1 text-xs text-sky-200/80">Published or in progress</p>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <DashboardSection
          title="Recently added users"
          action={
            <Link
              to="/admin/employees"
              className="min-h-11 inline-flex items-center rounded-lg text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
            >
              View users →
            </Link>
          }
        >
          {recentUsers.length === 0 ? (
            <EmptyState message="No user accounts found." />
          ) : (
            <div className="divide-y divide-slate-800">
              {recentUsers.map((profile) => {
                const name = getDisplayName(profile);
                const active = profile.is_active !== false && profile.is_active !== 0;

                return (
                  <div
                    key={profile.id}
                    className="flex min-w-0 items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-800/70 sm:px-6 motion-reduce:transition-none"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/15 text-sm font-bold text-indigo-200">
                      {getInitials(name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {profile.user_id || profile.email || 'No user ID'}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-300">
                        {ROLE_LABELS[profile.role] || profile.role || 'Unassigned'}
                        {profile.department ? ` · ${profile.department}` : ''}
                      </p>
                    </div>

                    <div className="hidden shrink-0 sm:block">
                      <StatusBadge active={active} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DashboardSection>

        <DashboardSection
          title="Recent projects"
          action={
            <Link
              to="/admin/projects"
              className="min-h-11 inline-flex items-center rounded-lg text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
            >
              View projects →
            </Link>
          }
        >
          {recentProjects.length === 0 ? (
            <EmptyState message="No projects have been created yet." />
          ) : (
            <div className="divide-y divide-slate-800">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex min-w-0 items-center gap-3 px-5 py-4 transition-colors hover:bg-slate-800/70 sm:px-6 motion-reduce:transition-none"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10 text-lg">
                    📂
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {project.name || 'Untitled project'}
                    </p>
                    <p className="mt-1 break-words text-xs text-slate-400">
                      {project.category || 'Uncategorized'} · Created {formatDate(project.created_at)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      ['published', 'active', 'in_progress', 'in progress'].includes(
                        String(project.status || '').toLowerCase()
                      )
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                        : String(project.status || '').toLowerCase() === 'completed'
                          ? 'border-violet-400/30 bg-violet-500/15 text-violet-200'
                          : 'border-slate-600 bg-slate-800 text-slate-300'
                    }`}
                  >
                    {project.status
                      ? project.status.replaceAll('_', ' ')
                      : 'Draft'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>
      </div>

      <DashboardSection title="Quick actions">
        <div className="grid grid-cols-1 items-start gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
          {[
            {
              title: 'Manage HR',
              description: 'Add or update HR accounts',
              href: '/admin/hr',
              icon: '👥',
            },
            {
              title: 'Manage employees',
              description: 'Review employee accounts',
              href: '/admin/employees',
              icon: '💼',
            },
            {
              title: 'Manage interns',
              description: 'Review intern accounts',
              href: '/admin/interns',
              icon: '🎓',
            },
            {
              title: 'Manage projects',
              description: 'Review all company projects',
              href: '/admin/projects',
              icon: '📁',
            },
          ].map((action) => (
            <Link
              key={action.title}
              to={action.href}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-900 p-4 transition-colors hover:border-indigo-400/40 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-xl">
                {action.icon}
              </span>
              <span className="min-w-0">
                <span className="block break-words text-sm font-semibold text-white">
                  {action.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-300">
                  {action.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </DashboardSection>
    </div>
  );
}