import { useMemo, useState } from 'react';
import SearchBar from '../common/SearchBar';
import UserTile from '../common/UserTile';

export default function TeamLeadSelector({
  users = [],
  value = '',
  onChange,
  selectedUser,
  allowedRoles = ['Employee', 'Intern'],
  disabled = false,
  className = '',
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const getUserId = (user) =>
    user.userId || user.user_id || user.id || '';

  const getUserName = (user) =>
    user.fullName || user.name || 'Unknown User';

  const normalizedRoles = allowedRoles.map((role) =>
    String(role).toLowerCase()
  );

  const eligibleUsers = useMemo(
    () =>
      users.filter((user) => {
        const role = String(user.role || '').toLowerCase();
        const isActive = user.isActive ?? user.is_active ?? true;

        return (
          isActive !== false &&
          normalizedRoles.includes(role) &&
          user.deactivated_at == null
        );
      }),
    [users, allowedRoles]
  );

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return eligibleUsers;

    return eligibleUsers.filter((user) => {
      const name = getUserName(user).toLowerCase();
      const id = String(getUserId(user)).toLowerCase();
      const role = String(user.role || '').toLowerCase();

      return (
        name.includes(query) ||
        id.includes(query) ||
        role.includes(query)
      );
    });
  }, [eligibleUsers, searchTerm]);

  const selectedId =
    typeof value === 'object' && value !== null
      ? getUserId(value)
      : value || getUserId(selectedUser);

  const currentSelectedUser =
    eligibleUsers.find(
      (user) => String(getUserId(user)) === String(selectedId)
    ) ||
    (selectedUser &&
    String(getUserId(selectedUser)) === String(selectedId)
      ? selectedUser
      : null);

  const handleSelect = (user) => {
    if (disabled) return;

    const id = getUserId(user);
    onChange?.(id, user);
  };

  return (
    <section className={`min-w-0 space-y-4 ${className}`}>
      {/* Heading */}
      <div>
        <h3 className="text-base font-semibold text-white">
          Select project lead
        </h3>
        <p className="mt-1 text-sm leading-5 text-slate-300">
          Choose an active employee or intern to lead this project.
        </p>
      </div>

      {/* Selected lead */}
      {currentSelectedUser && (
        <div className="min-w-0 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-3 sm:p-4">
          <p className="mb-3 text-xs font-semibold text-indigo-200">
            Selected lead
          </p>

          <UserTile
            user={currentSelectedUser}
            selected
            selectable={false}
            showRole
            showStatus
          />

          {!disabled && (
            <button
              type="button"
              onClick={() => onChange?.('', null)}
              className="mt-3 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 motion-reduce:transition-none"
            >
              Remove selection
            </button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="min-w-0">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by name, user ID, or role..."
          disabled={disabled}
        />
      </div>

      {/* Results summary */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-300">
          {filteredUsers.length}{' '}
          {filteredUsers.length === 1 ? 'user' : 'users'} available
        </p>

        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            disabled={disabled}
            className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            Clear search
          </button>
        )}
      </div>

      {/* User results */}
      {filteredUsers.length > 0 ? (
        <div
          className="grid max-h-96 min-w-0 grid-cols-1 items-start gap-3 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2"
          role="radiogroup"
          aria-label="Available project leads"
        >
          {filteredUsers.map((user) => {
            const id = getUserId(user);
            const isSelected = String(id) === String(selectedId);

            return (
              <div
                key={id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={disabled ? -1 : 0}
                onClick={() => handleSelect(user)}
                onKeyDown={(event) => {
                  if (
                    !disabled &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault();
                    handleSelect(user);
                  }
                }}
                className={`min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                }`}
              >
                <UserTile
                  user={user}
                  selected={isSelected}
                  selectable
                  disabled={disabled}
                  showRole
                  showStatus
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m20 20-4-4"
              />
            </svg>
          </div>

          <p className="mt-3 text-sm font-semibold text-white">
            No eligible users found
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-slate-300">
            Try another search or check that active employees and interns are
            available.
          </p>
        </div>
      )}
    </section>
  );
}