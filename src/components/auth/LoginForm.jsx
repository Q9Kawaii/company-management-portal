import { useState } from 'react';

const inputClass =
  'peer w-full rounded-xl border border-slate-800 bg-slate-950/70 py-3.5 pl-11 text-base text-slate-100 outline-none transition placeholder:text-slate-600 hover:border-slate-700 focus:border-indigo-500 focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm';

const iconClass =
  'pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition peer-focus:text-indigo-400';

export default function LoginForm({ onSubmit, loading = false, error = '' }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!userId.trim() || !password) {
      return;
    }

    onSubmit?.({
      userId: userId.trim(),
      password,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="grid gap-5">
        <div>
          <label
            htmlFor="userId"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Company ID or Email
          </label>

          <div className="relative">
            <input
              id="userId"
              name="userId"
              type="text"
              autoComplete="username"
              placeholder="ADM0001 or you@example.com"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              required
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
              className={`${inputClass} pr-4`}
            />
            <svg
              className={iconClass}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"
              />
            </svg>
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Password
          </label>

          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
              className={`${inputClass} pr-12`}
            />
            <svg
              className={iconClass}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 11V8a4 4 0 0 1 8 0v3"
              />
            </svg>

            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              disabled={loading}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute inset-y-1.5 right-1.5 flex w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
            >
              {showPassword ? (
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
                    d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 8.5 4.2 9.5 6-.4.8-1.3 2.1-2.6 3.3M6.7 7.7C4.6 9.1 3.3 11 2.5 12c1 1.8 4.5 6 9.5 6 1.5 0 2.800-.3 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"
                  />
                </svg>
              ) : (
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
                    d="M2.5 12C3.5 10.2 7 6 12 6s8.5 4.2 9.5 6c-1 1.8-4.5 6-9.5 6s-8.5-4.2-9.5-6Z"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div
          id="login-error"
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-300"
        >
          <svg
            className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 7.5v5M12 16h.01" />
          </svg>
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !userId.trim() || !password}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-950/60 transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none sm:text-sm"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </button>

      <p className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-center text-xs leading-relaxed text-slate-500">
        <svg
          className="h-4 w-4 shrink-0 text-slate-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3 5 6v5c0 4.5 3 8.2 7 10 4-1.8 7-5.500 7-10V6l-7-3Z"
          />
        </svg>
        <span>
          Your login credentials are provided by your administrator or HR.
        </span>
      </p>
    </form>
  );
}