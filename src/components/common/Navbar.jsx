import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import puvimaLogo from '../../assets/puvima-logo.svg';

export default function Navbar({
  user,
  onLogout,
  title = 'Workspace',
  onMenuClick,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const displayName = user?.name || user?.userId || 'User';

  const role = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
    : 'Member';

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('') || 'U';

  const handleLogout = async () => {
    setProfileOpen(false);
    await onLogout?.();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#080d1a]/95 shadow-lg shadow-black/10 backdrop-blur-2xl">
      <div className="flex h-16 items-center justify-between gap-2 px-3 sm:h-[72px] sm:gap-4 sm:px-5 lg:px-7">
        {/* Left: Mobile menu, logo and page title */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-4">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Toggle sidebar"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-300 transition duration-200 hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>


          <div className="hidden h-8 w-px bg-gradient-to-b from-transparent via-slate-600/70 to-transparent sm:block" />

          <div className="min-w-0">
            <h1 className="truncate text-xs font-semibold tracking-wide text-slate-200 sm:text-sm">
              {title}
            </h1>
            <p className="mt-0.5 hidden text-[10px] tracking-wide text-slate-500 sm:block">
              Company Workspace
            </p>
          </div>
        </div>

        {/* Right: User information and profile menu */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="max-w-36 truncate text-sm font-semibold text-slate-100 lg:max-w-48">
              {displayName}
            </p>

            <div className="mt-1 flex items-center justify-end gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/40" />
              <p className="text-[11px] font-medium text-slate-400">
                {role}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              aria-label="Open user menu"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className={`group flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-bold tracking-wide transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 sm:h-11 sm:w-11 ${
                profileOpen
                  ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-200 shadow-lg shadow-indigo-950/30'
                  : 'border-indigo-400/25 bg-gradient-to-br from-indigo-500/20 to-violet-500/10 text-indigo-200 hover:border-indigo-400/50 hover:from-indigo-500/30 hover:to-violet-500/20'
              }`}
            >
              {initials}
            </button>

            {profileOpen && (
              <>
                {/* Click outside to close */}
                <button
                  type="button"
                  aria-label="Close user menu"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setProfileOpen(false)}
                />

                {/* Profile dropdown */}
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+12px)] z-50 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1425] shadow-2xl shadow-black/50"
                >
                  {/* Decorative top accent */}
                  <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400" />

                  {/* Profile information */}
                  <div className="border-b border-white/[0.07] bg-gradient-to-br from-indigo-500/[0.08] to-transparent p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/15 text-sm font-bold text-indigo-200 shadow-inner shadow-indigo-500/10">
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {displayName}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Signed in to Company Portal
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/15 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-200">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 3l7 4v5c0 4.5-3 7-7 9-4-2-7-4.5-7-9V7l7-4Z"
                          />
                        </svg>
                        {role}
                      </span>

                      {user?.userId && (
                        <span className="max-w-full truncate rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-xs text-slate-400">
                          ID: {user.userId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-2">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition duration-200 hover:bg-red-500/[0.09] hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-400/10 bg-red-500/[0.08] text-red-400 transition group-hover:border-red-400/20 group-hover:bg-red-500/[0.14]">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="h-4 w-4"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12H3m0 0 4-4m-4 4 4 4M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"
                          />
                        </svg>
                      </span>

                      <span className="flex-1">Sign out</span>

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-red-300"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m9 18 6-6-6-6"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}