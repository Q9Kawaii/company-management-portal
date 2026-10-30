import { useMemo, useState } from 'react';
import SearchBar from '../common/SearchBar';
import UserTile from '../common/UserTile';

export default function TeamMemberSelector({
  users = [],
  selectedIds = [],
  onChange,
  excludeIds = [],
  excludeLead = true,
  leadId = '',
  allowedRoles = ['Employee', 'Intern'],
  disabled = false,
  title = 'Select team members',
  description = 'Choose the employees and interns assigned to this project.',
  className = '',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRole, setActiveRole] = useState('All');

  const getUserId = (user) =>
    user.id || user.profileId || '';

  const getUserName = (user) =>
    user.fullName || user.name || 'Unknown User';

  const normalizeRole = (role) => String(role || '').toLowerCase();

  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  const normalizedExcludedIds = excludeIds.map(String);

  const eligibleUsers = useMemo(
    () =>
      users.filter((user) => {
        const id = String(getUserId(user));
        const role = normalizeRole(user.role);
        const isActive = user.isActive ?? user.is_active ?? true;

        if (!id || isActive === false || user.deactivated_at != null) {
          return false;
        }

        if (!normalizedAllowedRoles.includes(role)) {
          return false;
        }

        if (normalizedExcludedIds.includes(id)) {
          return false;
        }

        if (excludeLead && leadId && id === String(leadId)) {
          return false;
        }

        return true;
      }),
    [users, allowedRoles, excludeIds, excludeLead, leadId]
  );

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return eligibleUsers.filter((user) => {
      const id = String(getUserId(user));
      const name = getUserName(user);
      const role = String(user.role || '');

      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        id.toLowerCase().includes(query) ||
        role.toLowerCase().includes(query);

      const matchesRole =
        activeRole === 'All' ||
        role.toLowerCase() === activeRole.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [eligibleUsers, searchTerm, activeRole]);

  const selectedIdSet = new Set((selectedIds || []).map(String));

  const selectedUsers = eligibleUsers.filter((user) =>
    selectedIdSet.has(String(getUserId(user)))
  );

  const availableRoles = [
    'All',
    ...new Set(
      eligibleUsers
        .map((user) => user.role)
        .filter(Boolean)
        .map((role) => role.charAt(0).toUpperCase() + role.slice(1).toLowerCase())
    ),
  ];

  const handleToggle = (user) => {
    if (disabled) return;

    const id = String(getUserId(user));

    const nextSelectedIds = selectedIdSet.has(id)
      ? selectedIds.filter((selectedId) => String(selectedId) !== id)
      : [...selectedIds, getUserId(user)];

    onChange?.(nextSelectedIds);
  };

  const handleClearSelection = () => {
    if (!disabled) {
      onChange?.([]);
    }
  };

  return (
    <section className={`min-w-0 space-y-5 ${className}`}>
      {/* Heading */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold text-white">
            {title}
          </h3>
          <p className="mt-1 break-words text-sm leading-5 text-slate-300">
            {description}
          </p>
        </div>

        <span className="inline-flex min-h-8 w-fit shrink-0 items-center rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1.5 text-sm font-semibold text-indigo-200">
          {selectedIdSet.size} selected
        </span>
      </div>

      {/* Selected team members */}
      {selectedUsers.length > 0 && (
        <div className="min-w-0 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-indigo-200">
              Selected team members
            </h4>

            <button
              type="button"
              onClick={handleClearSelection}
              disabled={disabled}
              className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              Clear all
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => {
              const id = getUserId(user);

              return (
                <span
                  key={id}
                  className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-indigo-400/30 bg-slate-900 py-1.5 pl-3 pr-2 text-sm text-slate-200"
                >
                  <span className="max-w-44 truncate">
                    {getUserName(user)}
                  </span>

                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleToggle(user)}
                      aria-label={`Remove ${getUserName(user)}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 motion-reduce:transition-none"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m6 6 12 12M18 6 6 18"
                        />
                      </svg>
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="min-w-0">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by name or user ID..."
          disabled={disabled}
        />
      </div>

      {/* Role filters */}
      {availableRoles.length > 2 && (
        <div
          className="flex flex-wrap gap-2"
          aria-label="Filter by role"
        >
          {availableRoles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              disabled={disabled}
              aria-pressed={activeRole === role}
              className={`inline-flex min-h-9 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${
                activeRole === role
                  ? 'border-indigo-400/40 bg-indigo-500/20 text-indigo-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      )}

      {/* Results summary */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-300">
          Showing {filteredUsers.length} of {eligibleUsers.length} available
          users
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
        <div className="grid max-h-[28rem] min-w-0 grid-cols-1 items-start gap-3 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2">
          {filteredUsers.map((user) => {
            const id = getUserId(user);
            const isSelected = selectedIdSet.has(String(id));

            return (
              <UserTile
                key={id}
                user={user}
                selected={isSelected}
                selectable
                disabled={disabled}
                showRole
                showStatus
                onSelect={handleToggle}
              />
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
            No users found
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-300">
            Try changing your search or role filter.
          </p>
        </div>
      )}

      <p className="break-words text-xs leading-5 text-slate-400">
        The project lead is excluded from the member list when
        <code className="mx-1 rounded bg-slate-800 px-1 py-0.5 text-slate-300">
          excludeLead
        </code>
        is enabled.
      </p>
    </section>
  );
}