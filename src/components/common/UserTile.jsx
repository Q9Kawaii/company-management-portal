export default function UserTile({
  user,
  selected = false,
  onSelect,
  selectable = true,
  disabled = false,
  showRole = true,
  showStatus = true,
  className = '',
}) {
  if (!user) return null;

  const userId = user.userId || user.user_id || user.id || '';
  const name =
    user.name ||
    'Unknown User';

  const role = user.role || user.userRole || '';
  const isActive = user.isActive ?? user.is_active ?? true;

  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  const handleClick = () => {
    if (!disabled && selectable) {
      onSelect?.(user);
    }
  };

  const handleKeyDown = (event) => {
    if (
      selectable &&
      !disabled &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      onSelect?.(user);
    }
  };

  return (
    <div
      role={selectable ? 'checkbox' : undefined}
      aria-checked={selectable ? selected : undefined}
      aria-disabled={selectable ? disabled : undefined}
      tabIndex={selectable && !disabled ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`flex min-h-[4.5rem] items-center gap-3 rounded-xl border p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 sm:p-4 ${
        selected
          ? 'border-indigo-400 bg-indigo-500/15 ring-2 ring-indigo-500/20'
          : 'border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-800'
      } ${
        selectable && !disabled
          ? 'cursor-pointer'
          : selectable && disabled
            ? 'cursor-not-allowed opacity-60'
            : ''
      } ${className}`}
    >
      <div className="relative shrink-0">
        {user.avatarUrl || user.avatar_url || user.avatar ? (
          <img
            src={user.avatarUrl || user.avatar_url || user.avatar}
            alt={`${name}'s avatar`}
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-indigo-400/40 bg-indigo-500/20 text-sm font-semibold text-indigo-100">
            {initials || 'U'}
          </div>
        )}

        {showStatus && (
          <span
            title={isActive ? 'Active' : 'Inactive'}
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 ${
              isActive ? 'bg-emerald-400' : 'bg-slate-500'
            }`}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {name}
        </p>

        {userId && (
          <p className="mt-0.5 truncate text-xs text-slate-300">
            {userId}
          </p>
        )}

        {showRole && role && (
          <span className="mt-1.5 inline-flex rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs font-medium capitalize text-slate-200">
            {role}
          </span>
        )}
      </div>

      {selectable && (
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
            selected
              ? 'border-indigo-400 bg-indigo-500 text-white'
              : 'border-slate-500 bg-slate-950'
          }`}
          aria-hidden="true"
        >
          {selected && (
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m5 12 4 4L19 6"
              />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}