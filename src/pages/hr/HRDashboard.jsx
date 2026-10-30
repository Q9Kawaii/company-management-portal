import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProjectCard from '../../components/projects/ProjectCard';

const formatDate = (value) => {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const StatCard = ({ label, value, description, icon, accent }) => (
  <div className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-5 transition-colors hover:border-slate-600 motion-reduce:transition-none">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-300">{label}</p>
        <p className="mt-3 text-3xl font-bold tracking-tight text-white">
          {value}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
      </div>

      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}
        aria-hidden="true"
      >
        {icon}
      </div>
    </div>
  </div>
);

const EmptyState = ({ title, description, action }) => (
  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 px-6 py-12 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300">
      <svg
        className="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2h7A2.5 2.5 0 0 1 21 9.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-11Z"
        />
      </svg>
    </div>

    <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-300">
      {description}
    </p>

    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default function HRDashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [people, setPeople] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const loadDashboard = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const [
        { data: peopleData, error: peopleError },
        { data: projectsData, error: projectsError },
        { data: notificationData, error: notificationError },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, user_id, name, email, role, department, is_active')
          .in('role', ['Employee', 'Intern'])
          .order('name', { ascending: true }),

        supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false }),

        user?.id
          ? supabase
              .from('notifications')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(5)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (peopleError) throw peopleError;
      if (projectsError) throw projectsError;
      if (notificationError) throw notificationError;

      const normalizedPeople = (peopleData || []).map((person) => ({
        ...person,
        userId: person.user_id,
        isActive: person.is_active,
      }));

      const normalizedProjects = (projectsData || []).map((project) => ({
        ...project,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        leadId: project.lead_id,
        memberCount: 0,
      }));

      const projectIds = normalizedProjects.map((project) => project.id);

      if (projectIds.length > 0) {
        const { data: memberships, error: membershipsError } = await supabase
          .from('project_members')
          .select('project_id, user_id, role')
          .in('project_id', projectIds);

        if (membershipsError) throw membershipsError;

        const counts = {};

        (memberships || []).forEach((membership) => {
          counts[membership.project_id] =
            (counts[membership.project_id] || 0) + 1;
        });

        normalizedProjects.forEach((project) => {
          project.memberCount = counts[project.id] || 0;
        });
      }

      const leadIds = [
        ...new Set(normalizedProjects.map((project) => project.lead_id).filter(Boolean)),
      ];

      let leadMap = {};

      if (leadIds.length > 0) {
        const { data: leads, error: leadsError } = await supabase
          .from('profiles')
          .select('id, user_id, name, email, role')
          .in('id', leadIds);

        if (leadsError) throw leadsError;

        leadMap = Object.fromEntries(
          (leads || []).map((lead) => [lead.id, lead])
        );
      }

      normalizedProjects.forEach((project) => {
        project.lead =
          leadMap[project.lead_id] || null;
      });

      setPeople(normalizedPeople);
      setProjects(normalizedProjects);
      setNotifications(notificationData || []);
    } catch (loadError) {
      console.error('Failed to load HR dashboard:', loadError);
      setError(loadError.message || 'Unable to load dashboard information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    // The dashboard refresh button can be used to fetch updated data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const stats = useMemo(() => {
    const activePeople = people.filter((person) => person.is_active !== false);
    const activeEmployees = activePeople.filter(
      (person) => person.role === 'Employee'
    );
    const activeInterns = activePeople.filter(
      (person) => person.role === 'Intern'
    );

    const publishedProjects = projects.filter((project) =>
      ['published', 'active', 'in_progress'].includes(
        String(project.status || '').toLowerCase()
      )
    );

    const completedProjects = projects.filter(
      (project) =>
        String(project.status || '').toLowerCase() === 'completed'
    );

    const draftProjects = projects.filter(
      (project) => String(project.status || '').toLowerCase() === 'draft'
    );

    return {
      employees: activeEmployees.length,
      interns: activeInterns.length,
      activeProjects: publishedProjects.length,
      completedProjects: completedProjects.length,
      draftProjects: draftProjects.length,
    };
  }, [people, projects]);

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        )
        .slice(0, 5),
    [projects]
  );

  const recentPeople = useMemo(
    () =>
      [...people]
        .sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        )
        .slice(0, 5),
    [people]
  );

  if (loading) {
    return <LoadingSpinner fullScreen label="Loading HR dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-200 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-300">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              Human Resources
            </p>

            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Manage people, coordinate teams and keep projects moving.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadDashboard({ silent: true })}
            disabled={refreshing}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
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
            {refreshing ? 'Refreshing...' : 'Refresh Dashboard'}
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-200">
                Dashboard could not be fully loaded
              </p>
              <p className="mt-1 break-words text-sm leading-5 text-red-200">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadDashboard()}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-red-400/30 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Try again
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Active Employees"
            value={stats.employees}
            description="Employees available for projects"
            accent="border border-sky-400/20 bg-sky-500/15 text-sky-300"
            icon={
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6"
                />
              </svg>
            }
          />

          <StatCard
            label="Active Interns"
            value={stats.interns}
            description="Interns available for assignments"
            accent="border border-violet-400/20 bg-violet-500/15 text-violet-300"
            icon={
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21v-2a7 7 0 0 1 14 0v2M19 4l1.5 1.5L23 3"
                />
              </svg>
            }
          />

          <StatCard
            label="Active Projects"
            value={stats.activeProjects}
            description="Published projects in progress"
            accent="border border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
            icon={
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2h7A2.5 2.5 0 0 1 21 9.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-11Z"
                />
              </svg>
            }
          />

          <StatCard
            label="Completed Projects"
            value={stats.completedProjects}
            description={`${stats.draftProjects} draft projects awaiting publication`}
            accent="border border-amber-400/20 bg-amber-500/15 text-amber-300"
            icon={
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m5 12 4 4L19 6"
                />
                <circle cx="12" cy="12" r="9" />
              </svg>
            }
          />
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
            <p className="mt-1 text-sm leading-5 text-slate-400">
              Jump directly to the tools you use most.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              to="/hr/projects/create"
              className="group rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5 transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/15 text-indigo-200">
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
                    d="M12 5v14M5 12h14"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">
                Create Project
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-300">
                Set up a project and assign its team.
              </p>
              <span className="mt-4 inline-block text-xs font-semibold text-indigo-300 transition-transform group-hover:translate-x-1 motion-reduce:transition-none">
                Get started →
              </span>
            </Link>

            <Link
              to="/hr/people"
              className="group rounded-2xl border border-slate-700/70 bg-slate-900 p-5 transition-colors hover:border-sky-400/30 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/15 text-sky-200">
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
                    d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8v6M23 11h-6"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">
                Manage People
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-300">
                Review employees and manage team information.
              </p>
              <span className="mt-4 inline-block text-xs font-semibold text-sky-300 transition-transform group-hover:translate-x-1 motion-reduce:transition-none">
                View people →
              </span>
            </Link>

            <Link
              to="/hr/interns"
              className="group rounded-2xl border border-slate-700/70 bg-slate-900 p-5 transition-colors hover:border-violet-400/30 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/15 text-violet-200">
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
                    d="M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21v-2a7 7 0 0 1 14 0v2"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">
                Manage Interns
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-300">
                Review intern availability and assignments.
              </p>
              <span className="mt-4 inline-block text-xs font-semibold text-violet-300 transition-transform group-hover:translate-x-1 motion-reduce:transition-none">
                View interns →
              </span>
            </Link>

            <Link
              to="/hr/projects"
              className="group rounded-2xl border border-slate-700/70 bg-slate-900 p-5 transition-colors hover:border-emerald-400/30 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/15 text-emerald-200">
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
                    d="M4 19V5m0 14h16M8 15l3-4 3 2 5-7"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">
                Review Projects
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-300">
                Check project status and team assignments.
              </p>
              <span className="mt-4 inline-block text-xs font-semibold text-emerald-300 transition-transform group-hover:translate-x-1 motion-reduce:transition-none">
                View projects →
              </span>
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-3">
          <div className="min-w-0 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">
                  Recent Projects
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-400">
                  The latest projects created in the portal.
                </p>
              </div>

              <Link
                to="/hr/projects"
                className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                View all →
              </Link>
            </div>

            {recentProjects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Create your first project to begin assigning work to employees and interns."
                action={
                  <Link
                    to="/hr/projects/create"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    Create Project
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {recentProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => {
                      window.location.href = `/hr/projects/${project.id}`;
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">
                Recent Notifications
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                Your latest portal updates.
              </p>
            </div>

            {notifications.length === 0 ? (
              <EmptyState
                title="You're all caught up"
                description="New notifications and updates will appear here."
              />
            ) : (
              <div className="divide-y divide-slate-800 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 transition-colors hover:bg-slate-800/40">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/15">
                        <span className="h-2 w-2 rounded-full bg-indigo-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-slate-100">
                          {notification.title || 'Notification'}
                        </p>
                        <p className="mt-1 break-words text-sm leading-5 text-slate-300">
                          {notification.message || notification.body || ''}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white">
                Recently Added People
              </h2>
              <p className="mt-1 text-sm leading-5 text-slate-400">
                Employees and interns in your organization.
              </p>
            </div>

            <Link
              to="/hr/people"
              className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Manage people →
            </Link>
          </div>

          {recentPeople.length === 0 ? (
            <EmptyState
              title="No people found"
              description="Once employees and interns are added, they will appear here."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="border-b border-slate-700 bg-slate-900">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400">
                        Person
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400">
                        Role
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400">
                        Department
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {recentPeople.map((person) => (
                      <tr
                        key={person.id}
                        className="transition-colors hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-200">
                              {(person.name || person.user_id || '?')
                                .split(' ')
                                .map((part) => part[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate text-sm font-medium text-slate-100">
                                {person.name || 'Unnamed user'}
                              </p>
                              <p className="mt-1 max-w-[220px] truncate text-xs text-slate-400">
                                {person.user_id || person.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                              person.role === 'Intern'
                                ? 'border-violet-400/30 bg-violet-500/15 text-violet-200'
                                : 'border-sky-400/30 bg-sky-500/15 text-sky-200'
                            }`}
                          >
                            {person.role}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-300">
                          {person.department || '—'}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                              person.is_active !== false
                                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                                : 'border-red-400/30 bg-red-500/15 text-red-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                person.is_active !== false
                                  ? 'bg-emerald-300'
                                  : 'bg-red-300'
                              }`}
                            />
                            {person.is_active !== false
                              ? 'Active'
                              : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <footer className="mt-10 border-t border-slate-800 py-5">
          <p className="text-center text-xs text-slate-400">
            Company Portal · HR Dashboard · {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}