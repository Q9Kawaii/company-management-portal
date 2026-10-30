import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../hooks/useNotifications';
import UserTable from '../../components/users/UserTable';
import UserSearch from '../../components/users/UserSearch';
import UserForm from '../../components/users/UserForm';
import DeactivateUserDialog from '../../components/users/DeactivateUserDialog';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PAGE_SIZE = 10;

function normalizeUser(profile) {
  return {
    ...profile,
    userId: profile.user_id ?? profile.userId ?? '',
    name: profile.name ?? '',
    email: profile.email ?? '',
    role: profile.role ?? 'HR',
    department: profile.department ?? '',
    isActive: profile.is_active ?? profile.isActive ?? true,
    createdAt: profile.created_at ?? profile.createdAt ?? null,
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

export default function ManageHR() {
  const { success, error: notifyError } = useNotifications();

  const [hrUsers, setHrUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deactivationTarget, setDeactivationTarget] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [searchResults, setSearchResults] = useState(null);

  const loadHRUsers = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select(
          'id, user_id, name, email, role, department, is_active, created_at'
        )
        .eq('role', 'HR')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const normalized = (data || []).map(normalizeUser);

      setHrUsers(normalized);
      setFilteredUsers(normalized);
      setSearchResults(null);
    } catch (err) {
      console.error('Failed to load HR users:', err);
      setPageError(err.message || 'Unable to load HR accounts.');
      notifyError(err.message || 'Unable to load HR accounts.');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    loadHRUsers();
  }, [loadHRUsers]);

  const displayedUsers = useMemo(
    () => searchResults ?? filteredUsers,
    [searchResults, filteredUsers]
  );

  const activeCount = hrUsers.filter((user) => user.isActive !== false).length;
  const inactiveCount = hrUsers.length - activeCount;

  const handleAdd = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleSave = async (values) => {
    setSaving(true);

    try {
      const name = String(values.name || '').trim();
      const email = String(values.email || '').trim().toLowerCase();
      const department = String(values.department || '').trim();

      if (!name || !email) {
        throw new Error('Name and email are required.');
      }

      if (editingUser) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            name,
            email,
            department: department || null,
          })
          .eq('id', editingUser.id)
          .eq('role', 'HR');

        if (updateError) throw updateError;

        success('HR account updated successfully.');
      } else {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!sessionData?.session) {
          throw new Error('Your session has expired. Please sign in again.');
        }

        const { data, error: functionError } =
          await supabase.functions.invoke('create-user', {
            body: {
              name,
              email,
              department: department || null,
              role: 'HR',
              password: values.password || undefined,
            },
          });

        if (functionError) throw functionError;
        if (data?.error) throw new Error(data.error);

        success('HR account created successfully.');
      }

      setFormOpen(false);
      setEditingUser(null);
      await loadHRUsers();
    } catch (err) {
      console.error('Failed to save HR account:', err);
      notifyError(err.message || 'Unable to save HR account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async ({ user, reason }) => {
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', user.id)
        .eq('role', 'HR');

      if (updateError) throw updateError;

      setDeactivationTarget(null);

      success(
        reason?.trim()
          ? `HR account deactivated. Reason: ${reason.trim()}`
          : 'HR account deactivated successfully.'
      );

      await loadHRUsers();
    } catch (err) {
      console.error('Failed to deactivate HR account:', err);
      notifyError(err.message || 'Unable to deactivate HR account.');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (user) => {
    const confirmed = window.confirm(
      `Reactivate the HR account for ${user.name || user.userId}?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', user.id)
        .eq('role', 'HR');

      if (updateError) throw updateError;

      success('HR account reactivated successfully.');
      await loadHRUsers();
    } catch (err) {
      console.error('Failed to reactivate HR account:', err);
      notifyError(err.message || 'Unable to reactivate HR account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    notifyError(
      'Permanent deletion is disabled to preserve project history. Deactivate the HR account instead.'
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 text-slate-200">
      <header className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <Link
              to="/admin"
              className="transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Dashboard
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-200">HR Management</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Manage HR
          </h1>

          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-slate-400">
            Create HR accounts, update details, and manage access to the portal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
        >
          <span className="text-lg leading-none" aria-hidden="true">+</span>
          Add HR Account
        </button>
      </header>

      {pageError && (
        <div
          role="alert"
          className="flex min-w-0 flex-col gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="min-w-0 break-words">{pageError}</p>
          <button
            type="button"
            onClick={loadHRUsers}
            className="min-h-11 shrink-0 rounded-lg px-3 font-semibold text-red-300 underline underline-offset-2 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
        <div className="break-inside-avoid rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-400">Total HR accounts</p>
          <p className="mt-2 text-3xl font-bold text-white">{hrUsers.length}</p>
          <p className="mt-1 text-xs text-slate-400">All registered HR users</p>
        </div>

        <div className="break-inside-avoid rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
          <p className="text-sm font-medium text-emerald-200">Active accounts</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-emerald-200/80">Currently active</p>
        </div>

        <div className="break-inside-avoid rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-400">Inactive accounts</p>
          <p className="mt-2 text-3xl font-bold text-slate-200">
            {inactiveCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">Access marked inactive</p>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-white">Search HR accounts</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Find users by name, user ID, email, or department.
          </p>
        </div>

        <UserSearch
          users={hrUsers}
          onResults={setSearchResults}
          placeholder="Search HR accounts..."
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/70 pt-4">
          <p className="text-sm text-slate-400">
            Showing{' '}
            <span className="font-semibold text-white">
              {displayedUsers.length}
            </span>{' '}
            of {hrUsers.length} HR accounts
          </p>

          <button
            type="button"
            onClick={loadHRUsers}
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            {loading ? (
              'Refreshing...'
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 7v5h-5M4 17v-5h5"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3"
                  />
                </svg>
                Refresh list
              </>
            )}
          </button>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-700/70 px-5 py-4 sm:px-6">
          <h2 className="text-base font-bold text-white">HR directory</h2>
          <p className="mt-1 break-words text-sm leading-6 text-slate-400">
            View account details, edit profiles, or deactivate and reactivate access.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center p-5">
            <LoadingSpinner label="Loading HR accounts..." />
          </div>
        ) : (
          <UserTable
            users={displayedUsers}
            loading={saving}
            onView={setViewUser}
            onEdit={handleEdit}
            onDeactivate={setDeactivationTarget}
            onReactivate={handleReactivate}
            onDelete={handleDelete}
            pageSize={PAGE_SIZE}
            emptyMessage="No HR accounts found. Add an HR account to get started."
          />
        )}
      </section>

      <Modal
        isOpen={formOpen}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setEditingUser(null);
          }
        }}
        title={editingUser ? 'Edit HR Account' : 'Add HR Account'}
        size="lg"
      >
        <UserForm
          initialValues={editingUser || { role: 'HR' }}
          onSubmit={handleSave}
          onCancel={() => {
            if (!saving) {
              setFormOpen(false);
              setEditingUser(null);
            }
          }}
          loading={saving}
          submitText={editingUser ? 'Save Changes' : 'Create HR Account'}
          allowedRoles={['HR']}
          isEditing={Boolean(editingUser)}
        />
      </Modal>

      <DeactivateUserDialog
        isOpen={Boolean(deactivationTarget)}
        user={deactivationTarget}
        loading={saving}
        onCancel={() => {
          if (!saving) setDeactivationTarget(null);
        }}
        onConfirm={handleDeactivate}
      />

      <Modal
        isOpen={Boolean(viewUser)}
        onClose={() => setViewUser(null)}
        title="HR Account Details"
        size="md"
      >
        {viewUser && (
          <div className="min-w-0 space-y-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/15 text-lg font-bold text-indigo-200">
                {getInitials(viewUser.name)}
              </div>

              <div className="min-w-0">
                <h3 className="break-words text-lg font-bold text-white">
                  {viewUser.name || 'Unnamed user'}
                </h3>
                <p className="break-words text-sm text-slate-400">
                  {viewUser.userId || 'No user ID'}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900">
              {[
                ['Email', viewUser.email || '—'],
                ['Role', viewUser.role || 'HR'],
                ['Department', viewUser.department || '—'],
                [
                  'Account status',
                  viewUser.isActive === false ? 'Inactive' : 'Active',
                ],
                [
                  'Created',
                  viewUser.createdAt
                    ? new Date(viewUser.createdAt).toLocaleDateString('en-IN')
                    : '—',
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-1 gap-1 border-b border-slate-700/70 px-4 py-3 text-sm last:border-b-0 sm:grid-cols-3 sm:gap-3"
                >
                  <span className="text-slate-400">{label}</span>
                  <span
                    className={`break-words font-medium sm:col-span-2 ${
                      label === 'Account status'
                        ? viewUser.isActive === false
                          ? 'text-red-300'
                          : 'text-emerald-300'
                        : 'text-slate-100'
                    }`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewUser(null)}
                className="min-h-11 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}