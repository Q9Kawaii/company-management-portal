import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../hooks/useNotifications';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import UserForm from '../../components/users/UserForm';
import DeactivateUserDialog from '../../components/users/DeactivateUserDialog';

function normalizeUser(profile) {
  return {
    ...profile,
    userId: profile.user_id ?? profile.userId ?? '',
    name: profile.name ?? '',
    email: profile.email ?? '',
    role: profile.role ?? '',
    department: profile.department ?? '',
    isActive: profile.is_active ?? profile.isActive ?? true,
    createdAt: profile.created_at ?? profile.createdAt ?? null,
    updatedAt: profile.updated_at ?? profile.updatedAt ?? null,
  };
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

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function DetailRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="break-words text-sm font-medium text-slate-100 sm:col-span-2">
        {value || '—'}
      </dd>
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        active
          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
          : 'border-slate-600 bg-slate-800 text-slate-300'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          active ? 'bg-emerald-400' : 'bg-slate-400'
        }`}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export default function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotifications();

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [deactivationOpen, setDeactivationOpen] = useState(false);

  const loadUserDetails = useCallback(async () => {
    if (!id) {
      setPageError('No user ID was provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError('');

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(
          'id, user_id, name, email, role, department, is_active, created_at, updated_at'
        )
        .eq('id', id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        setUser(null);
        setProjects([]);
        setPageError('User not found or you do not have permission to view this account.');
        return;
      }

      const normalizedUser = normalizeUser(profile);
      setUser(normalizedUser);

      const { data: memberships, error: membershipError } = await supabase
        .from('project_members')
        .select('project_id, projects(id, name, category, status, created_at)')
        .eq('user_id', profile.id);

      if (membershipError) {
        console.error('Unable to load project memberships:', membershipError);
        setProjects([]);
      } else {
        const memberProjects = (memberships || [])
          .map((membership) => membership.projects)
          .filter(Boolean);

        const { data: ledProjects, error: leadProjectsError } = await supabase
          .from('projects')
          .select('id, name, category, status, created_at')
          .eq('lead_id', profile.id);

        if (leadProjectsError) {
          console.error('Unable to load lead projects:', leadProjectsError);
        }

        const allProjects = [
          ...memberProjects,
          ...(ledProjects || []),
        ];

        const uniqueProjects = Array.from(
          new Map(allProjects.map((project) => [project.id, project])).values()
        );

        setProjects(
          uniqueProjects.sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime()
          )
        );
      }
    } catch (err) {
      console.error('Failed to load user details:', err);
      setPageError(err.message || 'Unable to load user details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUserDetails();
  }, [loadUserDetails]);

  const handleSave = async (values) => {
    if (!user) return;

    setSaving(true);

    try {
      const name = String(values.name || '').trim();
      const email = String(values.email || '').trim().toLowerCase();
      const department = String(values.department || '').trim();

      if (!name || !email) {
        throw new Error('Name and email are required.');
      }

      if (values.role && values.role !== user.role) {
        throw new Error('Changing a user role from this page is not supported.');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name,
          email,
          department: department || null,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      success('User details updated successfully.');
      setEditOpen(false);
      await loadUserDetails();
    } catch (err) {
      console.error('Failed to update user:', err);
      notifyError(err.message || 'Unable to update user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async ({ user: targetUser, reason }) => {
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', targetUser.id);

      if (updateError) throw updateError;

      setDeactivationOpen(false);

      success(
        reason?.trim()
          ? `User deactivated. Reason: ${reason.trim()}`
          : 'User deactivated successfully.'
      );

      await loadUserDetails();
    } catch (err) {
      console.error('Failed to deactivate user:', err);
      notifyError(err.message || 'Unable to deactivate user.');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      `Reactivate the account for ${user.name || user.userId}?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', user.id);

      if (updateError) throw updateError;

      success('User reactivated successfully.');
      await loadUserDetails();
    } catch (err) {
      console.error('Failed to reactivate user:', err);
      notifyError(err.message || 'Unable to reactivate user.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" label="Loading user details..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 px-6 py-12 text-center shadow-xl shadow-black/10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
          👤
        </div>
        <h1 className="text-xl font-bold text-white">User unavailable</h1>
        <p className="mt-2 break-words text-sm text-slate-400">
          {pageError || 'This account could not be found.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="mt-6 min-h-11 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const active = user.isActive !== false;

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 space-y-6 text-slate-200">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <Link
              to="/admin"
              className="transition hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Dashboard
            </Link>
            <span>/</span>
            <Link
              to="/admin/employees"
              className="transition hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Users
            </Link>
            <span>/</span>
            <span className="break-all text-slate-300">
              {user.userId || 'User details'}
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            User Details
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            View account information, project assignments, and access status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:self-auto"
        >
          ← Back
        </button>
      </header>

      {pageError && (
        <div
          role="alert"
          className="break-words rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200"
        >
          {pageError}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-xl shadow-black/10">
        <div className="bg-slate-900 px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/15 text-xl font-bold text-indigo-200">
              {getInitials(user.name)}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="break-words text-2xl font-bold">
                {user.name || 'Unnamed user'}
              </h2>
              <p className="mt-1 break-all text-sm text-slate-300">
                {user.email || 'No email address'}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                  {user.role || 'Unassigned role'}
                </span>
                <span className="break-all rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                  {user.userId || 'No user ID'}
                </span>
              </div>
            </div>

            <div className="self-start sm:self-center">
              <StatusBadge active={active} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-b border-slate-700/80 px-6 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="min-h-11 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Edit Details
          </button>

          {active ? (
            <button
              type="button"
              onClick={() => setDeactivationOpen(true)}
              className="min-h-11 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Deactivate Account
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleReactivate}
              className="min-h-11 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reactivate Account
            </button>
          )}
        </div>

        <div className="p-5 sm:p-8">
          <h3 className="mb-4 text-base font-bold text-white">
            Account information
          </h3>

          <dl className="divide-y divide-slate-700/70 overflow-hidden rounded-xl border border-slate-700">
            <DetailRow label="Full name" value={user.name} />
            <DetailRow label="User ID" value={user.userId} />
            <DetailRow label="Email address" value={user.email} />
            <DetailRow label="Role" value={user.role} />
            <DetailRow label="Department" value={user.department} />
            <DetailRow label="Account status" value={active ? 'Active' : 'Inactive'} />
            <DetailRow label="Created at" value={formatDate(user.createdAt)} />
            <DetailRow label="Last updated" value={formatDate(user.updatedAt)} />
          </dl>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-xl shadow-black/10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 px-5 py-4 sm:px-8">
          <div>
            <h2 className="text-base font-bold text-white">Project history</h2>
            <p className="mt-1 text-sm text-slate-400">
              Projects where this user is a member or team lead.
            </p>
          </div>

          <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-sm font-semibold text-indigo-200">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-xl">
              📁
            </div>
            <h3 className="text-sm font-semibold text-white">
              No project assignments
            </h3>
            <p className="mx-auto mt-1 max-w-xl text-sm text-slate-400">
              This user is not currently listed as a member or lead of any accessible projects.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/70">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex min-w-0 flex-col gap-3 px-5 py-4 transition hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between sm:px-8"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-lg">
                    📂
                  </div>

                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-slate-100">
                      {project.name || 'Untitled project'}
                    </h3>
                    <p className="mt-1 break-words text-xs text-slate-400">
                      {project.category || 'Uncategorized'} · Created{' '}
                      {formatDate(project.created_at)}
                    </p>
                  </div>
                </div>

                <span
                  className={`self-start rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    String(project.status || '').toLowerCase() === 'completed'
                      ? 'border-violet-400/30 bg-violet-500/15 text-violet-200'
                      : ['published', 'active', 'in_progress'].includes(
                            String(project.status || '').toLowerCase()
                          )
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                        : String(project.status || '').toLowerCase() === 'archived'
                          ? 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                          : 'border-slate-600 bg-slate-800 text-slate-300'
                  }`}
                >
                  {(project.status || 'draft').replaceAll('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={editOpen}
        onClose={() => {
          if (!saving) setEditOpen(false);
        }}
        title="Edit User Details"
        size="lg"
      >
        <UserForm
          initialValues={user}
          onSubmit={handleSave}
          onCancel={() => setEditOpen(false)}
          loading={saving}
          submitText="Save Changes"
          allowedRoles={[user.role]}
          isEditing
        />
      </Modal>

      <DeactivateUserDialog
        isOpen={deactivationOpen}
        user={user}
        loading={saving}
        onCancel={() => {
          if (!saving) setDeactivationOpen(false);
        }}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}