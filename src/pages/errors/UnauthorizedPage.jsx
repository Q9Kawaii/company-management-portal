import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'Admin':
        return '/admin';
      case 'HR':
        return '/hr';
      case 'Employee':
        return '/employee';
      case 'Intern':
        return '/intern';
      default:
        return '/login';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg text-center">
        <div className="relative mx-auto mb-8 flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-red-500/10 blur-2xl motion-reduce:blur-none" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-red-400/30 bg-slate-900 shadow-2xl shadow-black/20">
            <svg
              className="h-12 w-12 text-red-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.3 3.9 1.9 18.4A1.8 1.8 0 0 0 3.5 21h17a1.8 1.8 0 0 0 1.6-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z"
              />
            </svg>
          </div>
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-300">
          Access denied
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          You can't access this page
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-300 sm:text-base">
          You don't have the required permissions to view this page. If you
          believe this is a mistake, contact your administrator.
        </p>

        {user && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-700/70 bg-slate-900 p-4 text-left sm:p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Signed in as
            </p>

            <p className="mt-2 break-words text-sm font-semibold text-white">
              {user.name || user.userId || user.email}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex min-h-7 items-center rounded-full border border-indigo-400/30 bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-200">
                {user.role || 'Unknown role'}
              </span>
              {user.userId && (
                <span className="break-all text-xs text-slate-400">
                  {user.userId}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {user && (
            <Link
              to={getDashboardPath()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
            >
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z"
                />
              </svg>
              Return to Dashboard
            </Link>
          )}

          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
            >
              Sign Out
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 motion-reduce:transition-none"
            >
              Go to Login
            </Link>
          )}
        </div>

        <div className="mt-12 border-t border-slate-800 pt-6">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white">
              CP
            </div>
            <span className="text-sm font-semibold text-slate-200">
              Company Portal
            </span>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            © {new Date().getFullYear()} Company Portal. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}