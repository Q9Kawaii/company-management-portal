import { NavLink } from 'react-router-dom';
import puvimaLogo from '../../assets/puvima-logo.svg';

const defaultIcons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),

  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),

  projects: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M8 4v6" />
    </svg>
  ),

  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v5h5m4-1v5l3 2" />
    </svg>
  ),

  interns: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21v-2a8 8 0 0 1 16 0v2M9 13l3 3 3-3" />
    </svg>
  ),

  employees: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
    </svg>
  ),

  hr: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
    </svg>
  ),

  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 0 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 0 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 0 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" />
    </svg>
  ),
};

const roleNavigation = {
  Admin: [
    { label: 'Dashboard', to: '/admin', icon: 'dashboard', end: true },
    { label: 'Manage HR', to: '/admin/hr', icon: 'hr' },
    { label: 'Employees', to: '/admin/employees', icon: 'employees' },
    { label: 'Interns', to: '/admin/interns', icon: 'interns' },
    { label: 'Projects', to: '/admin/projects', icon: 'projects' },
  ],

  HR: [
    { label: 'Dashboard', to: '/hr', icon: 'dashboard', end: true },
    { label: 'Manage People', to: '/hr/people', icon: 'users' },
    { label: 'Manage Interns', to: '/hr/interns', icon: 'interns' },
    { label: 'Projects', to: '/hr/projects', icon: 'projects' },
  ],

  Employee: [
    { label: 'Dashboard', to: '/employee', icon: 'dashboard', end: true },
    { label: 'Current Project', to: '/employee/current-project', icon: 'projects' },
    { label: 'Past Projects', to: '/employee/past-projects', icon: 'history' },
  ],

  Intern: [
    { label: 'Dashboard', to: '/intern', icon: 'dashboard', end: true },
    { label: 'Current Project', to: '/intern/current-project', icon: 'projects' },
    { label: 'Past Projects', to: '/intern/past-projects', icon: 'history' },
  ],
};

function getRoleNavigation(role) {
  const normalizedRole = String(role || '')
    .toLowerCase()
    .replace(/[_\s-]/g, '');

  const roleMap = {
    admin: 'Admin',
    hr: 'HR',
    employee: 'Employee',
    intern: 'Intern',
  };

  return roleNavigation[roleMap[normalizedRole]] || [];
}

export default function Sidebar({
  user,
  role,
  isOpen = true,
  onClose,
  onLogout,
  className = '',
}) {
  const userRole = role || user?.role;
  const navigation = getRoleNavigation(userRole);

  const displayName =
    user?.fullName || user?.name || user?.userId || 'User';

  const userId = user?.userId || user?.user_id || '';

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  return (
    <>
      {/* Mobile overlay with enhanced blur */}
      {isOpen && onClose && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md transition-opacity lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-white/[0.08] bg-[#050814] shadow-2xl shadow-black/50 transition-transform duration-300 ease-out motion-reduce:transition-none lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${className}`}
      >
        {/* Ambient background glow */}
        <div className="absolute top-0 left-0 -z-10 h-72 w-full bg-gradient-to-b from-indigo-900/10 via-purple-900/5 to-transparent blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="flex h-18 shrink-0 items-center gap-3.5 border-b border-white/[0.08] px-4 sm:h-20 sm:px-5">
          <div className="flex items-center justify-center rounded-xl bg-white p-2 shadow-md shadow-black/20 ring-1 ring-white/20 transition-transform hover:scale-[1.02]">
            <img
              src={puvimaLogo}
              alt="Puvima Consultancy"
              className="block h-6 w-auto max-w-[110px] object-contain sm:h-7 sm:max-w-[130px]"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="mt-0.5 truncate text-[11px] font-medium text-indigo-300/80 sm:text-xs">
              Management System
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sidebar"
              className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 lg:hidden"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pt-6 sm:px-4 custom-scrollbar">
          <p className="px-3 pb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Workspace
          </p>

          <nav aria-label="Main navigation" className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = defaultIcons[item.icon];

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group relative flex min-h-11 items-center gap-3.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium !transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                      isActive
                        ? 'border border-indigo-500/30 bg-gradient-to-r from-indigo-500/20 to-purple-500/10 !text-white shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-400/20'
                        : 'border border-transparent !text-slate-200 hover:border-white/[0.06] hover:bg-white/[0.04] hover:!text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-2.5 left-0 w-1 rounded-r-full bg-gradient-to-b from-indigo-400 to-purple-400 shadow-sm shadow-indigo-400"
                        />
                      )}

                      <span
                        aria-hidden="true"
                        className={`h-5 w-5 shrink-0 transition-colors [&>svg]:h-full [&>svg]:w-full ${
                          isActive
                            ? '!text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]'
                            : '!text-slate-400 group-hover:!text-slate-200'
                        }`}
                      >
                        {Icon}
                      </span>

                      <span
                        className={`truncate tracking-wide ${
                          isActive ? '!text-white' : '!text-slate-200'
                        }`}
                      >
                        {item.label}
                      </span>

                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="ml-auto h-2 w-2 shrink-0 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User profile and logout */}
        <div className="shrink-0 border-t border-white/[0.08] bg-[#03050c]/80 backdrop-blur-xl p-3.5 sm:p-4">
          <div className="mb-3 flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3 shadow-inner shadow-white/[0.02]">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-sm font-bold text-indigo-200 shadow-sm">
              {initials || 'U'}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-wide text-white">
                {displayName}
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-400 font-medium">
                {userId || userRole || 'Portal user'}
              </p>

              {userRole && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-md border border-indigo-400/20 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-200 shadow-sm">
                  {userRole}
                </span>
              )}
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="group flex min-h-11 w-full items-center gap-3.5 rounded-2xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors group-hover:text-red-300">
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
                    d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"
                  />
                </svg>
              </span>

              <span className="font-medium tracking-wide">Sign out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}