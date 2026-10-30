import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import ProjectForm from '../../components/projects/ProjectForm';
import ProjectReview from '../../components/projects/ProjectReview';
import ProjectPublishDialog from '../../components/projects/ProjectPublishDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STEPS = [
  { number: 1, title: 'Project Details', description: 'Name, category and description' },
  { number: 2, title: 'Team Setup', description: 'Select the lead and team members' },
  { number: 3, title: 'Review', description: 'Review details before publishing' },
];

const INITIAL_VALUES = {
  name: '',
  category: 'Main Project',
  description: '',
  leadId: '',
  memberIds: [],
};

export default function CreateProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const notifications = useNotifications();

  const [step, setStep] = useState(1);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [people, setPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [createdProject, setCreatedProject] = useState(null);

  const employees = useMemo(
    () => people.filter((person) => person.role === 'Employee'),
    [people]
  );

  const interns = useMemo(
    () => people.filter((person) => person.role === 'Intern'),
    [people]
  );

  const selectedLead = useMemo(
    () => people.find((person) => person.id === values.leadId) || null,
    [people, values.leadId]
  );

  const selectedMembers = useMemo(
    () => people.filter((person) => values.memberIds.includes(person.id)),
    [people, values.memberIds]
  );

  useEffect(() => {
    let active = true;

    async function loadPeople() {
      setLoadingPeople(true);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, name, email, role, department, is_active, assigned')
          .in('role', ['Employee', 'Intern'])
          .eq('is_active', true)
          .eq('assigned', false)
          .order('name', { ascending: true });

        if (error) throw error;

        if (active) {
          setPeople(
            (data || []).map((person) => ({
              id: person.id,
              profileId: person.id,
              userId: person.user_id,
              name: person.name,
              email: person.email,
              role: person.role,
              department: person.department,
              isActive: person.is_active,
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load team members:', error);
        notifications.error('Unable to load employees and interns.');
      } finally {
        if (active) setLoadingPeople(false);
      }
    }

    loadPeople();

    return () => {
      active = false;
    };
  }, []);

  const validateStep = () => {
    if (step === 1) {
      if (!values.name.trim()) {
        notifications.warning('Enter a project name to continue.');
        return false;
      }

      if (!values.category) {
        notifications.warning('Select a project category.');
        return false;
      }

      if (!values.description.trim()) {
        notifications.warning('Enter a project description.');
        return false;
      }
    }

    if (step === 2) {
      if (!values.leadId) {
        notifications.warning('Select a team lead.');
        return false;
      }

      if (values.memberIds.length === 0) {
        notifications.warning('Select at least one team member.');
        return false;
      }

      if (values.memberIds.includes(values.leadId)) {
        notifications.warning('The team lead is already assigned separately.');
        return false;
      }
    }

    return true;
  };

  const handleFormSubmit = (formValues) => {
    setValues((previous) => ({
      ...previous,
      ...formValues,
      leadId: formValues.leadId,
      memberIds: formValues.memberIds || previous.memberIds,
    }));
    setStep(2);
  };

  const handleContinue = () => {
    if (!validateStep()) return;

    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
    }
  };

  const handlePublishRequest = async () => {
    if (!validateStep()) return;

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const idsToCheck = [values.leadId, ...values.memberIds];

    if (idsToCheck.some((id) => !UUID_RE.test(String(id || '')))) {
      notifications.error(
        'Invalid lead or team member ID. Please go back and reselect the team.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const projectPayload = {
        name: values.name.trim(),
        category: values.category,
        description: values.description.trim(),
        lead_id: values.leadId,
        created_by: user?.id,
        status: 'Draft',
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectPayload)
        .select('*')
        .single();

      if (projectError) throw projectError;

      const memberRows = [
        {
          project_id: project.id,
          user_id: values.leadId,
          role: 'Lead',
        },
        ...values.memberIds.map((memberId) => ({
          project_id: project.id,
          user_id: memberId,
          role: 'Member',
        })),
      ];

      const { error: membersError } = await supabase
        .from('project_members')
        .insert(memberRows);

      if (membersError) {
        await supabase.from('projects').delete().eq('id', project.id);
        throw membersError;
      }

      setCreatedProject(project);
      setPublishDialogOpen(true);
    } catch (error) {
      console.error('Project creation failed:', error);
      notifications.error(error.message || 'Unable to create the project.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPublish = async () => {
    if (!createdProject) return;

    setSubmitting(true);

    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .update({
          status: 'Published',
          published_at: new Date().toISOString(),
          published_by: user?.id || null,
        })
        .eq('id', createdProject.id)
        .select('*')
        .single();

      if (projectError) throw projectError;

      // profiles.assigned is kept in sync by a database trigger whenever
      // memberships or project statuses change, so it isn't updated here.
      const recipients = [...new Set([values.leadId, ...values.memberIds])];

      if (recipients.length > 0) {
        const notificationRows = recipients.map((recipientId) => ({
          user_id: recipientId,
          project_id: project.id,
          title: 'New project assigned',
          message: `You have been assigned to "${project.name}".`,
          type: 'info',
          is_read: false,
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationRows);

        if (notificationError) {
          console.error('Notifications could not be created:', notificationError);
        }
      }

      notifications.success('Project published and team members notified.');
      navigate('/hr/projects', { replace: true });
    } catch (error) {
      console.error('Project publishing failed:', error);
      notifications.error(error.message || 'Unable to publish the project.');
    } finally {
      setSubmitting(false);
      setPublishDialogOpen(false);
    }
  };

  if (loadingPeople) {
    return <LoadingSpinner fullScreen label="Loading available team members..." />;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-200 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link
                to="/hr"
                className="transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Dashboard
              </Link>
              <span className="text-slate-600">/</span>
              <Link
                to="/hr/projects"
                className="transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Projects
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-slate-200">Create Project</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Create a Project
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Set up the project, assign a lead and team, then publish it.
            </p>
          </div>

          <Link
            to="/hr/projects"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
          >
            Cancel
          </Link>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-700/70 bg-slate-900 p-4 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-3 sm:gap-4">
            {STEPS.map((item) => {
              const completed = step > item.number;
              const current = step === item.number;

              return (
                <div key={item.number} className="flex min-w-0 items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${
                      completed
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                        : current
                          ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                    }`}
                  >
                    {completed ? '✓' : item.number}
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <p
                      className={`text-sm font-semibold ${
                        current || completed ? 'text-white' : 'text-slate-300'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300 motion-reduce:transition-none"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-900 p-4 sm:p-6 lg:p-8">
          {step === 1 && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">
                  Project Details
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Provide the basic information for this project.
                </p>
              </div>

              <ProjectForm
                initialValues={values}
                users={people}
                loading={submitting}
                submitText="Continue to Team Setup"
                onCancel={() => navigate('/hr/projects')}
                onSubmit={handleFormSubmit}
              />
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Team Setup</h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Choose an employee or intern as the lead, then assign the
                  remaining team members.
                </p>
              </div>

              <ProjectForm
                initialValues={values}
                users={people}
                loading={submitting}
                submitText="Continue to Review"
                onCancel={() => setStep(1)}
                onSubmit={(formValues) => {
                  setValues((previous) => ({
                    ...previous,
                    ...formValues,
                    memberIds: formValues.memberIds || previous.memberIds,
                  }));
                  setStep(3);
                }}
              />

              <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-950 p-4">
                <p className="text-sm font-medium text-slate-200">
                  Available team members
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex min-h-8 items-center rounded-lg border border-sky-400/30 bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-200">
                    {employees.length} Employees
                  </span>
                  <span className="inline-flex min-h-8 items-center rounded-lg border border-violet-400/30 bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-200">
                    {interns.length} Interns
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">
                  Review Project
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Verify the project details and assigned team before publishing.
                </p>
              </div>

              <ProjectReview
                project={{
                  ...values,
                  id: createdProject?.id,
                  name: values.name,
                  category: values.category,
                  description: values.description,
                }}
                employees={employees}
                interns={interns}
                members={selectedMembers}
                lead={selectedLead}
                onBack={() => setStep(2)}
                onPublish={handlePublishRequest}
                loading={submitting}
              />
            </div>
          )}
        </div>
      </div>

      <ProjectPublishDialog
        isOpen={publishDialogOpen}
        project={createdProject || values}
        members={selectedMembers}
        onConfirm={handleConfirmPublish}
        onCancel={() => setPublishDialogOpen(false)}
        loading={submitting}
      />
    </div>
  );
}