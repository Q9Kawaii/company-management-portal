import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  normalizeRole,
  isActiveUser,
} from '../../utils/permissions';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (!isActiveUser(user)) {
    return <Navigate to="/login" replace />;
  }

  const userRole = normalizeRole(user.role);
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  if (
    normalizedAllowedRoles.length > 0 &&
    !normalizedAllowedRoles.includes(userRole)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}