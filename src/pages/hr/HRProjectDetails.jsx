import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Timeline from '../../components/timeline/Timeline';

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getStatusStyles = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'published':
    case 'active':
    case 'in_progress':
      return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200';
    case 'draft':
      return 'border-amber-400/30 bg-amber-500/15 text-amber-200';
    case 'completed':
      return 'border-violet-400/30 bg-violet-500/15 text-violet-200';
    case 'archived':
      return 'border-slate-700 bg-slate-800 text-slate-300';
    default:
      return 'border-slate-700 bg-slate-800 text-slate-300';
  }
};

const normalizeProfile = (profile) => ({
  ...profile,
  userId: profile.user_id,
  isActive: profile.is_active,
});

const DetailItem = ({ label, value }) => (
  <div className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
    <p className="text-xs font-medium text-slate-400">
      {label}
    </p>
    <p className="mt-2 break-words text-sm font-medium text-slate-100">
      {value || '—'}
    </p>
  </div>
);

const PersonRow = ({ person, roleLabel }) => {
  const initials = (person?.name || person?.user_id || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-950/50 p-3 transition-colors hover:border-slate-600 hover:bg-slate-800/60">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-sm font-semibold text-indigo-200">
          {initials}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {person?.name || 'Unnamed user'}
          </p>
          <p className="mt-1 break-all text-xs text-slate-400">
            {person?.user_id || person?.email || ''}
          </p>
        </div>
      </div>

      <span className="shrink-0 rounded-full border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-200">
        {roleLabel || person?.role || 'Member'}
      </span>
    </div>
  );
};

