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
    role: profile.role ?? 'Intern',
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

export default function ManageInterns() {
  const { success, error: notifyError } = useNotifications();

  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');

  const [searchResults, setSearchResults] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingIntern, setEditingIntern] = useState(null);
  const [deactivationTarget, setDeactivationTarget] = useState(null);
  const [viewIntern, setViewIntern] = useState(null);

  const loadInterns = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select(
          'id, user_id, name, email, role, department, is_active, created_at'
        )
        .eq('role', 'Intern')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      setInterns((data || []).map(normalizeUser));
      setSearchResults(null);
    } catch (err) {
      console.error('Failed to load interns:', err);
      setPageError(err.message || 'Unable to load intern accounts.');
      notifyError(err.message || 'Unable to load intern accounts.');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    loadInterns();
  }, [loadInterns]);

  const displayedInterns = useMemo(
    () => searchResults ?? interns,
    [searchResults, interns]
  );

  const activeCount = interns.filter((intern) => intern.isActive !== false).length;
  const inactiveCount = interns.length - activeCount;

  const handleAdd = () => {
    setEditingIntern(null);
    setFormOpen(true);
  };

  const handleEdit = (intern) => {
    setEditingIntern(intern);
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

      if (editingIntern) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            name,
            email,
            department: department || null,
          })
          .eq('id', editingIntern.id)
          .eq('role', 'Intern');

        if (updateError) throw updateError;

        success('Intern details updated successfully.');
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
              role: 'Intern',
              password: values.password || undefined,
            },
          });

        if (functionError) throw functionError;
        if (data?.error) throw new Error(data.error);

        success('Intern account created successfully.');
      }

      setFormOpen(false);
      setEditingIntern(null);
      await loadInterns();
    } catch (err) {
      console.error('Failed to save intern:', err);
      notifyError(err.message || 'Unable to save intern.');
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
        .eq('role', 'Intern');

      if (updateError) throw updateError;

      setDeactivationTarget(null);

      success(
        reason?.trim()
          ? `Intern deactivated. Reason: ${reason.trim()}`
          : 'Intern deactivated successfully.'
      );

      await loadInterns();
    } catch (err) {
      console.error('Failed to deactivate intern:', err);
      notifyError(err.message || 'Unable to deactivate intern.');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (intern) => {
    const confirmed = window.confirm(
      `Reactivate ${intern.name || intern.userId}?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', intern.id)
        .eq('role', 'Intern');

      if (updateError) throw updateError;

      success('Intern reactivated successfully.');
      await loadInterns();
    } catch (err) {
      console.error('Failed to reactivate intern:', err);
      notifyError(err.message || 'Unable to reactivate intern.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    notifyError(
      'Permanent deletion is disabled to preserve project history. Deactivate the intern instead.'
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
            <span className="text-slate-200">Intern Management</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Manage Interns
          </h1>

          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-slate-400">
            Create intern accounts, update their information, and manage portal access.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
        >
          <span className="text-lg leading-none" aria-hidden="true">+</span>
          Add Intern
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
            onClick={loadInterns}
            className="min-h-11 shrink-0 rounded-lg px-3 font-semibold text-red-300 underline underline-offset-2 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
        <div className="break-inside-avoid rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-400">Total interns</p>
          <p className="mt-2 text-3xl font-bold text-white">{interns.length}</p>
          <p className="mt-1 text-xs text-slate-400">
            All registered intern accounts
          </p>
        </div>

        <div className="break-inside-avoid rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
          <p className="text-sm font-medium text-emerald-200">Active interns</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-emerald-200/80">
            Currently active accounts
          </p>
        </div>

        <div className="break-inside-avoid rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-400">Inactive interns</p>
          <p className="mt-2 text-3xl font-bold text-slate-200">
            {inactiveCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Accounts marked inactive
          </p>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-white">Search interns</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Search by name, user ID, email, or department.
          </p>
        </div>

        <UserSearch
          users={interns}
          onResults={setSearchResults}
          placeholder="Search interns..."
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/70 pt-4">
          <p className="text-sm text-slate-400">
            Showing{' '}
            <span className="font-semibold text-white">
              {displayedInterns.length}
            </span>{' '}
            of {interns.length} interns
          </p>

          <button
            type="button"
            onClick={loadInterns}
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
          <h2 className="text-base font-bold text-white">Intern directory</h2>
          <p className="mt-1 break-words text-sm leading-6 text-slate-400">
            View intern profiles, edit details, and manage account status.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center p-5">
            <LoadingSpinner label="Loading interns..." />
          </div>
        ) : (
          <UserTable
            users={displayedInterns}
            loading={saving}
            onView={setViewIntern}
            onEdit={handleEdit}
            onDeactivate={setDeactivationTarget}
            onReactivate={handleReactivate}
            onDelete={handleDelete}
            pageSize={PAGE_SIZE}
            emptyMessage="No interns found. Add an intern to get started."
          />
        )}
      </section>

      <Modal
        isOpen={formOpen}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setEditingIntern(null);
          }
        }}
        title={editingIntern ? 'Edit Intern' : 'Add Intern'}
        size="lg"
      >
        <UserForm
          initialValues={editingIntern || { role: 'Intern' }}
          onSubmit={handleSave}
          onCancel={() => {
            if (!saving) {
              setFormOpen(false);
              setEditingIntern(null);
            }
          }}
          loading={saving}
          submitText={editingIntern ? 'Save Changes' : 'Create Intern'}
          allowedRoles={['Intern']}
          isEditing={Boolean(editingIntern)}
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
        isOpen={Boolean(viewIntern)}
        onClose={() => setViewIntern(null)}
        title="Intern Details"
        size="md"
      >
        {viewIntern && (
          <div className="min-w-0 space-y-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/30 bg-indigo-500/15 text-lg font-bold text-indigo-200">
                {getInitials(viewIntern.name)}
              </div>

              <div className="min-w-0">
                <h3 className="break-words text-lg font-bold text-white">
                  {viewIntern.name || 'Unnamed intern'}
                </h3>
                <p className="break-words text-sm text-slate-400">
                  {viewIntern.userId || 'No user ID'}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900">
              {[
                ['Email', viewIntern.email || '—'],
                ['Role', viewIntern.role || 'Intern'],
                ['Department', viewIntern.department || '—'],
                [
                  'Account status',
                  viewIntern.isActive === false ? 'Inactive' : 'Active',
                ],
                [
                  'Created',
                  viewIntern.createdAt
                    ? new Date(viewIntern.createdAt).toLocaleDateString('en-IN')
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
                        ? viewIntern.isActive === false
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
                onClick={() => setViewIntern(null)}
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