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

function StatusBadge({ status }) {
  const normalized = String(status || 'completed').toLowerCase();

  const styles = {
    completed: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
    archived: 'bg-slate-700 text-slate-300 ring-slate-600',
    active: 'bg-sky-500/15 text-sky-200 ring-sky-400/30',
    published: 'bg-sky-500/15 text-sky-200 ring-sky-400/30',
    draft: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
        styles[normalized] || styles.completed
      }`}
    >
      {normalized.replaceAll('_', ' ')}
    </span>
  );
}

function ProjectCard({ project }) {
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none">
      <div className="h-1.5 bg-indigo-500" />

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xl text-indigo-200 ring-1 ring-inset ring-indigo-400/20">
            📁
          </div>

          <StatusBadge status={project.status} />
        </div>

        <h2 className="mt-4 break-words text-lg font-bold text-white transition group-hover:text-indigo-300">
          {project.name || 'Untitled project'}
        </h2>

        <div className="mt-2">
          <span className="inline-flex max-w-full break-words rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 ring-1 ring-inset ring-slate-700">
            {project.category || 'Uncategorized'}
          </span>
        </div>

        <p className="mt-3 min-h-12 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
          {project.description || 'No description available.'}
        </p>

        <div className="mt-5 space-y-3 border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">Created</span>
            <span className="text-right font-medium text-slate-200">
              {formatDate(project.created_at)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-400">Last updated</span>
            <span className="text-right font-medium text-slate-200">
              {formatDate(project.updated_at || project.created_at)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function PastProjects() {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const loadPastProjects = useCallback(async () => {
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

      const allProjects = [...memberProjects, ...(ledProjects || [])];

      const uniqueProjects = Array.from(
        new Map(allProjects.map((project) => [project.id, project])).values()
      );

      const pastProjects = uniqueProjects
        .filter((project) =>
          ['completed', 'archived'].includes(
            String(project.status || '').toLowerCase()
          )
        )
        .sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at || 0).getTime() -
            new Date(a.updated_at || a.created_at || 0).getTime()
        );

      setProjects(pastProjects);
    } catch (err) {
      console.error('Failed to load past projects:', err);
      setPageError(err.message || 'Unable to load your past projects.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPastProjects();
  }, [loadPastProjects]);

  const filteredProjects = projects.filter((project) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      String(project.name || '').toLowerCase().includes(query) ||
      String(project.description || '').toLowerCase().includes(query) ||
      String(project.category || '').toLowerCase().includes(query);

    const matchesCategory =
      categoryFilter === 'all' ||
      String(project.category || '').toLowerCase() ===
        categoryFilter.toLowerCase();

    const matchesStatus =
      statusFilter === 'all' ||
      String(project.status || '').toLowerCase() ===
        statusFilter.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const completedCount = projects.filter(
    (project) => String(project.status || '').toLowerCase() === 'completed'
  ).length;

  const archivedCount = projects.filter(
    (project) => String(project.status || '').toLowerCase() === 'archived'
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Loading past projects..." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <Link
              to="/employee"
              className="min-h-11 inline-flex items-center transition hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-200">Past Projects</span>
          </div>

          <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Past Projects
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Review projects you have completed or that have been archived.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/employee/current-project"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-base font-semibold text-slate-200 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:text-sm"
          >
            Current Project
          </Link>

          <button
            type="button"
            onClick={loadPastProjects}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:text-sm"
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      {pageError && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"
        >
          <p className="font-semibold">Unable to load past projects</p>
          <p className="mt-1 break-words">{pageError}</p>
          <button
            type="button"
            onClick={loadPastProjects}
            className="mt-3 min-h-11 font-semibold text-red-300 underline underline-offset-4 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Try again
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-400">
                Total Past Projects
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                {projects.length}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xl text-indigo-200">
              📚
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-400">Completed</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">
                {completedCount}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-xl text-emerald-200">
              ✓
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-400">Archived</p>
              <p className="mt-2 text-3xl font-bold text-slate-200">
                {archivedCount}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-xl text-slate-300">
              🗄️
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-900 p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_200px_180px]">
          <div className="min-w-0">
            <label
              htmlFor="project-search"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Search projects
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                ⌕
              </span>

              <input
                id="project-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, category, or description..."
                className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 sm:text-sm"
              />
            </div>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="category-filter"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Project category
            </label>

            <select
              id="category-filter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 sm:text-sm"
            >
              <option value="all">All categories</option>
              <option value="Intern-Based">Intern-Based</option>
              <option value="Main Project">Main Project</option>
            </select>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="status-filter"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Project status
            </label>

            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 sm:text-sm"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <p className="text-sm text-slate-400">
            Showing{' '}
            <span className="font-semibold text-white">
              {filteredProjects.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-white">
              {projects.length}
            </span>{' '}
            projects
          </p>

          {(search || categoryFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
              className="min-h-11 text-base font-semibold text-indigo-300 transition hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {filteredProjects.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 px-6 py-14 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-3xl">
            {projects.length === 0 ? '📁' : '🔎'}
          </div>

          <h2 className="text-lg font-bold text-white">
            {projects.length === 0
              ? 'No past projects yet'
              : 'No matching projects'}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            {projects.length === 0
              ? 'Completed or archived projects assigned to you will appear here.'
              : 'Try changing your search query or selecting different filters.'}
          </p>

          {projects.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
              className="mt-5 min-h-11 rounded-xl bg-indigo-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:text-sm"
            >
              Clear Filters
            </button>
          )}

          {projects.length === 0 && (
            <Link
              to="/employee/current-project"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-base font-semibold text-slate-200 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:text-sm"
            >
              View Current Project
            </Link>
          )}
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </section>
      )}
    </div>
  );
}