import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="relative mx-auto mb-8 flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-2xl" />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl">
            <span className="text-4xl font-black tracking-tight text-indigo-400">
              404
            </span>
          </div>
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-300">
          Page not found
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Lost in the workspace?
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400 sm:text-base">
          The page you're looking for doesn't exist, may have been moved, or
          you may have followed an incorrect link.
        </p>

        <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-700/70 bg-slate-900 px-4 py-3 text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Requested path
          </p>
          <p className="mt-1 break-all font-mono text-sm text-slate-300">
            {location.pathname}
          </p>
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <span aria-hidden="true">⌂</span>
            Go Home
          </Link>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            <span aria-hidden="true">←</span>
            Go Back
          </button>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-6">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-black text-white">
              CP
            </div>
            <span className="text-sm font-semibold text-slate-300">
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