export default function HRProjectDetails() {
  const { projectId, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const notifications = useNotifications();

  const resolvedProjectId = projectId || id;

  const [project, setProject] = useState(null);
  const [lead, setLead] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editValues, setEditValues] = useState({
    name: '',
    category: 'Main Project',
    description: '',
  });

  const loadProject = useCallback(async () => {
    if (!resolvedProjectId) {
      setError('No project ID was provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', resolvedProjectId)
        .maybeSingle();

      if (projectError) throw projectError;

      if (!projectData) {
        setProject(null);
        setMembers([]);
        setLead(null);
        setError('This project could not be found.');
        return;
      }

      const { data: membershipData, error: membershipError } = await supabase
        .from('project_members')
        .select('project_id, user_id, role')
        .eq('project_id', projectData.id);

      if (membershipError) throw membershipError;

      const profileIds = new Set(
        (membershipData || []).map((membership) => membership.user_id)
      );

      if (projectData.lead_id) profileIds.add(projectData.lead_id);

      let profileMap = {};

      if (profileIds.size > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_id, name, email, role, department, is_active')
          .in('id', [...profileIds]);

        if (profileError) throw profileError;

        profileMap = Object.fromEntries(
          (profileData || []).map((profile) => [
            profile.id,
            normalizeProfile(profile),
          ])
        );
      }

      const normalizedMembers = (membershipData || []).map((membership) => ({
        ...membership,
        person: profileMap[membership.user_id] || null,
      }));

      setProject(projectData);
      setLead(profileMap[projectData.lead_id] || null);
      setMembers(normalizedMembers);
      setEditValues({
        name: projectData.name || '',
        category: projectData.category || 'Main Project',
        description: projectData.description || '',
      });
    } catch (loadError) {
      console.error('Failed to load project details:', loadError);
      setError(loadError.message || 'Unable to load project details.');
    } finally {
      setLoading(false);
    }
  }, [resolvedProjectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const memberPeople = useMemo(
    () => members.filter((membership) => membership.person),
    [members]
  );

  const employeeCount = memberPeople.filter(
    (membership) => membership.person.role === 'Employee'
  ).length;

  const internCount = memberPeople.filter(
    (membership) => membership.person.role === 'Intern'
  ).length;

  const isArchived = String(project?.status || '').toLowerCase() === 'archived';

  const handleSaveDetails = async (event) => {
    event.preventDefault();

    if (!editValues.name.trim()) {
      notifications.warning('Project name is required.');
      return;
    }

    if (!editValues.description.trim()) {
      notifications.warning('Project description is required.');
      return;
    }

    setActionLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          name: editValues.name.trim(),
          category: editValues.category,
          description: editValues.description.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id);

      if (updateError) throw updateError;

      notifications.success('Project details updated.');
      setEditOpen(false);
      await loadProject();
    } catch (updateError) {
      console.error('Failed to update project:', updateError);
      notifications.error(updateError.message || 'Unable to update project.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
  if (!project) return;

  setActionLoading(true);

  try {
    const { data: membershipData, error: membershipError } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', project.id);

    if (membershipError) throw membershipError;

    const profileIds = [
      ...new Set([
        ...(membershipData || []).map((membership) => membership.user_id),
        ...(project.lead_id ? [project.lead_id] : []),
      ]),
    ];

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        status: 'Archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id);

    if (updateError) throw updateError;

    if (profileIds.length > 0) {
      const { data: remainingMemberships, error: remainingMembershipsError } =
        await supabase
          .from('project_members')
          .select('user_id')
          .in('user_id', profileIds)
          .neq('project_id', project.id);

      if (remainingMembershipsError) throw remainingMembershipsError;

      const { data: remainingLeadProjects, error: remainingLeadError } =
        await supabase
          .from('projects')
          .select('lead_id')
          .in('lead_id', profileIds)
          .neq('id', project.id)
          .neq('status', 'Archived');

      if (remainingLeadError) throw remainingLeadError;

      const stillAssigned = new Set([
        ...(remainingMemberships || []).map((membership) => membership.user_id),
        ...(remainingLeadProjects || []).map((otherProject) => otherProject.lead_id),
      ]);

      const profilesToUnassign = profileIds.filter(
        (profileId) => !stillAssigned.has(profileId)
      );

      if (profilesToUnassign.length > 0) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ assigned: false })
          .in('id', profilesToUnassign);

        if (profileUpdateError) throw profileUpdateError;
      }
    }

    notifications.success('Project archived.');
    setArchiveDialogOpen(false);
    await loadProject();
  } catch (archiveError) {
    console.error('Failed to archive project:', archiveError);
    notifications.error(
      archiveError.message || 'Unable to archive project.'
    );
  } finally {
    setActionLoading(false);
  }
};

  const handleRestore = async () => {
  if (!project) return;

  setActionLoading(true);

  try {
    // Get members belonging to this project
    const { data: membershipData, error: membershipError } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', project.id);

    if (membershipError) throw membershipError;

    // Include the team lead and remove duplicate IDs
    const profileIds = [
      ...new Set([
        ...(membershipData || []).map((membership) => membership.user_id),
        ...(project.lead_id ? [project.lead_id] : []),
      ]),
    ];

    // Check whether anyone is already assigned
    if (profileIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, assigned')
        .in('id', profileIds);

      if (profileError) throw profileError;

      const alreadyWorking = (profileData || []).filter(
        (profile) => profile.assigned === true
      );

      if (alreadyWorking.length > 0) {
        const names = alreadyWorking
          .map((profile) => profile.name || profile.id)
          .join(', ');

        window.alert(
          `Cannot restore this project. These people are already working on another project:\n\n${names}`
        );

        return;
      }
    }

    // Restore the project
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        status: 'Published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id);

    if (updateError) throw updateError;

    // Mark this project's members and lead as assigned
    if (profileIds.length > 0) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ assigned: true })
        .in('id', profileIds);

      if (profileUpdateError) throw profileUpdateError;
    }

    notifications.success('Project restored and team members assigned.');
    setRestoreDialogOpen(false);
    await loadProject();
  } catch (restoreError) {
    console.error('Failed to restore project:', restoreError);
    notifications.error(
      restoreError.message || 'Unable to restore project.'
    );
  } finally {
    setActionLoading(false);
  }
};

  const handleDelete = async () => {
  if (!project) return;

  setActionLoading(true);

  try {
    const { data: membershipData, error: membershipError } = await supabase
      .from('project_members')
      .select('user_id')
      .eq('project_id', project.id);

    if (membershipError) throw membershipError;

    const profileIds = [
      ...new Set([
        ...(membershipData || []).map((membership) => membership.user_id),
        ...(project.lead_id ? [project.lead_id] : []),
      ]),
    ];

    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id);

    if (deleteError) throw deleteError;

    if (profileIds.length > 0) {
      const { data: remainingMemberships, error: remainingMembershipsError } =
        await supabase
          .from('project_members')
          .select('user_id')
          .in('user_id', profileIds);

      if (remainingMembershipsError) throw remainingMembershipsError;

      const { data: remainingLeadProjects, error: remainingLeadError } =
        await supabase
          .from('projects')
          .select('lead_id')
          .in('lead_id', profileIds)
          .neq('status', 'Archived');

      if (remainingLeadError) throw remainingLeadError;

      const stillAssigned = new Set([
        ...(remainingMemberships || []).map((membership) => membership.user_id),
        ...(remainingLeadProjects || []).map((otherProject) => otherProject.lead_id),
      ]);

      const profilesToUnassign = profileIds.filter(
        (profileId) => !stillAssigned.has(profileId)
      );

      if (profilesToUnassign.length > 0) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ assigned: false })
          .in('id', profilesToUnassign);

        if (profileUpdateError) throw profileUpdateError;
      }
    }

    notifications.success('Project deleted successfully.');
    setDeleteDialogOpen(false);
    navigate('/hr/projects', { replace: true });
  } catch (deleteError) {
    console.error('Failed to delete project:', deleteError);
    notifications.error(
      deleteError.message || 'Unable to delete project.'
    );
  } finally {
    setActionLoading(false);
  }
};

  if (loading) {
    return <LoadingSpinner fullScreen label="Loading project details..." />;
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
        <div className="w-full max-w-lg rounded-2xl border border-slate-700/70 bg-slate-900 p-6 text-center shadow-xl shadow-black/20 sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.3 3.9 1.9 18.4A1.8 1.8 0 0 0 3.5 21h17a1.8 1.8 0 0 0 1.6-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z"
              />
            </svg>
          </div>

          <h1 className="mt-5 text-xl font-bold text-white">
            Unable to open project
          </h1>
          <p className="mt-2 break-words text-sm leading-6 text-slate-300">
            {error || 'The requested project does not exist.'}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadProject}
              className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Try Again
            </button>

            <Link
              to="/hr/projects"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <Link
            to="/hr"
            className="rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <Link
            to="/hr/projects"
            className="rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Projects
          </Link>
          <span className="text-slate-600">/</span>
          <span className="max-w-xs truncate text-slate-200">
            {project.name}
          </span>
        </div>

        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusStyles(
                  project.status
                )}`}
              >
                {(project.status || 'unknown').replaceAll('_', ' ')}
              </span>

              <span className="inline-flex max-w-full break-words rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-200">
                {project.category || 'Uncategorized'}
              </span>
            </div>

            <h1 className="mt-4 break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {project.name}
            </h1>

            <p className="mt-2 max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
              {project.description || 'No project description has been added.'}
            </p>

            <p className="mt-3 text-xs text-slate-400">
              Created {formatDate(project.created_at)}
              {project.updated_at
                ? ` · Last updated ${formatDate(project.updated_at)}`
                : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              disabled={isArchived}
              className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Edit Details
            </button>

            {isArchived ? (
              <button
                type="button"
                onClick={() => setRestoreDialogOpen(true)}
                disabled={actionLoading}
                className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Restore Project
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setArchiveDialogOpen(true)}
                disabled={actionLoading}
                className="min-h-11 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Archive Project
              </button>
            )}

            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={actionLoading}
              className="min-h-11 rounded-xl border border-red-500/30 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete Project
            </button>
          </div>
        </header>

        <div className="mb-6 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Project Category" value={project.category} />
          <DetailItem label="Team Lead" value={lead?.name || 'Not assigned'} />
          <DetailItem label="Team Members" value={memberPeople.length} />
          <DetailItem
            label="Project Created"
            value={formatDate(project.created_at)}
          />
        </div>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'team', label: `Team (${memberPeople.length})` },
            { id: 'timeline', label: 'Team Timeline' },
            { id: 'staff', label: 'Staff Timeline' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                activeTab === tab.id
                  ? 'border-indigo-400/30 bg-indigo-500/15 text-indigo-200'
                  : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid min-w-0 gap-6 lg:grid-cols-3">
            <section className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-5 sm:p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold text-white">
                Project Overview
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Current project information and team composition.
              </p>

              <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
                <DetailItem label="Project Name" value={project.name} />
                <DetailItem label="Category" value={project.category} />
                <DetailItem
                  label="Status"
                  value={(project.status || 'unknown').replaceAll('_', ' ')}
                />
                <DetailItem
                  label="Assigned Lead"
                  value={lead?.name || 'Not assigned'}
                />
                <DetailItem label="Employees" value={employeeCount} />
                <DetailItem label="Interns" value={internCount} />
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-100">
                  Description
                </h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                  {project.description || 'No description available.'}
                </p>
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white">Team Lead</h2>
              <p className="mt-1 text-sm text-slate-300">
                Person responsible for coordinating the project.
              </p>

              {lead ? (
                <div className="mt-5">
                  <PersonRow person={lead} roleLabel="Lead" />
                  {lead.email && (
                    <p className="mt-3 break-all text-sm text-slate-300">
                      {lead.email}
                    </p>
                  )}
                  {lead.department && (
                    <p className="mt-2 break-words text-xs text-slate-400">
                      {lead.department}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
                  No lead has been assigned to this project.
                </p>
              )}
            </section>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="grid min-w-0 gap-6 lg:grid-cols-3">
            <section className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-5 sm:p-6 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-white">
                    Assigned Team
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Employees and interns assigned to this project.
                  </p>
                </div>

                <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  {memberPeople.length} members
                </span>
              </div>

              {memberPeople.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center">
                  <p className="text-sm font-medium text-slate-200">
                    No team members found
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    No members are currently assigned to this project.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {memberPeople.map((membership) => (
                    <PersonRow
                      key={`${membership.project_id}-${membership.user_id}`}
                      person={membership.person}
                      roleLabel={membership.role}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white">
                Team Breakdown
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                Current assigned member counts.
              </p>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
                  <span className="text-sm text-slate-200">Employees</span>
                  <span className="text-lg font-bold text-sky-200">
                    {employeeCount}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
                  <span className="text-sm text-slate-200">Interns</span>
                  <span className="text-lg font-bold text-violet-200">
                    {internCount}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
                  <span className="text-sm text-slate-200">Total</span>
                  <span className="text-lg font-bold text-white">
                    {memberPeople.length}
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'timeline' && (
          <section className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-4 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                Team Timeline
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Project updates, discussions and attachments shared with the
                assigned team.
              </p>
            </div>

            <Timeline
              projectId={project.id}
              timelineId="main"
              timelineType="main"
              readOnly={isArchived}
            />
          </section>
        )}

        {activeTab === 'staff' && (
          <section className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-4 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                Staff Timeline
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Internal HR and administration updates for this project.
              </p>
            </div>

            <Timeline
              projectId={project.id}
              timelineId="staff"
              timelineType="staff"
              readOnly={isArchived}
            />
          </section>
        )}

        <div className="mt-8">
          <Link
            to="/hr/projects"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span aria-hidden="true">←</span>
            Back to Projects
          </Link>
        </div>
      </div>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Project Details"
        size="lg"
      >
        <form onSubmit={handleSaveDetails} className="space-y-5">
          <div>
            <label
              htmlFor="project-name"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Project Name
            </label>
            <input
              id="project-name"
              type="text"
              value={editValues.name}
              onChange={(event) =>
                setEditValues((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              maxLength={150}
              required
              className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="project-category"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Project Category
            </label>
            <select
              id="project-category"
              value={editValues.category}
              onChange={(event) =>
                setEditValues((previous) => ({
                  ...previous,
                  category: event.target.value,
                }))
              }
              required
              className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:text-sm"
            >
              <option value="Main Project">Main Project</option>
              <option value="Intern-Based">Intern-Based</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="project-description"
              className="mb-2 block text-sm font-medium text-slate-200"
            >
              Description
            </label>
            <textarea
              id="project-description"
              value={editValues.description}
              onChange={(event) =>
                setEditValues((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
              rows={5}
              maxLength={5000}
              required
              className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base leading-6 text-white outline-none transition-colors placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 sm:text-sm"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              disabled={actionLoading}
              className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={actionLoading}
              className="min-h-11 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={archiveDialogOpen}
        title="Archive Project"
        message={`Are you sure you want to archive "${project.name}"? Project history and timeline entries will be preserved.`}
        confirmText="Archive Project"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleArchive}
        onCancel={() => setArchiveDialogOpen(false)}
      />

      <ConfirmDialog
        isOpen={restoreDialogOpen}
        title="Restore Project"
        message={`Restore "${project.name}"? It will be marked as published again.`}
        confirmText="Restore Project"
        cancelText="Cancel"
        variant="primary"
        loading={actionLoading}
        onConfirm={handleRestore}
        onCancel={() => setRestoreDialogOpen(false)}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Project Permanently"
        message={`Are you sure you want to permanently delete "${project.name}"? This action cannot be undone.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!actionLoading) setDeleteDialogOpen(false);
        }}
      />
    </div>
  );
}