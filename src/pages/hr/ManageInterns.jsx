import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../hooks/useNotifications';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import UserForm from '../../components/users/UserForm';
import UserTable from '../../components/users/UserTable';
import UserSearch from '../../components/users/UserSearch';
import DeactivateUserDialog from '../../components/users/DeactivateUserDialog';

const INITIAL_FORM = {
  name: '',
  email: '',
  role: 'Intern',
  department: '',
  password: '',
};

const normalizeUser = (user) => ({
  ...user,
  userId: user.user_id,
  isActive: user.is_active,
});

export default function ManageInterns() {
  const notifications = useNotifications();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deactivatingUser, setDeactivatingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formValues, setFormValues] = useState(INITIAL_FORM);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(
          'id, user_id, name, email, role, department, is_active, created_at'
        )
        .eq('role', 'Intern')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const normalized = (data || []).map(normalizeUser);

      setUsers(normalized);
      setFilteredUsers(normalized);
    } catch (fetchError) {
      console.error('Failed to load interns:', fetchError);
      setError(fetchError.message || 'Unable to load interns.');
      notifications.error('Unable to load interns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.is_active !== false).length;
    const inactive = users.length - active;

    return {
      total: users.length,
      active,
      inactive,
    };
  }, [users]);

  const openCreateForm = () => {
    setEditingUser(null);
    setFormValues(INITIAL_FORM);
    setFormOpen(true);
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setFormValues({
      name: user.name || '',
      email: user.email || '',
      role: 'Intern',
      department: user.department || '',
      password: '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;

    setFormOpen(false);
    setEditingUser(null);
    setFormValues(INITIAL_FORM);
  };

  const handleSaveUser = async (values) => {
    setSaving(true);

    try {
      if (editingUser) {
        const updates = {
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          department: values.department.trim() || null,
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', editingUser.id)
          .eq('role', 'Intern');

        if (updateError) throw updateError;

        notifications.success('Intern details updated successfully.');
      } else {
        const { data, error: functionError } =
          await supabase.functions.invoke('create-user', {
            body: {
              name: values.name.trim(),
              email: values.email.trim().toLowerCase(),
              role: 'Intern',
              department: values.department.trim() || null,
              password: values.password,
            },
          });

        if (functionError) throw functionError;

        if (data?.error) {
          throw new Error(data.error);
        }

        notifications.success(
          data?.user?.user_id
            ? `Intern created successfully. User ID: ${data.user.user_id}`
            : 'Intern created successfully.'
        );
      }

      setFormOpen(false);
      setEditingUser(null);
      setFormValues(INITIAL_FORM);
      await loadUsers();
    } catch (saveError) {
      console.error('Failed to save intern:', saveError);
      notifications.error(
        saveError.message || 'Unable to save intern details.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async ({ user, isActive, reason }) => {
    if (!user?.id) return;

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', user.id)
        .eq('role', 'Intern');

      if (updateError) throw updateError;

      setDeactivatingUser(null);

      notifications.success(
        isActive
          ? `${user.name || 'Intern'} has been reactivated.`
          : `${user.name || 'Intern'} has been deactivated.`
      );

      if (reason?.trim()) {
        console.info('Intern status change reason:', reason.trim());
      }

      await loadUsers();
    } catch (statusError) {
      console.error('Failed to update intern status:', statusError);
      notifications.error(
        statusError.message || 'Unable to update intern status.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (user) => {
    await handleToggleStatus({
      user,
      isActive: true,
      reason: '',
    });
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
  };

  const handleSearchResults = (results) => {
    setFilteredUsers(results);
  };

  if (loading && users.length === 0) {
    return <LoadingSpinner fullScreen label="Loading interns..." />;
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto min-w-0 max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          <Link to="/hr" className="transition-colors hover:text-indigo-300">
            Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200">Manage Interns</span>
        </div>

        <header className="mb-8 flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-indigo-300">
              Human Resources
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Manage Interns
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Add interns, update their information and manage their portal
              access.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
                d="M12 5v14M5 12h14"
              />
            </svg>
            Add Intern
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 flex min-w-0 flex-col gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="break-words text-sm text-red-200">{error}</p>
            <button
              type="button"
              onClick={loadUsers}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-red-400/30 px-4 py-2 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Try Again
            </button>
          </div>
        )}

        <section className="mb-8 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-5 transition-colors hover:border-slate-600">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-300">Total Interns</p>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
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
                    d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                  />
                </svg>
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-white">
              {stats.total}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              All registered interns
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-emerald-400/25 bg-slate-900 p-5 transition-colors hover:border-emerald-400/40">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-emerald-200">
                Active Interns
              </p>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
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
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-white">
              {stats.active}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Currently allowed portal access
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-red-400/25 bg-slate-900 p-5 transition-colors hover:border-red-400/40 sm:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-red-200">
                Inactive Interns
              </p>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-400/30 bg-red-500/15 text-red-300">
                <svg
                  className="h-5 w-5"
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
                    d="m9 9 6 6m0-6-6 6"
                  />
                </svg>
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-white">
              {stats.inactive}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Portal access deactivated
            </p>
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 shadow-xl shadow-black/10">
          <div className="flex min-w-0 flex-col gap-5 border-b border-slate-700/70 p-4 sm:p-6">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">
                  Intern Directory
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Search interns by name, user ID, email or department.
                </p>
              </div>

              <button
                type="button"
                onClick={loadUsers}
                disabled={loading}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:self-auto"
              >
                <svg
                  className={`h-4 w-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`}
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
                Refresh
              </button>
            </div>

            <UserSearch
              users={users}
              onResults={handleSearchResults}
              placeholder="Search by name, user ID, email or department..."
              filters
            />
          </div>

          <div className="min-w-0 p-4 sm:p-6">
            <UserTable
              users={filteredUsers}
              loading={loading}
              onView={handleViewUser}
              onEdit={openEditForm}
              onDeactivate={(user) => setDeactivatingUser(user)}
              onReactivate={handleReactivate}
              pageSize={10}
              emptyMessage="No interns match your search."
            />
          </div>
        </section>

        <div className="mt-8">
          <Link
            to="/hr"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-slate-400 transition-colors hover:text-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span aria-hidden="true">←</span>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editingUser ? 'Edit Intern' : 'Add New Intern'}
        size="lg"
      >
        <UserForm
          initialValues={formValues}
          isEditing={Boolean(editingUser)}
          allowedRoles={['Intern']}
          loading={saving}
          submitText={editingUser ? 'Save Changes' : 'Create Intern'}
          onCancel={closeForm}
          onSubmit={handleSaveUser}
        />
      </Modal>

      <DeactivateUserDialog
        isOpen={Boolean(deactivatingUser)}
        user={deactivatingUser}
        loading={saving}
        onCancel={() => {
          if (!saving) setDeactivatingUser(null);
        }}
        onConfirm={handleToggleStatus}
      />

      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title="Intern Details"
        size="md"
      >
        {selectedUser && (
          <div className="min-w-0 space-y-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/15 text-lg font-bold text-indigo-200">
                {(selectedUser.name || selectedUser.userId || '?')
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>

              <div className="min-w-0">
                <h3 className="break-words text-lg font-semibold text-white">
                  {selectedUser.name || 'Unnamed intern'}
                </h3>
                <p className="mt-1 break-words text-sm text-slate-400">
                  {selectedUser.userId || 'User ID unavailable'}
                </p>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-950/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Email
                </p>
                <p className="mt-2 break-all text-sm text-slate-200">
                  {selectedUser.email || '—'}
                </p>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-950/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Department
                </p>
                <p className="mt-2 break-words text-sm text-slate-200">
                  {selectedUser.department || '—'}
                </p>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-950/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Role
                </p>
                <p className="mt-2 text-sm text-slate-200">Intern</p>
              </div>

              <div className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-950/60 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Account Status
                </p>
                <p
                  className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-medium ${
                    selectedUser.is_active !== false
                      ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                      : 'border-red-400/30 bg-red-500/15 text-red-200'
                  }`}
                >
                  {selectedUser.is_active !== false ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-700/70 pt-4">
              <button
                type="button"
                onClick={() => {
                  const userToEdit = selectedUser;
                  setSelectedUser(null);
                  openEditForm(userToEdit);
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Edit Intern
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}