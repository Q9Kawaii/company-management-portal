import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProjectReview from '../../components/projects/ProjectReview';
import ProjectPublishDialog from '../../components/projects/ProjectPublishDialog';

export default function ProjectReviewPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const notifications = useNotifications();

  const [project, setProject] = useState(null);
  const [lead, setLead] = useState(null);
  const [members, setMembers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const loadReviewData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      notifications.error('Project ID is missing.');
      return;
    }

    setLoading(true);

    try {
      const [
        { data: projectData, error: projectError },
        { data: peopleData, error: peopleError },
        { data: membershipData, error: membershipError },
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .maybeSingle(),

        supabase
          .from('profiles')
          .select(
            'id, user_id, name, email, role, department, is_active'
          )
          .in('role', ['Employee', 'Intern'])
          .eq('is_active', true)
          .order('name'),

        supabase
          .from('project_members')
          .select('*')
          .eq('project_id', projectId),
      ]);

      if (projectError) throw projectError;
      if (peopleError) throw peopleError;
      if (membershipError) throw membershipError;

      if (!projectData) {
        notifications.error('Project not found.');
        navigate('/hr/projects', { replace: true });
        return;
      }

      const normalizedProject = {
        ...projectData,
        leadId: projectData.lead_id,
        createdBy: projectData.created_by,
        createdAt: projectData.created_at,
      };

      const people = (peopleData || []).map((person) => ({
        ...person,
        userId: person.user_id,
        isActive: person.is_active,
      }));

      const leadId = projectData.lead_id;
      const leadPerson = people.find(
        (person) => person.id === leadId || person.user_id === leadId
      );

      const memberships = membershipData || [];
      const memberIds = memberships.map(
        (membership) => membership.user_id || membership.profile_id
      );

      const selectedMembers = people.filter(
        (person) =>
          memberIds.includes(person.id) ||
          memberIds.includes(person.user_id)
      );

      setProject({
        ...normalizedProject,
        members: selectedMembers,
        memberIds: selectedMembers.map((person) => person.id),
      });

      setLead(leadPerson || null);
      setMembers(selectedMembers);
      setEmployees(people.filter((person) => person.role === 'Employee'));
      setInterns(people.filter((person) => person.role === 'Intern'));
    } catch (error) {
      console.error('Failed to load project review:', error);
      notifications.error(
        error.message || 'Unable to load project review.'
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, navigate]);

  useEffect(() => {
    loadReviewData();
  }, [loadReviewData]);

  const handlePublish = async () => {
    if (!project) return;

    setPublishing(true);

    try {
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update({
          status: 'Published',
          published_at: new Date().toISOString(),
          published_by: user?.id || null,
        })
        .eq('id', project.id)
        .eq('status', 'Draft')
        .select()
        .maybeSingle();

      if (updateError) throw updateError;

      if (!updatedProject) {
        throw new Error(
          'This project may already be published or you do not have permission to publish it.'
        );
      }

      if (members.length > 0) {
        const notificationsToInsert = members.map((member) => ({
          user_id: member.id,
          title: 'New project assigned',
          message: `You have been assigned to the project "${project.name}".`,
          type: 'info',
          project_id: project.id,
          is_read: false,
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationsToInsert);

        if (notificationError) {
          console.error(
            'Project published, but notifications could not be created:',
            notificationError
          );
        }
      }

      notifications.success(`"${project.name}" has been published.`);
      setPublishDialogOpen(false);
      navigate('/hr/projects', { replace: true });
    } catch (error) {
      console.error('Failed to publish project:', error);
      notifications.error(error.message || 'Unable to publish project.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen label="Loading project review..." />;
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-2xl border border-slate-700/70 bg-slate-900 p-8 text-center shadow-xl shadow-black/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01"
              />
            </svg>
          </div>
          <h1 className="mt-5 text-xl font-semibold text-white">
            Project not found
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This project may have been deleted or is no longer available.
          </p>
          <Link
            to="/hr/projects"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const isDraft = String(project.status || '').toLowerCase() === 'draft';

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto min-w-0 max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <Link
            to="/hr"
            className="transition-colors hover:text-indigo-300"
          >
            Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <Link
            to="/hr/projects"
            className="transition-colors hover:text-indigo-300"
          >
            Projects
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200">Project Review</span>
        </div>

        <header className="mb-8 flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  isDraft
                    ? 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                    : 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isDraft ? 'bg-amber-300' : 'bg-emerald-300'
                  }`}
                />
                {project.status || 'draft'}
              </span>

              <span className="inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-200">
                {project.category || 'Uncategorized'}
              </span>
            </div>

            <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Review Project
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Verify the project details, team lead and assigned members before
              publishing.
            </p>
          </div>

          <Link
            to="/hr/projects"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span aria-hidden="true">←</span>
            Back to Projects
          </Link>
        </header>

        <div className="min-w-0">
          <ProjectReview
            project={project}
            employees={employees}
            interns={interns}
            members={members}
            lead={lead}
            onBack={() => navigate(-1)}
            onPublish={() => setPublishDialogOpen(true)}
            loading={publishing}
          />
        </div>

        {!isDraft && (
          <div className="mt-6 flex min-w-0 items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 sm:p-5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-500/10 text-amber-200">
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
                  d="M12 9v3m0 4h.01M10.3 4.8 2.9 17.5A1.7 1.7 0 0 0 4.4 20h15.2a1.7 1.7 0 0 0 1.5-2.5L13.7 4.8a2 2 0 0 0-3.4 0Z"
                />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-200">
                Project is not a draft
              </p>
              <p className="mt-1 break-words text-sm leading-6 text-amber-100/80">
                This project is already marked as <strong>{project.status}</strong>.
                Publishing is only available for draft projects.
              </p>
            </div>
          </div>
        )}

        {isDraft && (
          <div className="mt-8 flex flex-col-reverse gap-4 border-t border-slate-800 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm leading-6 text-slate-400">
              Publishing makes this project available to its assigned team.
            </p>

            <button
              type="button"
              onClick={() => setPublishDialogOpen(true)}
              disabled={publishing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
                  d="m5 12 4 4L19 6"
                />
              </svg>
              Publish Project
            </button>
          </div>
        )}
      </div>

      <ProjectPublishDialog
        isOpen={publishDialogOpen}
        project={project}
        members={members}
        loading={publishing}
        onConfirm={handlePublish}
        onCancel={() => {
          if (!publishing) setPublishDialogOpen(false);
        }}
      />
    </div>
  );
}