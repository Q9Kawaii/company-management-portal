import { Link } from 'react-router-dom';
import puvimaLogo from '../../assets/puvima-logo.svg';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/[0.08] bg-[#080d1a]">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
        {/* Branding */}
        <div className="flex items-center gap-3">
          {/* <div className="flex h-9 items-center justify-center rounded-lg bg-white px-2 py-1">
            <img
              src={puvimaLogo}
              alt="Puvima Consultancy"
              className="h-6 w-auto max-w-[100px] object-contain"
            />
          </div> */}

          <div>
            <p className="text-sm font-semibold text-slate-200">
              Company Portal
            </p>
            <p className="text-xs text-slate-500">
              Management System
            </p>
          </div>
        </div>

        {/* Copyright and links */}
        <div className="flex flex-col items-center gap-3 text-xs text-slate-400 sm:flex-row sm:gap-5">
          <p className="text-center">
            © {currentYear} Puvima Consultancy. All rights reserved.
          </p>

          <span className="hidden h-4 w-px bg-slate-700 sm:block" />

          <Link
            to="/about"
            className="rounded-md font-medium text-slate-300 transition hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            About Us
          </Link>
        </div>
      </div>
    </footer>
  );
}