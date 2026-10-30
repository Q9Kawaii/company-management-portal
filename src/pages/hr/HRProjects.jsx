import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../hooks/useNotifications';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function HRProjects() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadProjects = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      notifications.error(error.message || 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = projects.filter((project) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      (project.name || project.project_name || '')
        .toLowerCase()
        .includes(query) ||
      (project.description || '').toLowerCase().includes(query) ||
      (project.category || project.project_category || '')
        .toLowerCase()
        .includes(query);

    const matchesStatus =
      statusFilter === 'all' ||
      (project.status || 'draft').toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <LoadingSpinner fullScreen label="Loading projects..." />;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link
                to="/hr"
                className="rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Dashboard
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-slate-200">Projects</span>
            </div>

            <h1 className="break-words text-3xl font-bold tracking-tight text-white">
              Projects
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Browse projects, review their status, and manage project details.
            </p>
          </div>

          <Link
            to="/hr/projects/create"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 5v14m-7-7h14"
              />
            </svg>
            Create Project
          </Link>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 transition-colors hover:border-slate-600">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-300">
                Total Projects
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/15 text-indigo-200">
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
                    d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m4.5 7.5 7.5 4.3 7.5-4.3M12 12v9"
                  />
                </svg>
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-white">
              {projects.length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Across all project statuses
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 transition-colors hover:border-emerald-500/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-300">
                Published
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/15 text-emerald-200">
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
                    d="m5 12 4 4L19 6"
                  />
                </svg>
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-emerald-200">
              {
                projects.filter(
                  (project) => project.status?.toLowerCase() === 'published'
                ).length
              }
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Available to the team
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-5 transition-colors hover:border-amber-500/30">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-300">
                Drafts
              </p>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/15 text-amber-200">
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
                    d="M12 8v4l3 2"
                  />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-amber-200">
              {
                projects.filter(
                  (project) =>
                    !project.status || project.status.toLowerCase() === 'draft'
                ).length
              }
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Awaiting review or publication
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-700/70 bg-slate-900 p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-white">
              Find Projects
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Search by project details or narrow the list by status.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
            <div className="relative min-w-0">
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m16 16 4 4"
                />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search projects by name, description, or category..."
                aria-label="Search projects"
                className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-base text-white outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:text-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter projects by status"
              className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:text-sm"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-400">
              Showing{' '}
              <span className="font-semibold text-slate-200">
                {filteredProjects.length}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-slate-200">
                {projects.length}
              </span>{' '}
              projects
            </p>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-300">
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 7.5 7.5 4.3 7.5-4.3M12 12v9"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-semibold text-white">
              {projects.length === 0
                ? 'No projects yet'
                : 'No matching projects'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300">
              {projects.length === 0
                ? 'Create your first project to start assigning work to employees and interns.'
                : 'Try another search term or change the status filter.'}
            </p>

            {projects.length === 0 && (
              <Link
                to="/hr/projects/create"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Create your first project
              </Link>
            )}
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => {
              const name =
                project.name || project.project_name || 'Untitled Project';

              const status = (project.status || 'draft').toLowerCase();

              return (
                <article
                  key={project.id}
                  className="flex min-w-0 flex-col rounded-2xl border border-slate-700/70 bg-slate-900 p-5 transition-colors duration-200 hover:border-indigo-400/30 hover:bg-slate-900/90 motion-reduce:transition-none"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <h2 className="min-w-0 break-words text-lg font-semibold leading-6 text-white">
                      {name}
                    </h2>

                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                        status === 'published'
                          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                          : status === 'completed'
                            ? 'border-violet-400/30 bg-violet-500/15 text-violet-200'
                            : status === 'archived'
                              ? 'border-slate-700 bg-slate-800 text-slate-300'
                              : status === 'active' || status === 'in_progress' || status === 'in progress'
                                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                                : 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                      }`}
                    >
                      {status.replaceAll('_', ' ')}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-3 min-h-[4.5rem] break-words text-sm leading-6 text-slate-300">
                    {project.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="max-w-full break-words rounded-lg border border-slate-700/70 bg-slate-800 px-3 py-1.5 text-xs text-slate-200">
                      {project.category ||
                        project.project_category ||
                        'Uncategorized'}
                    </span>

                    {project.created_at && (
                      <span className="rounded-lg border border-slate-700/70 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">
                        {new Date(project.created_at).toLocaleDateString(
                          'en-IN',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )}
                      </span>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/hr/projects/${project.id}`)
                      }
                      className="min-h-11 min-w-0 flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      View Details
                    </button>

                    {status === 'draft' && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/hr/projects/${project.id}/review`)
                        }
                        className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={loadProjects}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
                d="M20 7v5h-5M4 17v-5h5"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5.6 9A7 7 0 0 1 17.4 6L20 12M4 12l2.6 6A7 7 0 0 0 18.4 15"
              />
            </svg>
            Refresh Projects
          </button>
        </div>
      </div>
    </div>
  );
}