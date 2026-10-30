import { useEffect, useState } from 'react';
import SearchBar from '../common/SearchBar';

export default function UserSearch({
  users = [],
  onResults,
  onSelect,
  placeholder = 'Search by name, user ID, email, or role...',
  className = '',
  filters = true,
}) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filteredUsers = users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          user.name,
          user.fullName,
          user.userId,
          user.email,
          user.role,
          user.department,
        ].some((value) =>
          String(value ?? '').toLowerCase().includes(normalizedQuery)
        );

      const matchesRole =
        roleFilter === 'All' ||
        String(user.role ?? '').toLowerCase() === roleFilter.toLowerCase();

      const isActive = user.isActive !== false;
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && isActive) ||
        (statusFilter === 'Inactive' && !isActive);

      return matchesQuery && matchesRole && matchesStatus;
    });

    onResults?.(filteredUsers);
  }, [users, query, roleFilter, statusFilter, onResults]);

  const handleClear = () => {
    setQuery('');
    setRoleFilter('All');
    setStatusFilter('All');
  };

  return (
    <div className={`min-w-0 space-y-4 ${className}`}>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder={placeholder}
        disabled={false}
      />

      {filters && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="user-search-role"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Filter by role
            </label>

            <select
              id="user-search-role"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base text-white outline-none transition-colors focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/30 sm:text-sm motion-reduce:transition-none"
            >
              <option value="All">All roles</option>
              <option value="Admin">Admin</option>
              <option value="HR">HR</option>
              <option value="Employee">Employee</option>
              <option value="Intern">Intern</option>
            </select>
          </div>

          <div className="min-w-0 flex-1">
            <label
              htmlFor="user-search-status"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Filter by status
            </label>

            <select
              id="user-search-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base text-white outline-none transition-colors focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-400/30 sm:text-sm motion-reduce:transition-none"
            >
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {(query || roleFilter !== 'All' || statusFilter !== 'All') && (
            <button
              type="button"
              onClick={handleClear}
              className="min-h-11 self-start rounded-xl px-3 py-2 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:self-auto motion-reduce:transition-none"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {typeof onSelect === 'function' && (
        <div className="min-w-0 space-y-2">
          {users
            .filter((user) => {
              const normalizedQuery = query.trim().toLowerCase();

              const matchesQuery =
                !normalizedQuery ||
                [
                  user.name,
                  user.fullName,
                  user.userId,
                  user.email,
                  user.role,
                  user.department,
                ].some((value) =>
                  String(value ?? '').toLowerCase().includes(normalizedQuery)
                );

              const matchesRole =
                roleFilter === 'All' ||
                String(user.role ?? '').toLowerCase() ===
                  roleFilter.toLowerCase();

              const isActive = user.isActive !== false;
              const matchesStatus =
                statusFilter === 'All' ||
                (statusFilter === 'Active' && isActive) ||
                (statusFilter === 'Inactive' && !isActive);

              return matchesQuery && matchesRole && matchesStatus;
            })
            .map((user) => (
              <button
                key={user.id || user.userId}
                type="button"
                onClick={() => onSelect(user)}
                className="flex min-h-16 w-full min-w-0 items-center gap-3 rounded-2xl border border-slate-700/70 bg-slate-900 p-3 text-left transition-colors hover:border-indigo-400/40 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/15 text-sm font-semibold text-indigo-200">
                  {(user.name || user.fullName || user.userId || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {user.name || user.fullName || 'Unnamed User'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">
                    {user.userId || user.email || 'No user ID'}
                  </p>
                </div>

                {user.role && (
                  <span className="max-w-24 shrink-0 truncate rounded-full border border-indigo-400/25 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-200 sm:max-w-none">
                    {user.role}
                  </span>
                )}

                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    user.isActive === false
                      ? 'bg-red-400'
                      : 'bg-emerald-400'
                  }`}
                  title={user.isActive === false ? 'Inactive' : 'Active'}
                  aria-label={user.isActive === false ? 'Inactive' : 'Active'}
                />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}