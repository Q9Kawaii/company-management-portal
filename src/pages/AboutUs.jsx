import { Link } from 'react-router-dom';
import puvimaLogo from '../assets/puvima-logo.svg';

export default function AboutUs() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080d1a] text-slate-100">
      {/* Hero */}
      <section className="relative border-b border-white/[0.08]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/[0.12] via-transparent to-purple-500/[0.08]" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <Link
            to="/"
            aria-label="Return to dashboard"
            className="mb-10 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
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
                d="m15 18-6-6 6-6M9 12h12"
              />
            </svg>
            Back to portal
          </Link>

          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-200">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              ABOUT US
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              A smarter way to
              <span className="block bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-300 bg-clip-text text-transparent">
                work together.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
              The Company Portal brings people, projects, and everyday
              workflows together in one organized workspace.
            </p>
          </div>
        </div>
      </section>

      {/* Company introduction */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-3 lg:px-8">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8 lg:col-span-2">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
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
                d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 21v-4h4v4"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-white sm:text-2xl">
            About Puvima Consultancy
          </h2>

          <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">
            This portal is designed to provide a centralized workspace for
            company administration, team management, and project coordination.
            It gives authorized users access to the tools and information
            relevant to their responsibilities.
          </p>

          <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">
            By bringing important workflows into one place, the portal aims
            to make everyday coordination clearer, more organized, and easier
            to manage.
          </p>
        </div>

        {/* Brand card */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-indigo-500/[0.12] to-purple-500/[0.06] p-7 text-center">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative rounded-2xl bg-white p-4 shadow-xl shadow-black/20">
            <img
              src={puvimaLogo}
              alt="Puvima Consultancy"
              className="h-auto w-full max-w-[180px] object-contain"
            />
          </div>

          <h3 className="mt-6 text-lg font-bold text-white">
            Company Portal
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            One workspace. Connected teams. Organized projects.
          </p>
        </div>
      </section>

      {/* Portal features */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
            The platform
          </p>

          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            Everything organized in one place
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Purpose-built areas help different team members manage their
            responsibilities through a shared platform.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <article className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 transition duration-200 hover:-translate-y-1 hover:border-indigo-400/25 hover:bg-indigo-500/[0.04]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
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
                  d="M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m9 12 2 2 4-4"
                />
              </svg>
            </div>

            <h3 className="mt-5 text-base font-semibold text-white">
              Role-based access
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Separate workspaces help administrators, HR personnel,
              employees, and interns access the features relevant to their
              roles.
            </p>
          </article>

          {/* Feature 2 */}
          <article className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 transition duration-200 hover:-translate-y-1 hover:border-indigo-400/25 hover:bg-indigo-500/[0.04]">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 10h18M8 4v6"
                />
              </svg>
            </div>

            <h3 className="mt-5 text-base font-semibold text-white">
              Project coordination
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Project-related pages provide a shared place to view assignments
              and follow project information.
            </p>
          </article>

          {/* Feature 3 */}
          <article className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 transition duration-200 hover:-translate-y-1 hover:border-indigo-400/25 hover:bg-indigo-500/[0.04] sm:col-span-2 lg:col-span-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 7v5l3 2"
                />
              </svg>
            </div>

            <h3 className="mt-5 text-base font-semibold text-white">
              Clear workflows
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              A centralized interface helps users navigate their work and
              keep important project information organized.
            </p>
          </article>
        </div>
      </section>

      {/* Closing section */}
      <section className="border-t border-white/[0.08] bg-gradient-to-r from-indigo-500/[0.07] via-transparent to-purple-500/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Welcome to your workspace.
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Return to the portal to continue with your work.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080d1a]"
          >
            Return to portal

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
                d="M5 12h14m-6-6 6 6-6 6"
              />
            </svg>
          </Link>
        </div>
      </section>
    </main>
  );
}
