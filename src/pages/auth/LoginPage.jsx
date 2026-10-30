import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoginForm from '../../components/auth/LoginForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PuvimaLogo from '../../assets/puvima-logo.svg';

export default function LoginPage() {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const getDashboardPath = (role) => {
    switch (String(role || '').trim().toLowerCase()) {
      case 'admin':
        return '/admin';
      case 'hr':
        return '/hr';
      case 'employee':
        return '/employee';
      case 'intern':
        return '/intern';
      default:
        return '/unauthorized';
    }
  };

  const handleLogin = async ({ userId, password }) => {
    setError('');
    setSubmitting(true);

    try {
      const result = await login({ userId, password });

      // AuthContext returns { success, user, error }.
      if (!result?.success || !result.user) {
        setError(
          result?.error || 'Invalid company ID/email or password.'
        );
        return;
      }

      const loggedInUser = result.user;

      if (
        loggedInUser.isActive === false ||
        loggedInUser.is_active === false
      ) {
        setError(
          'Your account has been deactivated. Please contact your administrator.'
        );
        return;
      }

      const dashboardPath = getDashboardPath(loggedInUser.role);

      if (dashboardPath === '/unauthorized') {
        setError(
          'Your account role is not recognized. Please contact your administrator.'
        );
        return;
      }

      navigate(dashboardPath, { replace: true });
    } catch (err) {
      console.error('Login failed:', err);

      const message = String(err?.message || '').toLowerCase();

      if (
        message.includes('invalid login credentials') ||
        message.includes('invalid credentials') ||
        message.includes('user not found') ||
        message.includes('invalid company id')
      ) {
        setError('Invalid company ID/email or password.');
      } else if (
        message.includes('deactivated') ||
        message.includes('inactive')
      ) {
        setError(
          'Your account has been deactivated. Please contact your administrator.'
        );
      } else {
        setError(
          err?.message ||
            'Something went wrong while signing in. Please try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-950">
        <LoadingSpinner size="lg" label="Checking your session..." />
      </div>
    );
  }

  if (user) {
    const dashboardPath = getDashboardPath(user.role);

    if (dashboardPath !== '/unauthorized') {
      navigate(dashboardPath, { replace: true });
      return null;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="w-full max-w-md sm:max-w-lg lg:max-w-5xl">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="text-center lg:text-left">
            <div className="mx-auto mb-5 inline-flex items-center justify-center rounded-xl bg-white p-3 shadow-lg shadow-black/30 lg:mx-0">
              <img
                src={PuvimaLogo}
                alt="Puvima"
                className="h-14 w-auto max-w-[220px] object-contain sm:h-16 sm:max-w-[260px]"
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Company Portal
            </h1>

            <p className="mt-3 text-base text-slate-300 lg:text-lg">
              Sign in to access your workspace
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Welcome back
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Enter your company ID or email and password to continue.
              </p>
            </div>

            <LoginForm
              onSubmit={handleLogin}
              loading={submitting}
              error={error}
            />

            <div className="mt-6 border-t border-slate-700 pt-5">
              <p className="text-center text-xs leading-5 text-slate-300 sm:text-sm">
                Access is restricted to authorized company members.
                <br />
                Contact your administrator if you need assistance.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Puvima. All rights reserved.
        </p>
      </div>
    </div>
  );
}