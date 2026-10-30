import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SearchBar from '../../components/common/SearchBar';
import ProjectCard from '../../components/projects/ProjectCard';

const normalizeProject = (project) => ({
  ...project,
  leadId: project.lead_id,
  createdAt: project.created_at,
});

export default function PastProjects() {
  const { user } = useAuth();
  const notifications = useNotifications();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadPastProjects = useCallback(
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
          .select('project_id, user_id, profile_id')
          .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`);

        if (membershipError) throw membershipError;

        const memberProjectIds = (memberships || [])
          .map((membership) => membership.project_id)
          .filter(Boolean);

        const { data: ledProjects, error: leadError } = await supabase
          .from('projects')
          .select('*')
          .eq('lead_id', user.id)
          .in('status', ['completed', 'archived']);

        if (leadError) throw leadError;

        let memberProjects = [];

        if (memberProjectIds.length > 0) {
          const { data, error } = await supabase
            .from('projects')
            .select('*')
            .in('id', memberProjectIds)
            .in('status', ['completed', 'archived']);

          if (error) throw error;
          memberProjects = data || [];
        }

        const projectMap = new Map();

        [...(ledProjects || []), ...memberProjects].forEach((project) => {
          projectMap.set(project.id, normalizeProject(project));
        });

        const pastProjects = Array.from(projectMap.values()).sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at || 0) -
            new Date(a.updated_at || a.created_at || 0)
        );

        const leadIds = [
          ...new Set(pastProjects.map((project) => project.lead_id).filter(Boolean)),
        ];

        let leadsById = {};

        if (leadIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, user_id, name, email, role')
            .or(
              `id.in.(${leadIds.join(',')}),user_id.in.(${leadIds.join(',')})`
            );

          if (profilesError) {
            console.warn('Unable to load project leads:', profilesError);
          } else {
            (profiles || []).forEach((profile) => {
              leadsById[profile.id] = profile;
              if (profile.user_id) leadsById[profile.user_id] = profile;
            });
          }
        }

        const enrichedProjects = pastProjects.map((project) => ({
          ...project,
          lead: leadsById[project.lead_id] || null,
        }));

        setProjects(enrichedProjects);
      } catch (error) {
        console.error('Failed to load past projects:', error);
        notifications.error(
          error.message || 'Unable to load your past projects.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    loadPastProjects();
  }, [loadPastProjects]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        [
          project.name,
          project.description,
          project.category,
          project.status,
          project.lead?.name,
        ].some((value) => String(value || '').toLowerCase().includes(query));

      const matchesCategory =
        categoryFilter === 'All' || project.category === categoryFilter;

      const matchesStatus =
        statusFilter === 'All' ||
        String(project.status || '').toLowerCase() ===
          statusFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [projects, searchQuery, categoryFilter, statusFilter]);

  const completedCount = projects.filter(
    (project) => String(project.status).toLowerCase() === 'completed'
  ).length;

  const archivedCount = projects.filter(
    (project) => String(project.status).toLowerCase() === 'archived'
  ).length;

  if (loading) {
    return (
      <LoadingSpinner
        fullScreen
        label="Loading your past projects..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <Link
            to="/intern"
            className="rounded-sm transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200">Past Projects</span>
        </div>

        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-indigo-300">
              Project History
            </p>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Past Projects
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Review your completed and archived assignments, including their
              descriptions, categories and team leads.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadPastProjects(false)}
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
            Refresh Projects
          </button>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Past Projects"
            value={projects.length}
            description="All previous assignments"
            tone="indigo"
          />
          <StatCard
            label="Completed"
            value={completedCount}
            description="Successfully completed"
            tone="emerald"
          />
          <StatCard
            label="Archived"
            value={archivedCount}
            description="Archived project records"
            tone="slate"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/10 sm:p-5">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_200px_180px]">
            <div className="min-w-0">
              <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-300">
                Search Projects
              </label>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by project name, lead or description..."
              />
            </div>

            <div className="min-w-0">
              <label
                htmlFor="category-filter"
                className="mb-2 block text-xs font-semibold tracking-wide text-slate-300"
              >
                Category
              </label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-200 outline-none transition-colors hover:border-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm"
              >
                <option value="All">All Categories</option>
                <option value="Intern-Based">Intern-Based</option>
                <option value="Main Project">Main Project</option>
              </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="status-filter"
                className="mb-2 block text-xs font-semibold tracking-wide text-slate-300"
              >
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-200 outline-none transition-colors hover:border-slate-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm"
              >
                <option value="All">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {(searchQuery || categoryFilter !== 'All' || statusFilter !== 'All') && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <p className="text-sm text-slate-300">
                Showing {filteredProjects.length} of {projects.length} projects
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('All');
                  setStatusFilter('All');
                }}
                className="inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-indigo-300 transition-colors hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-5 py-12 text-center sm:px-6 sm:py-14">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-200">
              <svg
                className="h-7 w-7"
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
                  d="M8 9h8M8 13h8M8 17h4"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-semibold text-white">
              {projects.length === 0
                ? 'No past projects yet'
                : 'No matching projects'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              {projects.length === 0
                ? 'Completed and archived projects will appear here when they become part of your project history.'
                : 'Try changing your search term or filters to find the project you are looking for.'}
            </p>

            {projects.length === 0 ? (
              <Link
                to="/intern/current-project"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                View Current Project
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('All');
                  setStatusFilter('All');
                }}
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-indigo-400/40 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Project History
              </h2>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-300">
                {filteredProjects.length}{' '}
                {filteredProjects.length === 1 ? 'project' : 'projects'}
              </span>
            </div>

            <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.map((project) => (
                <div key={project.id} className="relative min-w-0">
                  <ProjectCard
                    project={project}
                    lead={project.lead}
                    memberCount={project.member_count}
                    onClick={() => {
                      window.location.href = '/intern/current-project';
                    }}
                  />

                  <div className="pointer-events-none absolute right-4 top-4 max-w-[45%]">
                    <span
                      className={`inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                        String(project.status).toLowerCase() === 'completed'
                          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                          : 'border-slate-600 bg-slate-800 text-slate-200'
                      }`}
                    >
                      {String(project.status || 'Archived').replaceAll('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-slate-800 py-5 text-center text-xs text-slate-400">
          Company Management Portal · Intern Workspace
        </footer>
      </div>
    </div>
  );
}

function StatCard({ label, value, description, tone = 'indigo' }) {
  const tones = {
    indigo: 'border-indigo-400/25 bg-indigo-500/10',
    emerald: 'border-emerald-400/25 bg-emerald-500/10',
    slate: 'border-slate-700 bg-slate-900',
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-lg shadow-black/10 transition-colors hover:border-slate-600 ${
        tones[tone] || tones.indigo
      }`}
    >
      <p className="text-sm font-medium text-slate-300">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
    </div>
  );
}