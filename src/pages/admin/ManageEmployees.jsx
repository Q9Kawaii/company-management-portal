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
    role: profile.role ?? 'Employee',
    department: profile.department ?? '',
    isActive: profile.is_active ?? profile.isActive ?? true,
    createdAt: profile.created_at ?? profile.createdAt ?? null,
  };
}

export default function ManageEmployees() {
  const { success, error: notifyError } = useNotifications();

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');

  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deactivationTarget, setDeactivationTarget] = useState(null);
  const [viewEmployee, setViewEmployee] = useState(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setPageError('');

    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select(
          'id, user_id, name, email, role, department, is_active, created_at'
        )
        .eq('role', 'Employee')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const normalized = (data || []).map(normalizeUser);

      setEmployees(normalized);
      setFilteredEmployees(normalized);
      setSearchResults(null);
    } catch (err) {
      console.error('Failed to load employees:', err);
      setPageError(err.message || 'Unable to load employees.');
      notifyError(err.message || 'Unable to load employees.');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const displayedEmployees = useMemo(
    () => searchResults ?? filteredEmployees,
    [searchResults, filteredEmployees]
  );

  const handleSearchResults = useCallback((results) => {
    setSearchResults(results);
  }, []);

  const handleAdd = () => {
    setEditingEmployee(null);
    setFormOpen(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
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

      if (editingEmployee) {
        const updates = {
          name,
          email,
          department: department || null,
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', editingEmployee.id)
          .eq('role', 'Employee');

        if (updateError) throw updateError;

        success('Employee details updated successfully.');
      } else {
        /*
         * Account creation should be performed by a trusted server-side
         * function that creates the Supabase Auth user and profile.
         * Never create users with the public anon key or store raw passwords.
         */
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData?.session) {
          throw new Error('Your session has expired. Please sign in again.');
        }

        const { data: created, error: createError } = await supabase.functions.invoke(
          'create-user',
          {
            body: {
              name,
              email,
              department: department || null,
              role: 'Employee',
              password: values.password || undefined,
            },
          }
        );

        if (createError) throw createError;

        if (created?.error) {
          throw new Error(created.error);
        }

        success('Employee account created successfully.');
      }

      setFormOpen(false);
      setEditingEmployee(null);
      await loadEmployees();
    } catch (err) {
      console.error('Failed to save employee:', err);
      notifyError(err.message || 'Unable to save employee.');
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
        .eq('role', 'Employee');

      if (updateError) throw updateError;

      setDeactivationTarget(null);
      success(
        reason?.trim()
          ? `Employee deactivated. Reason: ${reason.trim()}`
          : 'Employee deactivated successfully.'
      );

      await loadEmployees();
    } catch (err) {
      console.error('Failed to deactivate employee:', err);
      notifyError(err.message || 'Unable to deactivate employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (employee) => {
    const confirmed = window.confirm(
      `Reactivate ${employee.name || employee.userId}?`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('id', employee.id)
        .eq('role', 'Employee');

      if (updateError) throw updateError;

      success('Employee reactivated successfully.');
      await loadEmployees();
    } catch (err) {
      console.error('Failed to reactivate employee:', err);
      notifyError(err.message || 'Unable to reactivate employee.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (employee) => {
    const confirmed = window.confirm(
      `Permanently delete ${employee.name || employee.userId}? This action may affect historical records and cannot be undone. Deactivation is recommended instead.`
    );

    if (!confirmed) return;

    notifyError(
      'Permanent deletion is disabled to preserve project history. Deactivate the employee instead.'
    );
  };

  const handleView = (employee) => {
    setViewEmployee(employee);
  };

  const activeCount = employees.filter((employee) => employee.isActive !== false).length;
  const inactiveCount = employees.length - activeCount;

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6">
      <header className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <Link
              to="/admin"
              className="rounded-sm transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Dashboard
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-200">Employees</span>
          </div>

          <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Manage Employees
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            Add employee accounts, update details, and manage portal access.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
        >
          <span className="text-lg leading-none">+</span>
          Add Employee
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
            onClick={loadEmployees}
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 font-semibold text-red-300 underline underline-offset-2 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 motion-reduce:transition-none"
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
        <div className="break-inside-avoid rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-300">Total employees</p>
          <p className="mt-2 text-3xl font-bold text-white">{employees.length}</p>
        </div>

        <div className="break-inside-avoid rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5">
          <p className="text-sm font-medium text-emerald-200">Active employees</p>
          <p className="mt-2 text-3xl font-bold text-white">{activeCount}</p>
        </div>

        <div className="break-inside-avoid rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-300">Inactive employees</p>
          <p className="mt-2 text-3xl font-bold text-white">{inactiveCount}</p>
        </div>
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-700/70 bg-slate-900 p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-bold text-white">Find an employee</h2>
          <p className="mt-1 text-sm text-slate-300">
            Search by name, user ID, email, or department.
          </p>
        </div>

        <UserSearch
          users={employees}
          onResults={handleSearchResults}
          placeholder="Search employees..."
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/70 pt-4">
          <p className="text-sm text-slate-300">
            Showing{' '}
            <span className="font-semibold text-white">
              {displayedEmployees.length}
            </span>{' '}
            of {employees.length} employees
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </p>

          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSearchResults(null);
              setFilteredEmployees(employees);
              loadEmployees();
            }}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
          >
            Refresh list
          </button>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">Employee directory</h2>
            <p className="mt-1 text-sm text-slate-300">
              View profiles and manage employee access.
            </p>
          </div>

          <button
            type="button"
            onClick={loadEmployees}
            disabled={loading}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center">
            <LoadingSpinner label="Loading employees..." />
          </div>
        ) : (
          <UserTable
            users={displayedEmployees}
            loading={loading || saving}
            onView={handleView}
            onEdit={handleEdit}
            onDeactivate={(employee) => setDeactivationTarget(employee)}
            onReactivate={handleReactivate}
            onDelete={handleDelete}
            pageSize={PAGE_SIZE}
            emptyMessage="No employees found. Add an employee to get started."
          />
        )}
      </section>

      <Modal
        isOpen={formOpen}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setEditingEmployee(null);
          }
        }}
        title={editingEmployee ? 'Edit Employee' : 'Add Employee'}
        size="lg"
      >
        <UserForm
          initialValues={editingEmployee || { role: 'Employee' }}
          onSubmit={handleSave}
          onCancel={() => {
            setFormOpen(false);
            setEditingEmployee(null);
          }}
          loading={saving}
          submitText={editingEmployee ? 'Save Changes' : 'Create Employee'}
          allowedRoles={['Employee']}
          isEditing={Boolean(editingEmployee)}
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
        isOpen={Boolean(viewEmployee)}
        onClose={() => setViewEmployee(null)}
        title="Employee Details"
        size="md"
      >
        {viewEmployee && (
          <div className="min-w-0 space-y-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/15 text-lg font-bold text-indigo-200">
                {(viewEmployee.name || '?')
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase())
                  .join('')}
              </div>

              <div className="min-w-0">
                <h3 className="break-words text-lg font-bold text-white">
                  {viewEmployee.name || 'Unnamed employee'}
                </h3>
                <p className="break-all text-sm text-slate-300">
                  {viewEmployee.userId || 'No user ID'}
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-700/70 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900">
              {[
                ['Email', viewEmployee.email || '—'],
                ['Role', viewEmployee.role || 'Employee'],
                ['Department', viewEmployee.department || '—'],
                ['Account status', viewEmployee.isActive === false ? 'Inactive' : 'Active'],
                [
                  'Joined',
                  viewEmployee.createdAt
                    ? new Date(viewEmployee.createdAt).toLocaleDateString('en-IN')
                    : '—',
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-1 gap-1 px-4 py-3 text-sm sm:grid-cols-3 sm:gap-3"
                >
                  <span className="text-slate-400">{label}</span>
                  <span className="break-words font-medium text-slate-100 sm:col-span-2">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setViewEmployee(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
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