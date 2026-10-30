import { useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 10;

export default function UserTable({
  users = [],
  loading = false,
  onView,
  onEdit,
  onDeactivate,
  onReactivate,
  onDelete,
  pageSize = DEFAULT_PAGE_SIZE,
  emptyMessage = 'No users found.',
  className = '',
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const first = String(a[sortBy] ?? '').toLowerCase();
      const second = String(b[sortBy] ?? '').toLowerCase();

      const result = first.localeCompare(second, undefined, {
        numeric: true,
        sensitivity: 'base',
      });

      return sortDirection === 'asc' ? result : -result;
    });
  }, [users, sortBy, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedUsers = sortedUsers.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }

    setCurrentPage(1);
  };

  const sortIndicator = (field) => {
    if (sortBy !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getUserName = (user) =>
    user.name || user.fullName || 'Unnamed User';

  const getUserId = (user) =>
    user.userId || user.user_id || user.employeeId || '—';

  const isActive = (user) =>
    user.isActive !== false && user.is_active !== false;

  const formatDate = (date) => {
    if (!date) return '—';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return '—';

    return parsedDate.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderSortButton = (label, field) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      aria-label={`Sort by ${label}`}
      className="inline-flex items-center gap-1.5 rounded-md font-semibold text-slate-300 transition-colors hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
    >
      {label}
      <span className="text-xs text-slate-400" aria-hidden="true">
        {sortIndicator(field)}
      </span>
    </button>
  );

  if (loading) {
    return (
      <div
        className={`overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 ${className}`}
      >
        <div
          role="status"
          className="flex items-center justify-center gap-3 py-16 text-sm text-slate-300"
        >
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400 motion-reduce:animate-none" />
          Loading users...
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-w-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 ${className}`}
    >
      <div className="flex flex-col gap-2 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">
            User Directory
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {users.length} {users.length === 1 ? 'user' : 'users'} total
          </p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800">
            <svg
              className="h-6 w-6 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m16-13a4 4 0 110 8m4 5v-2a4 4 0 00-3-3.87M9 11a4 4 0 100-8 4 4 0 000 8z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-200">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-800/70">
                <tr>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-5 py-3 text-left text-xs text-slate-400"
                  >
                    {renderSortButton('User', 'name')}
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-5 py-3 text-left text-xs text-slate-400"
                  >
                    {renderSortButton('User ID', 'userId')}
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-5 py-3 text-left text-xs text-slate-400"
                  >
                    {renderSortButton('Role', 'role')}
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold text-slate-400"
                  >
                    Department
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-5 py-3 text-left text-xs font-semibold text-slate-400"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-5 py-3 text-left text-xs text-slate-400"
                  >
                    {renderSortButton('Joined', 'createdAt')}
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-5 py-3 text-right text-xs font-semibold text-slate-400"
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {paginatedUsers.map((user) => {
                  const active = isActive(user);
                  const name = getUserName(user);
                  const userKey = user.id || user.userId || user.user_id;

                  return (
                    <tr
                      key={userKey}
                      className={`transition-colors hover:bg-slate-800/70 motion-reduce:transition-none ${
                        !active ? 'bg-slate-800/30' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/15 text-sm font-semibold text-indigo-200">
                            {name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p
                              className={`max-w-[220px] truncate text-sm font-medium ${
                                active ? 'text-white' : 'text-slate-400'
                              }`}
                            >
                              {name}
                            </p>
                            <p className="max-w-[220px] truncate text-xs text-slate-400">
                              {user.email || 'No email address'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                        {getUserId(user)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                            user.role === 'Admin'
                              ? 'border-violet-400/30 bg-violet-500/15 text-violet-200'
                              : user.role === 'HR'
                                ? 'border-sky-400/30 bg-sky-500/15 text-sky-200'
                                : user.role === 'Intern'
                                  ? 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                                  : 'border-slate-600 bg-slate-800 text-slate-300'
                          }`}
                        >
                          {user.role || '—'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                        {user.department || '—'}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                            active
                              ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                              : 'border-red-400/30 bg-red-500/15 text-red-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              active ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                          />
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-400">
                        {formatDate(user.createdAt || user.created_at)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onView && (
                            <button
                              type="button"
                              onClick={() => onView(user)}
                              className="min-h-11 rounded-lg px-3 py-2 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
                            >
                              View
                            </button>
                          )}

                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(user)}
                              className="min-h-11 rounded-lg px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
                            >
                              Edit
                            </button>
                          )}

                          {active && onDeactivate && (
                            <button
                              type="button"
                              onClick={() => onDeactivate(user)}
                              className="min-h-11 rounded-lg px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 motion-reduce:transition-none"
                            >
                              Deactivate
                            </button>
                          )}

                          {!active && onReactivate && (
                            <button
                              type="button"
                              onClick={() => onReactivate(user)}
                              className="min-h-11 rounded-lg px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
                            >
                              Reactivate
                            </button>
                          )}

                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(user)}
                              className="min-h-11 rounded-lg px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 motion-reduce:transition-none"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-sm text-slate-400">
              Showing{' '}
              <span className="font-medium text-slate-200">
                {(safePage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium text-slate-200">
                {Math.min(safePage * pageSize, sortedUsers.length)}
              </span>{' '}
              of{' '}
              <span className="font-medium text-slate-200">
                {sortedUsers.length}
              </span>{' '}
              users
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safePage === 1}
                className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
              >
                Previous
              </button>

              <span className="px-2 text-sm text-slate-300">
                Page {safePage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={safePage === totalPages}
                className="min-h-11 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}