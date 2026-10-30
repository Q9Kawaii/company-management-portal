import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../hooks/useNotifications';
import ProjectCard from '../../components/projects/ProjectCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import SearchBar from '../../components/common/SearchBar';

const PAGE_SIZE = 9;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  { value: 'Main Project', label: 'Main Project' },
  { value: 'Intern-Based', label: 'Intern-Based' },
];

function normalizeProject(project) {
  return {
    ...project,
    createdAt: project.created_at ?? project.createdAt ?? null,
    updatedAt: project.updated_at ?? project.updatedAt ?? null,
    teamLead: project.team_lead ?? project.teamLead ?? null,
    leadId: project.lead_id ?? project.leadId ?? null,
    memberCount: project.member_count ?? project.memberCount ?? 0,
    description: project.description ?? '',
    category: project.category ?? 'Main Project',
    status: String(project.status ?? 'draft').toLowerCase(),
  };
}

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

function StatusBadge({ status }) {
  const styles = {
    draft: 'border border-slate-600 bg-slate-800 text-slate-200',
    published: 'border border-sky-400/30 bg-sky-500/15 text-sky-200',
    active: 'border border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
    completed: 'border border-violet-400/30 bg-violet-500/15 text-violet-200',
    archived: 'border border-amber-400/30 bg-amber-500/15 text-amber-200',
  };

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || styles.draft
      }`}
    >
      {status.replaceAll('_', ' ')}
    </span>
  );
}

export default function ManageProjects() {
  const { success, error: notifyError } = useNotifications();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [page, setPage] = useState(1);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const { data, error: queryError } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const normalized = (data || []).map(normalizeProject);

      const leadIds = [
        ...new Set(normalized.map((project) => project.leadId).filter(Boolean)),
      ];

      let leadMap = {};

      if (leadIds.length > 0) {
        const { data: leads, error: leadsError } = await supabase
          .from('profiles')
          .select('id, user_id, name, role')
          .in('id', leadIds);

        if (!leadsError) {
          leadMap = Object.fromEntries(
            (leads || []).map((lead) => [
              lead.id,
              {
                ...lead,
                name: lead.name || lead.user_id || 'Unknown',
              },
            ])
          );
        }
      }

      const projectIds = normalized.map((project) => project.id).filter(Boolean);
      let memberCounts = {};

      if (projectIds.length > 0) {
        const { data: members, error: membersError } = await supabase
          .from('project_members')
          .select('project_id')
          .in('project_id', projectIds);

        if (!membersError) {
          memberCounts = (members || []).reduce((counts, member) => {
            counts[member.project_id] = (counts[member.project_id] || 0) + 1;
            return counts;
          }, {});
        }
      }

      const enriched = normalized.map((project) => ({
        ...project,
        lead: leadMap[project.leadId] || null,
        memberCount: memberCounts[project.id] ?? project.memberCount ?? 0,
      }));

      setProjects(enriched);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setPageError(err.message || 'Unable to load projects.');
      notifyError(err.message || 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        [
          project.name,
          project.description,
          project.category,
          project.lead?.name,
          project.lead?.user_id,
          project.status,
        ].some((value) => String(value || '').toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === 'all' || project.status === statusFilter;

      const matchesCategory =
        categoryFilter === 'all' || project.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [projects, searchQuery, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));

  const paginatedProjects = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProjects.slice(start, start + PAGE_SIZE);
  }, [filteredProjects, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const stats = useMemo(
    () => ({
      total: projects.length,
      published: projects.filter((project) =>
        ['published', 'active', 'in progress'].includes(project.status)
      ).length,
      drafts: projects.filter((project) => project.status === 'draft').length,
      completed: projects.filter((project) => project.status === 'completed').length,
    }),
    [projects]
  );

  const handlePublish = async (project) => {
    const confirmed = window.confirm(
      `Publish "${project.name}"? Assigned team members may be notified that the project is available.`
    );

    if (!confirmed) return;

    setUpdating(true);

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          status: 'Published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (updateError) throw updateError;

      success('Project published successfully.');
      setSelectedProject(null);
      await loadProjects();
    } catch (err) {
      console.error('Failed to publish project:', err);
      notifyError(err.message || 'Unable to publish project.');
    } finally {
      setUpdating(false);
    }
  };

  const handleArchive = async (project) => {
    const confirmed = window.confirm(
      `Archive "${project.name}"? It will remain in the database for historical records.`
    );

    if (!confirmed) return;

    setUpdating(true);

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          status: 'Archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (updateError) throw updateError;

      success('Project archived successfully.');
      await loadProjects();
    } catch (err) {
      console.error('Failed to archive project:', err);
      notifyError(err.message || 'Unable to archive project.');
    } finally {
      setUpdating(false);
    }
  };

  const handleRestore = async (project) => {
    const confirmed = window.confirm(
      `Restore "${project.name}" as a draft?`
    );

    if (!confirmed) return;

    setUpdating(true);

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          status: 'Draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (updateError) throw updateError;

      success('Project restored as a draft.');
      await loadProjects();
    } catch (err) {
      console.error('Failed to restore project:', err);
      notifyError(err.message || 'Unable to restore project.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setUpdating(true);

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          status: 'Archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', deleteTarget.id);

      if (updateError) throw updateError;

      setDeleteTarget(null);
      success('Project archived. Historical records have been preserved.');
      await loadProjects();
    } catch (err) {
      console.error('Failed to archive project:', err);
      notifyError(err.message || 'Unable to archive project.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 bg-slate-950 text-slate-200">
      <header className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <Link
              to="/admin"
              className="inline-flex min-h-11 items-center transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Dashboard
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-200">Projects</span>
          </div>

          <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Manage Projects
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Review projects, monitor their status, and manage publication.
          </p>
        </div>

        <Link
          to="/hr/projects/create"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
            className="h-5 w-5 shrink-0"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
          Create Project
        </Link>
      </header>

      {pageError && (
        <div
          role="alert"
          className="flex min-w-0 flex-col gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="min-w-0 break-words">{pageError}</p>
          <button
            type="button"
            onClick={loadProjects}
            className="min-h-11 shrink-0 rounded-lg px-3 font-semibold text-red-300 underline underline-offset-2 transition-colors hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="break-inside-avoid rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-400">Total projects</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">
            {stats.total}
          </p>
          <p className="mt-1 text-xs text-slate-400">All recorded projects</p>
        </div>

        <div className="break-inside-avoid rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
          <p className="text-sm font-medium text-emerald-200">Published / active</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-300">
            {stats.published}
          </p>
          <p className="mt-1 text-xs text-emerald-200/80">Available or ongoing</p>
        </div>

        <div className="break-inside-avoid rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
          <p className="text-sm font-medium text-amber-200">Draft projects</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-amber-300">
            {stats.drafts}
          </p>
          <p className="mt-1 text-xs text-amber-200/80">Not yet published</p>
        </div>

        <div className="break-inside-avoid rounded-2xl border border-violet-400/30 bg-violet-500/10 p-5">
          <p className="text-sm font-medium text-violet-200">Completed projects</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-violet-300">
            {stats.completed}
          </p>
          <p className="mt-1 text-xs text-violet-200/80">Finished projects</p>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-4 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-base font-bold text-white">Find projects</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Search by project name, description, team lead, or category.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-3">
          <div className="min-w-0 md:col-span-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search projects..."
            />
          </div>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-slate-900 text-slate-100"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">
              Category
            </span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:text-sm"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-slate-900 text-slate-100"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/70 pt-4">
          <p className="text-sm text-slate-400">
            Showing{' '}
            <span className="font-semibold text-white">
              {filteredProjects.length}
            </span>{' '}
            of {projects.length} projects
          </p>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setCategoryFilter('all');
              setPage(1);
              loadProjects();
            }}
            className="min-h-11 rounded-lg px-3 text-left text-sm font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Clear filters and refresh
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900">
          <LoadingSpinner label="Loading projects..." />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 px-5 py-14 text-center sm:px-6 sm:py-16">
          <h2 className="text-lg font-bold text-white">No projects found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            No projects match your current filters. Try changing the search or
            create a new project.
          </p>
          <Link
            to="/hr/projects/create"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
          >
            Create a project
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedProjects.map((project) => (
              <div
                key={project.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 shadow-sm transition-colors hover:border-slate-600 motion-reduce:transition-none"
              >
                <div className="flex-1 p-4 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`max-w-full break-words rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        project.category === 'Intern-Based'
                          ? 'border-violet-400/30 bg-violet-500/15 text-violet-200'
                          : 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200'
                      }`}
                    >
                      {project.category}
                    </span>
                    <StatusBadge status={project.status} />
                  </div>

                  <h2 className="break-words text-lg font-bold text-white">
                    {project.name || 'Untitled project'}
                  </h2>

                  <p className="mt-2 line-clamp-3 whitespace-pre-line break-words text-sm leading-6 text-slate-300">
                    {project.description || 'No project description provided.'}
                  </p>

                  <div className="mt-5 space-y-3 border-t border-slate-700/70 pt-4">
                    <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                      <span className="shrink-0 text-slate-400">Team lead</span>
                      <span className="min-w-0 max-w-[65%] truncate text-right font-medium text-slate-200">
                        {project.lead?.name || 'Not assigned'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-400">Team members</span>
                      <span className="font-medium tabular-nums text-slate-200">
                        {project.memberCount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-400">Created</span>
                      <span className="font-medium text-slate-200">
                        {formatDate(project.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-700/70 bg-slate-800/60 p-4">
                  <button
                    type="button"
                    onClick={() => setSelectedProject(project)}
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
                  >
                    Details
                  </button>

                  {project.status === 'draft' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handlePublish(project)}
                      className="min-h-11 min-w-0 flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                    >
                      Publish
                    </button>
                  )}

                  {['published', 'active', 'in progress'].includes(project.status) && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleArchive(project)}
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                    >
                      Archive
                    </button>
                  )}

                  {project.status === 'archived' && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => handleRestore(project)}
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-900 px-4 py-3">
              <p className="text-sm text-slate-400">
                Page <span className="font-semibold text-white">{page}</span> of{' '}
                <span className="font-semibold text-white">{totalPages}</span>
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={Boolean(selectedProject)}
        onClose={() => setSelectedProject(null)}
        title="Project Details"
        size="lg"
      >
        {selectedProject && (
          <div className="min-w-0 space-y-5 text-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="max-w-full break-words rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-200">
                {selectedProject.category}
              </span>
              <StatusBadge status={selectedProject.status} />
            </div>

            <div className="min-w-0">
              <h3 className="break-words text-xl font-bold text-white">
                {selectedProject.name || 'Untitled project'}
              </h3>
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-300">
                {selectedProject.description || 'No description provided.'}
              </p>
            </div>

            <div className="min-w-0 divide-y divide-slate-700/70 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
              {[
                ['Team lead', selectedProject.lead?.name || 'Not assigned'],
                ['Team lead ID', selectedProject.lead?.user_id || '—'],
                ['Team members', selectedProject.memberCount],
                ['Created', formatDate(selectedProject.createdAt)],
                ['Last updated', formatDate(selectedProject.updatedAt)],
                ['Project ID', selectedProject.id],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid min-w-0 grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-3 sm:gap-3"
                >
                  <span className="text-slate-400">{label}</span>
                  <span className="min-w-0 break-words font-medium text-slate-100 sm:col-span-2">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-700/70 pt-4">
              {selectedProject.status === 'draft' && (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handlePublish(selectedProject)}
                  className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                >
                  Publish Project
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="min-h-11 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Archive project?"
        message={
          deleteTarget
            ? `This will archive "${deleteTarget.name}" while preserving its historical records.`
            : ''
        }
        confirmText="Archive project"
        cancelText="Cancel"
        variant="warning"
        loading={updating}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!updating) setDeleteTarget(null);
        }}
      />
    </div>
  );
}